#include <android/log.h>
#include <fcntl.h>
#include <jni.h>
#include <signal.h>
#include <unistd.h>

#include <atomic>
#include <chrono>
#include <cstring>
#include <cstdint>
#include <exception>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

#include "llama.h"

namespace {

struct ModelState {
  llama_model * model = nullptr;
  llama_context * ctx = nullptr;
  llama_sampler * sampler = nullptr;
  std::atomic<bool> cancelled{false};

  // Libera el modelo, el contexto y el sampler: antes no se liberaba nada y cada mensaje dejaba el modelo en RAM.
  ~ModelState() {
    if (sampler != nullptr) llama_sampler_free(sampler);
    if (ctx != nullptr) llama_free(ctx);
    if (model != nullptr) llama_model_free(model);
  }
};

std::mutex g_mutex;
std::unordered_map<jlong, std::shared_ptr<ModelState>> g_models;
std::atomic<jlong> g_nextHandle{1};
std::once_flag g_backendFlag;

// --- Rastro de diagnóstico (sobrevive a un cierre inesperado) ---------------------------------
// Cada paso se escribe con write() en un archivo de la app; si el proceso muere, la última línea dice dónde.
// No contiene prompts ni respuestas (S9): solo etapas, tamaños y tiempos.
int g_crumbFd = -1;
const auto g_processStart = std::chrono::steady_clock::now();

void crumb(const std::string & msg) {
  const auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - g_processStart).count();
  __android_log_print(ANDROID_LOG_INFO, "PyroHornsLlama", "%s", msg.c_str());
  if (g_crumbFd < 0) return;
  const std::string line = std::to_string(ms) + "ms " + msg + "\n";
  const ssize_t ignored = write(g_crumbFd, line.c_str(), line.size());
  (void) ignored;
}

struct sigaction g_oldActions[4];
const int g_fatalSignals[4] = {SIGSEGV, SIGABRT, SIGILL, SIGBUS};

int signalSlot(int sig) {
  for (int i = 0; i < 4; ++i) {
    if (g_fatalSignals[i] == sig) return i;
  }
  return -1;
}

// Solo funciones seguras en señales: write y sigaction. Después devuelve el control al manejador anterior
// (el de Android), que genera el tombstone como siempre.
void onFatalSignal(int sig, siginfo_t * info, void *) {
  char buf[96];
  int n = 0;
  const char * head = "SIGNAL ";
  for (const char * c = head; *c != 0; ++c) buf[n++] = *c;
  char digits[24];
  int d = 0;
  int v = sig;
  do {
    digits[d++] = static_cast<char>('0' + v % 10);
    v /= 10;
  } while (v > 0);
  while (d > 0) buf[n++] = digits[--d];
  const char * mid = " addr=0x";
  for (const char * c = mid; *c != 0; ++c) buf[n++] = *c;
  uintptr_t addr = info != nullptr ? reinterpret_cast<uintptr_t>(info->si_addr) : 0;
  char hex[24];
  int h = 0;
  do {
    const int digit = static_cast<int>(addr & 0xF);
    hex[h++] = static_cast<char>(digit < 10 ? '0' + digit : 'a' + digit - 10);
    addr >>= 4;
  } while (addr > 0);
  while (h > 0) buf[n++] = hex[--h];
  buf[n++] = '\n';
  if (g_crumbFd >= 0) {
    const ssize_t ignored = write(g_crumbFd, buf, static_cast<size_t>(n));
    (void) ignored;
  }
  const int slot = signalSlot(sig);
  if (slot >= 0) sigaction(sig, &g_oldActions[slot], nullptr);
}

void installCrashHandler() {
  for (int i = 0; i < 4; ++i) {
    struct sigaction action;
    memset(&action, 0, sizeof(action));
    action.sa_sigaction = onFatalSignal;
    action.sa_flags = SA_SIGINFO;
    sigemptyset(&action.sa_mask);
    sigaction(g_fatalSignals[i], &action, &g_oldActions[i]);
  }
}

// El método se busca una vez en la interfaz (no en la clase anónima, que R8 puede renombrar) y se reutiliza.
jmethodID g_emitMethod = nullptr;

