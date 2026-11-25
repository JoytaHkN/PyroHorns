package expo.modules.pyrohornsllama

class PyroHornsLlamaNative {
  init {
    System.loadLibrary("pyrohorns_llama")
  }

  external fun initBackend(crumbPath: String, libDir: String)

  external fun loadModel(path: String, contextTokens: Int, threads: Int, useMmap: Boolean): Long

  external fun generate(
    handle: Long,
    roles: Array<String>,
    contents: Array<String>,
    threads: Int,
    noThink: Boolean,
    sink: LlamaEventSink
  )

  external fun warm(handle: Long, roles: Array<String>, contents: Array<String>, threads: Int)

  external fun bench(handle: Long, nPrompt: Int, nGen: Int, threads: Int): String

  external fun cancel(handle: Long)

  external fun unloadModel(handle: Long)
}
