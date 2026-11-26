// Voz a texto con whisper.cpp (MIT). Biblioteca aparte de llama.cpp: ver CMakeLists.txt.
// Sin texto del usuario en los registros (S9): solo se devuelve la transcripción al llamador.
#include <jni.h>

#include <atomic>
#include <mutex>
#include <string>
#include <unordered_map>

#include "whisper.h"

namespace {

// Un contexto de whisper no admite dos transcripciones a la vez: el mapa y las llamadas van con un mismo cerrojo.
std::mutex g_mutex;
std::unordered_map<jlong, whisper_context *> g_contexts;
std::atomic<jlong> g_next{1};

// NewStringUTF no admite bytes UTF-8 incompletos: se descartan los que no forman un carácter válido.
std::string sanitizeUtf8(const std::string & s) {
  std::string out;
  out.reserve(s.size());
  size_t i = 0;
  while (i < s.size()) {
    const unsigned char c = static_cast<unsigned char>(s[i]);
    size_t need = 0;
    if (c < 0x80) need = 1;
    else if ((c >> 5) == 0x6) need = 2;
    else if ((c >> 4) == 0xE) need = 3;
    else if ((c >> 3) == 0x1E) need = 4;
    bool ok = need > 0 && i + need <= s.size();
    for (size_t k = 1; ok && k < need; ++k) {
      ok = (static_cast<unsigned char>(s[i + k]) & 0xC0) == 0x80;
    }
    if (ok) {
      out.append(s, i, need);
      i += need;
    } else {
      ++i;
    }
  }
  return out;
}

}  // namespace

extern "C" JNIEXPORT jlong JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsWhisperNative_load(JNIEnv * env, jobject, jstring jPath) {
  const char * path = env->GetStringUTFChars(jPath, nullptr);
  whisper_context_params params = whisper_context_default_params();
  params.use_gpu = false;
  whisper_context * ctx = whisper_init_from_file_with_params(path, params);
  env->ReleaseStringUTFChars(jPath, path);
  if (ctx == nullptr) {
    return 0;
  }
  const jlong handle = g_next.fetch_add(1);
  std::lock_guard<std::mutex> lock(g_mutex);
  g_contexts[handle] = ctx;
  return handle;
}

// Audio mono a 16 kHz en coma flotante (-1 a 1). Idioma fijo: español. `jPrompt` es el vocabulario del dictado (P26-A1).
extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsWhisperNative_transcribe(JNIEnv * env, jobject, jlong handle, jfloatArray jSamples, jint threads, jstring jPrompt) {
  std::lock_guard<std::mutex> lock(g_mutex);
  const auto it = g_contexts.find(handle);
  if (it == g_contexts.end()) {
    return env->NewStringUTF("");
  }
  whisper_context * ctx = it->second;
  const jsize n = env->GetArrayLength(jSamples);
  jfloat * samples = env->GetFloatArrayElements(jSamples, nullptr);

  // Se copia el vocabulario antes de soltar la cadena de Java; vive hasta que termina whisper_full.
  const char * promptChars = jPrompt != nullptr ? env->GetStringUTFChars(jPrompt, nullptr) : nullptr;
  const std::string prompt = promptChars != nullptr ? promptChars : "";
  if (promptChars != nullptr) {
    env->ReleaseStringUTFChars(jPrompt, promptChars);
  }

  whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
  params.n_threads = threads;
  params.language = "es";
  params.translate = false;
  params.no_context = true;
  params.no_timestamps = true;
  params.single_segment = false;
  params.print_special = false;
  params.print_progress = false;
  params.print_realtime = false;
  params.print_timestamps = false;
  // Menos «[Música]» y «♪» cuando no hay voz: se suprimen los símbolos no verbales y las ventanas casi en silencio se descartan.
  params.suppress_nst = true;
  params.no_speech_thold = 0.6f;
  params.initial_prompt = prompt.empty() ? nullptr : prompt.c_str();

  const int rc = whisper_full(ctx, params, samples, n);
  env->ReleaseFloatArrayElements(jSamples, samples, JNI_ABORT);

  std::string text;
  if (rc == 0) {
    const int segments = whisper_full_n_segments(ctx);
    for (int i = 0; i < segments; ++i) {
      const char * piece = whisper_full_get_segment_text(ctx, i);
      if (piece != nullptr) {
        text += piece;
      }
    }
  }
  // Los segmentos suelen empezar con un espacio.
  size_t start = 0;
  while (start < text.size() && (text[start] == ' ' || text[start] == '\n')) {
    ++start;
  }
  return env->NewStringUTF(sanitizeUtf8(text.substr(start)).c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_pyrohornsllama_PyroHornsWhisperNative_free(JNIEnv *, jobject, jlong handle) {
  std::lock_guard<std::mutex> lock(g_mutex);
  const auto it = g_contexts.find(handle);
  if (it != g_contexts.end()) {
    whisper_free(it->second);
    g_contexts.erase(it);
  }
}