void emit(JNIEnv * env, jobject sink, const char * type, const std::string & text, const std::string & usage) {
  if (g_emitMethod == nullptr) {
    jclass iface = env->FindClass("expo/modules/pyrohornsllama/LlamaEventSink");
    if (iface == nullptr) {
      env->ExceptionClear();
      crumb("emit: no se encontró la interfaz LlamaEventSink");
      return;
    }
    g_emitMethod = env->GetMethodID(iface, "emit", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V");
    env->DeleteLocalRef(iface);
    if (g_emitMethod == nullptr) {
      env->ExceptionClear();  // si no se limpia, la excepción pendiente aborta la app en la siguiente llamada JNI
      crumb("emit: no se encontró LlamaEventSink.emit");
      return;
    }
  }
  jstring jType = env->NewStringUTF(type);
  jstring jText = env->NewStringUTF(text.c_str());
  jstring jUsage = env->NewStringUTF(usage.c_str());
  env->CallVoidMethod(sink, g_emitMethod, jType, jText, jUsage);
  if (env->ExceptionCheck()) {  // una excepción de Java pendiente haría fallar las siguientes llamadas JNI
    env->ExceptionClear();
    crumb("emit: la app lanzó una excepción al recibir el evento");
  }
  env->DeleteLocalRef(jUsage);
  env->DeleteLocalRef(jText);
  env->DeleteLocalRef(jType);
}

// Longitud del prefijo de `s` que termina en un carácter UTF-8 completo: un token puede cortar un carácter
// de varios bytes y NewStringUTF no admite secuencias a medias.
size_t completeUtf8Prefix(const std::string & s) {
  size_t i = s.size();
  for (int back = 0; i > 0 && back < 4; ++back) {
    const unsigned char c = static_cast<unsigned char>(s[i - 1]);
    if ((c & 0xC0) == 0x80) {  // byte de continuación: seguir hacia atrás hasta el inicial
      --i;
      continue;
    }
    size_t need = 1;
    if ((c >> 5) == 0x6) need = 2;
    else if ((c >> 4) == 0xE) need = 3;
    else if ((c >> 3) == 0x1E) need = 4;
    const size_t have = s.size() - (i - 1);
    return have >= need ? s.size() : i - 1;
  }
  return s.size();
}

// shared_ptr: si se descarga mientras se genera, el modelo vive hasta que termine la generación.
std::shared_ptr<ModelState> getModel(jlong handle) {
  std::lock_guard<std::mutex> lock(g_mutex);
  auto it = g_models.find(handle);
  return it == g_models.end() ? nullptr : it->second;
}

std::string formatPrompt(const llama_model * model, const std::string & text) {
  const char * tmpl = llama_model_chat_template(model, nullptr);
  if (tmpl == nullptr) return text;
  llama_chat_message msg{"user", text.c_str()};
  int32_t size = static_cast<int32_t>(text.size() * 2 + 512);
  std::vector<char> buf(static_cast<size_t>(size));
  int32_t n = llama_chat_apply_template(tmpl, &msg, 1, true, buf.data(), size);
  if (n < 0) return text;
  if (n > size) {
    buf.resize(static_cast<size_t>(n));
    n = llama_chat_apply_template(tmpl, &msg, 1, true, buf.data(), n);
    if (n < 0 || n > static_cast<int32_t>(buf.size())) return text;
  }
  return std::string(buf.data(), static_cast<size_t>(n));
}

void batchSetTokens(llama_batch_ext * batch, const llama_token * tokens, int32_t n, llama_pos pos0) {
  llama_batch_ext_clear(batch);
  for (int32_t i = 0; i < n; ++i) {
    int32_t idx = llama_batch_ext_add_token(batch, 0, tokens[i]);
    llama_pos pos = pos0 + i;
    llama_batch_ext_set_pos(batch, idx, &pos);
  }
  llama_batch_ext_set_output_logits(batch, n - 1, true);
}

std::string usageJson(int64_t ttftUs, int64_t totalUs, int promptTokens, int completionTokens) {
  // Velocidad de generación: los tokens posteriores al primero entre el tiempo posterior al primer token (sin el prefill).
  const double seconds = static_cast<double>(totalUs - ttftUs) / 1000000.0;
  const double rate = (seconds > 0.0 && completionTokens > 1) ? static_cast<double>(completionTokens - 1) / seconds : 0.0;
  return "{\"promptTokens\":" + std::to_string(promptTokens) +
         ",\"completionTokens\":" + std::to_string(completionTokens) +
         ",\"ttftMs\":" + std::to_string(ttftUs / 1000) +
         ",\"tokPerSec\":" + std::to_string(rate) + "}";
}

}  // namespace

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_initBackend(JNIEnv * env, jobject, jstring jCrumbPath) {
  std::call_once(g_backendFlag, [env, jCrumbPath] {
    const char * path = env->GetStringUTFChars(jCrumbPath, nullptr);
    g_crumbFd = open(path, O_WRONLY | O_CREAT | O_TRUNC | O_APPEND, 0600);
    env->ReleaseStringUTFChars(jCrumbPath, path);
    installCrashHandler();
    crumb("start");
    llama_backend_init();
    crumb("backend ok");
  });
}

