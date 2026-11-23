package expo.modules.pyrohornsllama

import androidx.core.os.bundleOf
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class PyroHornsLlamaModule : Module() {
  private val native = PyroHornsLlamaNative()

  init {
    native.initBackend()
  }

  override fun definition() = ModuleDefinition {
    Name("PyroHornsLlama")

    Events("onEvent")

    AsyncFunction("isAvailable") { true }

    AsyncFunction("loadModel") Coroutine { path: String, contextTokens: Int, threads: Int ->
      withContext(Dispatchers.IO) { native.loadModel(path, contextTokens, threads) }
    }

    AsyncFunction("generate") Coroutine { handle: Long, prompt: String, threads: Int ->
      withContext(Dispatchers.IO) {
        native.generate(handle, prompt, threads, object : LlamaEventSink {
          override fun emit(type: String, text: String, usage: String) {
            sendEvent("onEvent", bundleOf(
              "handle" to handle,
              "type" to type,
              "text" to text,
              "usage" to usage
            ))
          }
        })
      }
    }

    AsyncFunction("cancel") Coroutine { handle: Long ->
      withContext(Dispatchers.IO) { native.cancel(handle) }
    }

    AsyncFunction("unloadModel") Coroutine { handle: Long ->
      withContext(Dispatchers.IO) { native.unloadModel(handle) }
    }
  }
}
