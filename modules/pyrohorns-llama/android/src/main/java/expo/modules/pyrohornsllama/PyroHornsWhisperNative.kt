package expo.modules.pyrohornsllama

/** Puente JNI a whisper.cpp (libpyrohorns_whisper.so). Se carga solo cuando se usa la voz. */
class PyroHornsWhisperNative {
  companion object {
    init {
      System.loadLibrary("pyrohorns_whisper")
    }
  }

  /** Carga un modelo ggml de whisper; 0 si no se pudo abrir. */
  external fun load(path: String): Long

  /** Transcribe audio mono de 16 kHz (coma flotante) en español. `prompt` es el vocabulario (órdenes y contactos) que se le enseña. */
  external fun transcribe(handle: Long, samples: FloatArray, threads: Int, prompt: String): String

  external fun free(handle: Long)
}