extern "C" JNIEXPORT jlong JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_loadModel(
    JNIEnv * env, jobject, jstring jPath, jint contextTokens, jint, jboolean useMmap) {
  const char * pathChars = env->GetStringUTFChars(jPath, nullptr);
  const std::string path(pathChars);
  env->ReleaseStringUTFChars(jPath, pathChars);

  try {
    crumb("load: abrir modelo (n_ctx=" + std::to_string(contextTokens) + (useMmap == JNI_TRUE ? ", mmap)" : ", sin mmap)"));
    auto state = std::make_shared<ModelState>();

    llama_model_params modelParams = llama_model_default_params();
    modelParams.n_gpu_layers = 0;
    // P13: comparar leer el GGUF con y sin mmap. (AUTO, el valor por defecto, equivale a mmap en CPU.)
    modelParams.load_mode = (useMmap == JNI_TRUE) ? LLAMA_LOAD_MODE_MMAP : LLAMA_LOAD_MODE_NONE;
    state->model = llama_model_load_from_file(path.c_str(), modelParams);
    if (state->model == nullptr) {
      crumb("load: el modelo no se pudo abrir");
      return 0;
    }
    crumb("load: modelo ok");

    llama_context_params ctxParams = llama_context_default_params();
    ctxParams.n_ctx = static_cast<uint32_t>(contextTokens);
    ctxParams.n_batch = static_cast<uint32_t>(contextTokens);
    ctxParams.no_perf = false;
    state->ctx = llama_init_from_model(state->model, ctxParams);
    if (state->ctx == nullptr) {
      crumb("load: no se pudo crear el contexto");
      return 0;  // el destructor libera el modelo
    }
    crumb("load: contexto ok");

    auto samplerParams = llama_sampler_chain_default_params();
    samplerParams.no_perf = false;
    state->sampler = llama_sampler_chain_init(samplerParams);
    llama_sampler_chain_add(state->sampler, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(state->sampler, llama_sampler_init_top_p(0.9f, 1));
    llama_sampler_chain_add(state->sampler, llama_sampler_init_temp(0.8f));
    llama_sampler_chain_add(state->sampler, llama_sampler_init_dist(1234));

    const jlong handle = g_nextHandle.fetch_add(1);
    {
      std::lock_guard<std::mutex> lock(g_mutex);
      g_models[handle] = std::move(state);
    }
    crumb("load: listo (handle " + std::to_string(handle) + ")");
    crumb("idle");
    return handle;
  } catch (const std::exception & e) {
    crumb(std::string("load: excepción C++: ") + e.what());
  } catch (...) {
    crumb("load: excepción C++ desconocida");
  }
  return 0;
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_generate(
    JNIEnv * env, jobject, jlong handle, jstring jPrompt, jint threads, jboolean noThink, jobject sink) {
  const std::shared_ptr<ModelState> state = getModel(handle);
  if (state == nullptr) {
    emit(env, sink, "error", "Modelo no cargado", "{}");
    return;
  }

  try {
    state->cancelled.store(false);
    llama_set_n_threads(state->ctx, threads, threads);
    // El modelo se reutiliza entre mensajes: se vacía la caché KV (las posiciones empiezan en 0) y el estado del sampler.
    llama_memory_clear(llama_get_memory(state->ctx), true);
    llama_sampler_reset(state->sampler);

    const char * promptChars = env->GetStringUTFChars(jPrompt, nullptr);
    std::string prompt = formatPrompt(state->model, promptChars);
    env->ReleaseStringUTFChars(jPrompt, promptChars);
    // Profundo apagado: se cierra un bloque de razonamiento vacío, igual que la plantilla de Qwen3 con enable_thinking=false.
    if (noThink == JNI_TRUE) prompt += "<think>\n\n</think>\n\n";
    crumb("gen: plantilla aplicada (" + std::to_string(prompt.size()) + " bytes, hilos " + std::to_string(threads) + (noThink == JNI_TRUE ? ", sin razonamiento)" : ")"));

    const llama_vocab * vocab = llama_model_get_vocab(state->model);
    int32_t nPrompt = -llama_tokenize(vocab, prompt.c_str(), static_cast<int32_t>(prompt.size()), nullptr, 0, true, true);
    if (nPrompt <= 0) {
      crumb("gen: tokenizar falló (tamaño)");
      emit(env, sink, "error", "No se pudo tokenizar el prompt", "{}");
      return;
    }
    std::vector<llama_token> tokens(static_cast<size_t>(nPrompt));
    if (llama_tokenize(vocab, prompt.c_str(), static_cast<int32_t>(prompt.size()), tokens.data(), nPrompt, true, true) < 0) {
      crumb("gen: tokenizar falló");
      emit(env, sink, "error", "No se pudo tokenizar el prompt", "{}");
      return;
    }
    crumb("gen: " + std::to_string(nPrompt) + " tokens de prompt");

    std::unique_ptr<llama_batch_ext, void (*)(llama_batch_ext *)> batch(llama_batch_ext_init(state->ctx), llama_batch_ext_free);
    batchSetTokens(batch.get(), tokens.data(), nPrompt, 0);

    const auto started = std::chrono::steady_clock::now();
    crumb("gen: evaluando el prompt");
    if (llama_process(state->ctx, LLAMA_PROCESS_TYPE_DECODE, batch.get()) != 0) {
      crumb("gen: llama_process falló con el prompt");
      emit(env, sink, "error", "Falló la evaluación del prompt", "{}");
      return;
    }
    crumb("gen: prompt evaluado en " + std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started).count()) + " ms");

    int64_t ttftUs = 0;
    int generated = 0;
    llama_pos pos = nPrompt;
    constexpr int kMaxTokens = 512;
    char piece[256];
    std::string pending;  // bytes de un carácter UTF-8 aún incompleto

    while (generated < kMaxTokens && !state->cancelled.load()) {
      const llama_token next = llama_sampler_sample(state->sampler, state->ctx, -1);
      if (llama_vocab_is_eog(vocab, next)) break;

      const int n = llama_token_to_piece(vocab, next, piece, sizeof(piece), 0, true);
      if (n > 0) {
        pending.append(piece, static_cast<size_t>(n));
        const size_t whole = completeUtf8Prefix(pending);
        if (whole > 0) {
          emit(env, sink, "token", pending.substr(0, whole), "{}");
          pending.erase(0, whole);
        }
      }
      if (generated == 0) {
        ttftUs = std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - started).count();
        crumb("gen: primer token");
      }

      llama_sampler_accept(state->sampler, next);
      generated++;
      if (generated % 64 == 0) crumb("gen: " + std::to_string(generated) + " tokens");
      batchSetTokens(batch.get(), &next, 1, pos);
      pos++;

      if (llama_process(state->ctx, LLAMA_PROCESS_TYPE_DECODE, batch.get()) != 0) {
        crumb("gen: llama_process falló generando");
        emit(env, sink, "error", "Falló la generación", "{}");
        break;
      }
    }
    if (!pending.empty()) emit(env, sink, "token", pending, "{}");

    const auto finished = std::chrono::steady_clock::now();
    const int64_t totalUs = std::chrono::duration_cast<std::chrono::microseconds>(finished - started).count();
    crumb("gen: fin (" + std::to_string(generated) + " tokens)");
    emit(env, sink, "usage", "", usageJson(ttftUs, totalUs, nPrompt, generated));
    emit(env, sink, "done", "", "{}");
    crumb("idle");
  } catch (const std::exception & e) {
    crumb(std::string("gen: excepción C++: ") + e.what());
    emit(env, sink, "error", std::string("Excepción en el motor: ") + e.what(), "{}");
  } catch (...) {
    crumb("gen: excepción C++ desconocida");
    emit(env, sink, "error", "Excepción desconocida en el motor", "{}");
  }
}

