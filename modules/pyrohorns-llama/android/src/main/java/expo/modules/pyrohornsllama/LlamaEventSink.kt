package expo.modules.pyrohornsllama

interface LlamaEventSink {
  fun emit(type: String, text: String, usage: String)
}
