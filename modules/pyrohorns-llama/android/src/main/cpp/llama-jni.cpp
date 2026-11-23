#include <jni.h>

#include <atomic>
#include <chrono>
#include <cstdint>
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
};

std::mutex g_mutex;
std::unordered_map<jlong, std::unique_ptr<ModelState>> g_models;
std::atomic<jlong> g_nextHandle{1};
std::once_flag g_backendFlag;

void emit(JNIEnv * env, jobject sink, const char * type, const std::string & text, const std::string & usage) {
  jclass cls = env->GetObjectClass(sink);
  if (cls == nullptr) return;
  jmethodID method = env->GetMethodID(cls, "emit", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V");
  if (method == nullptr) {
    env->DeleteLocalRef(cls);
    return;
  }
  jstring jType = env->NewStringUTF(type);
  jstring jText = env->NewStringUTF(text.c_str());
  jstring jUsage = env->NewStringUTF(usage.c_str());
  env->CallVoidMethod(sink, method, jType, jText, jUsage);
  env->DeleteLocalRef(jUsage);
  env->DeleteLocalRef(jText);
  env->DeleteLocalRef(jType);
  env->DeleteLocalRef(cls);
}

ModelState * getModel(jlong handle) {
  std::lock_guard<std::mutex> lock(g_mutex);
  auto it = g_models.find(handle);
  return it == g_models.end() ? nullptr : it->second.get();
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
  const double seconds = static_cast<double>(totalUs) / 1000000.0;
  const double rate = seconds > 0.0 ? static_cast<double>(completionTokens) / seconds : 0.0;
  return "{\"promptTokens\":" + std::to_string(promptTokens) +
         ",\"completionTokens\":" + std::to_string(completionTokens) +
         ",\"ttftMs\":" + std::to_string(ttftUs / 1000) +
         ",\"tokPerSec\":" + std::to_string(rate) + "}";
}

}  // namespace

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_initBackend(JNIEnv *, jobject) {
  std::call_once(g_backendFlag, [] { llama_backend_init(); });
}

extern "C" JNIEXPORT jlong JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_loadModel(
    JNIEnv * env, jobject, jstring jPath, jint contextTokens, jint) {
  const char * path = env->GetStringUTFChars(jPath, nullptr);
  auto state = std::make_unique<ModelState>();

  llama_model_params modelParams = llama_model_default_params();
  modelParams.n_gpu_layers = 0;
  state->model = llama_model_load_from_file(path, modelParams);
  env->ReleaseStringUTFChars(jPath, path);
  if (state->model == nullptr) return 0;

  llama_context_params ctxParams = llama_context_default_params();
  ctxParams.n_ctx = static_cast<uint32_t>(contextTokens);
  ctxParams.n_batch = static_cast<uint32_t>(contextTokens);
  ctxParams.no_perf = false;
  state->ctx = llama_init_from_model(state->model, ctxParams);
  if (state->ctx == nullptr) {
    llama_model_free(state->model);
    return 0;
  }

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
  return handle;
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_generate(
    JNIEnv * env, jobject, jlong handle, jstring jPrompt, jint threads, jobject sink) {
  ModelState * state = getModel(handle);
  if (state == nullptr) {
    emit(env, sink, "error", "Modelo no cargado", "{}");
    return;
  }

  state->cancelled.store(false);
  llama_set_n_threads(state->ctx, threads, threads);

  const char * promptChars = env->GetStringUTFChars(jPrompt, nullptr);
  const std::string prompt = formatPrompt(state->model, promptChars);
  env->ReleaseStringUTFChars(jPrompt, promptChars);

  const llama_vocab * vocab = llama_model_get_vocab(state->model);
  int32_t nPrompt = -llama_tokenize(vocab, prompt.c_str(), static_cast<int32_t>(prompt.size()), nullptr, 0, true, true);
  if (nPrompt <= 0) {
    emit(env, sink, "error", "No se pudo tokenizar el prompt", "{}");
    return;
  }
  std::vector<llama_token> tokens(static_cast<size_t>(nPrompt));
  if (llama_tokenize(vocab, prompt.c_str(), static_cast<int32_t>(prompt.size()), tokens.data(), nPrompt, true, true) < 0) {
    emit(env, sink, "error", "No se pudo tokenizar el prompt", "{}");
    return;
  }

  llama_batch_ext * batch = llama_batch_ext_init(state->ctx);
  batchSetTokens(batch, tokens.data(), nPrompt, 0);

  const auto started = std::chrono::steady_clock::now();
  if (llama_process(state->ctx, LLAMA_PROCESS_TYPE_DECODE, batch) != 0) {
    llama_batch_ext_free(batch);
    emit(env, sink, "error", "Falló la evaluación del prompt", "{}");
    return;
  }

  int64_t ttftUs = 0;
  int generated = 0;
  llama_pos pos = nPrompt;
  constexpr int kMaxTokens = 512;
  char piece[256];

  while (generated < kMaxTokens && !state->cancelled.load()) {
    const llama_token next = llama_sampler_sample(state->sampler, state->ctx, -1);
    if (llama_vocab_is_eog(vocab, next)) break;

    const int n = llama_token_to_piece(vocab, next, piece, sizeof(piece), 0, true);
    if (n > 0) emit(env, sink, "token", std::string(piece, static_cast<size_t>(n)), "{}");
    if (generated == 0) {
      ttftUs = std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - started).count();
    }

    llama_sampler_accept(state->sampler, next);
    generated++;
    batchSetTokens(batch, &next, 1, pos);
    pos++;

    if (llama_process(state->ctx, LLAMA_PROCESS_TYPE_DECODE, batch) != 0) {
      emit(env, sink, "error", "Falló la generación", "{}");
      break;
    }
  }

  const auto finished = std::chrono::steady_clock::now();
  const int64_t totalUs = std::chrono::duration_cast<std::chrono::microseconds>(finished - started).count();
  llama_batch_ext_free(batch);
  emit(env, sink, "usage", "", usageJson(ttftUs, totalUs, nPrompt, generated));
  emit(env, sink, "done", "", "{}");
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_cancel(JNIEnv *, jobject, jlong handle) {
  ModelState * state = getModel(handle);
  if (state != nullptr) state->cancelled.store(true);
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsLlamaNative_unloadModel(JNIEnv *, jobject, jlong handle) {
  std::lock_guard<std::mutex> lock(g_mutex);
  g_models.erase(handle);
}