// Prueba de rendimiento (P13): prefill de `nPrompt` tokens sintéticos y generación de `nGen` tokens, medidos por separado.
// Devuelve JSON; no contiene texto del usuario ni del modelo (S9).
extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_bench(
    JNIEnv * env, jobject, jlong handle, jint nPrompt, jint nGen, jint threads) {
  const std::shared_ptr<ModelState> state = getModel(handle);
  if (state == nullptr) return env->NewStringUTF("{\"error\":\"Modelo no cargado\"}");

  try {
    if (nPrompt <= 0 || nGen <= 0 || static_cast<uint32_t>(nPrompt + nGen) > llama_n_ctx(state->ctx)) {
      return env->NewStringUTF("{\"error\":\"El prompt y la generación no caben en el contexto\"}");
    }
    state->cancelled.store(false);
    llama_set_n_threads(state->ctx, threads, threads);
    llama_memory_clear(llama_get_memory(state->ctx), true);
    llama_sampler_reset(state->sampler);

    // Texto fijo repetido hasta tener tokens de sobra; se recorta a nPrompt.
    const std::string unit = "El rápido zorro marrón salta sobre el perro perezoso mientras la lluvia cae despacio sobre la ciudad. ";
    std::string text;
    for (int i = 0; i < nPrompt / 16 + 8; ++i) text += unit;
    const llama_vocab * vocab = llama_model_get_vocab(state->model);
    const int32_t total = -llama_tokenize(vocab, text.c_str(), static_cast<int32_t>(text.size()), nullptr, 0, true, false);
    if (total < nPrompt) return env->NewStringUTF("{\"error\":\"No se pudo construir el prompt de prueba\"}");
    std::vector<llama_token> tokens(static_cast<size_t>(total));
    if (llama_tokenize(vocab, text.c_str(), static_cast<int32_t>(text.size()), tokens.data(), total, true, false) < 0) {
      return env->NewStringUTF("{\"error\":\"No se pudo tokenizar el prompt de prueba\"}");
    }

    std::unique_ptr<llama_batch_ext, void (*)(llama_batch_ext *)> batch(llama_batch_ext_init(state->ctx), llama_batch_ext_free);
    batchSetTokens(batch.get(), tokens.data(), nPrompt, 0);
    crumb("bench: prefill de " + std::to_string(nPrompt) + " tokens, " + std::to_string(threads) + " hilos");
    const auto t0 = std::chrono::steady_clock::now();
    if (llama_process(state->ctx, LLAMA_PROCESS_TYPE_DECODE, batch.get()) != 0) {
      crumb("bench: llama_process falló con el prompt");
      return env->NewStringUTF("{\"error\":\"Falló la evaluación del prompt\"}");
    }
    const auto t1 = std::chrono::steady_clock::now();
    crumb("bench: prefill listo");

    // Generación: no se corta en el fin de texto para que todas las pruebas generen los mismos tokens.
    int generated = 0;
    llama_pos pos = nPrompt;
    while (generated < nGen && !state->cancelled.load()) {
      const llama_token next = llama_sampler_sample(state->sampler, state->ctx, -1);
      llama_sampler_accept(state->sampler, next);
      batchSetTokens(batch.get(), &next, 1, pos);
      pos++;
      if (llama_process(state->ctx, LLAMA_PROCESS_TYPE_DECODE, batch.get()) != 0) {
        crumb("bench: llama_process falló generando");
        return env->NewStringUTF("{\"error\":\"Falló la generación\"}");
      }
      generated++;
    }
    const auto t2 = std::chrono::steady_clock::now();
    const double prefillMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
    const double genMs = std::chrono::duration<double, std::milli>(t2 - t1).count();
    crumb("bench: fin (" + std::to_string(generated) + " tokens)");
    crumb("idle");
    const std::string json = "{\"promptTokens\":" + std::to_string(nPrompt) + ",\"genTokens\":" + std::to_string(generated) +
                             ",\"prefillMs\":" + std::to_string(prefillMs) + ",\"genMs\":" + std::to_string(genMs) +
                             ",\"cancelled\":" + (state->cancelled.load() ? "true" : "false") + "}";
    return env->NewStringUTF(json.c_str());
  } catch (const std::exception & e) {
    crumb(std::string("bench: excepción C++: ") + e.what());
  } catch (...) {
    crumb("bench: excepción C++ desconocida");
  }
  return env->NewStringUTF("{\"error\":\"Excepción en el motor\"}");
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_cancel(JNIEnv *, jobject, jlong handle) {
  const std::shared_ptr<ModelState> state = getModel(handle);
  if (state != nullptr) state->cancelled.store(true);
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_unloadModel(JNIEnv *, jobject, jlong handle) {
  crumb("unload: liberando");
  {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_models.erase(handle);
  }
  crumb("unload: liberado");
  crumb("idle");
}
