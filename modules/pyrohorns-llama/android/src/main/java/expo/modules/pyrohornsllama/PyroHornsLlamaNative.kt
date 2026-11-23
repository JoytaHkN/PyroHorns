package expo.modules.pyrohornsllama

class PyroHornsLlamaNative {
  init {
    System.loadLibrary("pyrohorns_llama")
  }

  external fun initBackend(crumbPath: String)

  external fun loadModel(path: String, contextTokens: Int, threads: Int): Long

  external fun generate(handle: Long, prompt: String, threads: Int, sink: LlamaEventSink)

  external fun cancel(handle: Long)

  external fun unloadModel(handle: Long)
}
