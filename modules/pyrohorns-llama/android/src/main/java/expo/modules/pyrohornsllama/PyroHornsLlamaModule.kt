package expo.modules.pyrohornsllama

import android.app.ActivityManager
import android.content.ActivityNotFoundException
import android.content.Context
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
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class PyroHornsLlamaModule : Module() {
  private val native = PyroHornsLlamaNative()

  private fun diagnosticsDir(): File {
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    return File(context.filesDir, "diagnostics").apply { mkdirs() }
  }

  // Si la sesión anterior no terminó en reposo («idle»/«start»), se guarda su rastro como cierre inesperado.
  private fun rotateSessionLog(dir: File) {
    val current = File(dir, "session.log")
    if (current.exists()) {
      val lastLine = current.readLines().lastOrNull { it.isNotBlank() } ?: ""
      val clean = lastLine.isEmpty() || lastLine.endsWith(" idle") || lastLine.endsWith(" start") || lastLine.endsWith(" backend ok")
      if (!clean) current.copyTo(File(dir, "crash-last.log"), overwrite = true)
      current.delete()
    }
  }

  // Tramos de texto legible de un volcado binario (tombstone): nombres de bibliotecas y funciones.
  private fun printableRuns(bytes: ByteArray): String {
    val out = StringBuilder()
    val run = StringBuilder()
    for (b in bytes) {
      val c = b.toInt() and 0xFF
      if (c in 32..126) {
        run.append(c.toChar())
      } else {
        if (run.length >= 8) out.append(run).append('\n')
        run.setLength(0)
      }
      if (out.length > 3000) break
    }
    if (run.length >= 8 && out.length <= 3000) out.append(run)
    return out.toString().take(3000)
  }

  private fun exitInfos(context: Context): JSONArray {
    val result = JSONArray()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return result
    val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    for (info in manager.getHistoricalProcessExitReasons(context.packageName, 0, 6)) {
      val item = JSONObject()
        .put("reason", info.reason)
        .put("description", info.description ?: "")
        .put("status", info.status)
        .put("timestamp", info.timestamp)
        .put("rssKb", info.rss)
      if (info.reason == android.app.ApplicationExitInfo.REASON_CRASH_NATIVE) {
        val trace = try {
          info.traceInputStream?.use { printableRuns(it.readBytes()) } ?: ""
        } catch (e: Exception) {
          ""
        }
        item.put("trace", trace)
      }
      result.put(item)
    }
    return result
  }

  override fun definition() = ModuleDefinition {
    Name("PyroHornsLlama")

    Events("onEvent")

    OnCreate {
      val dir = diagnosticsDir()
      rotateSessionLog(dir)
      native.initBackend(File(dir, "session.log").path)
    }

    // Rastros del motor y motivos de cierre que registra Android (sin conversaciones ni claves, S9).
    Function("diagnostics") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val dir = diagnosticsDir()
      fun read(name: String): String = File(dir, name).let { if (it.exists()) it.readText().takeLast(6000) else "" }
      JSONObject()
        .put("crashLog", read("crash-last.log"))
        .put("sessionLog", read("session.log"))
        .put("exits", exitInfos(context))
        .put("sdk", Build.VERSION.SDK_INT)
        .put("device", "${Build.MANUFACTURER} ${Build.MODEL}")
        .toString()
    }

    Function("clearDiagnostics") {
      File(diagnosticsDir(), "crash-last.log").delete()
    }

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

    AsyncFunction("generate") Coroutine { handle: Long, prompt: String, threads: Int, noThink: Boolean ->
      withContext(Dispatchers.IO) {
        native.generate(handle, prompt, threads, noThink, object : LlamaEventSink {
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
