package expo.modules.pyrohornsllama

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
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

    // «Acceso a todos los archivos» (S3-A): permite abrir los GGUF directo desde /sdcard.
    Function("hasAllFilesAccess") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.R || Environment.isExternalStorageManager()
    }

    // Tamaño en bytes del archivo, o -1 si no existe o no se puede leer (ruta tal cual, sin pasar por URI).
    Function("fileSize") { path: String ->
      val file = File(path)
      if (file.isFile && file.canRead()) file.length() else -1L
    }

    Function("requestAllFilesAccess") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val specific = Intent(
        Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
        Uri.parse("package:${context.packageName}")
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(specific)
      } catch (e: ActivityNotFoundException) {
        context.startActivity(
          Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      }
    }

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
