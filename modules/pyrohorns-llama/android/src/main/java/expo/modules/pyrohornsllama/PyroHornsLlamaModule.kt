package expo.modules.pyrohornsllama

import android.Manifest
import android.app.ActivityManager
import android.content.ContentUris
import android.content.ContentValues
import android.content.pm.PackageManager
import android.provider.AlarmClock
import android.provider.ContactsContract
import android.provider.CalendarContract
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.provider.Settings
import android.view.WindowManager
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
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

  private fun appCtx(): Context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  // El primer calendario en el que se puede escribir, prefiriendo el principal.
  private fun writableCalendar(context: Context): Long {
    var chosen = -1L
    context.contentResolver.query(
      CalendarContract.Calendars.CONTENT_URI,
      arrayOf(CalendarContract.Calendars._ID, CalendarContract.Calendars.IS_PRIMARY),
      "${CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL} >= ${CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR}",
      null,
      null
    )?.use { cursor ->
      while (cursor.moveToNext()) {
        if (chosen < 0 || cursor.getInt(1) == 1) chosen = cursor.getLong(0)
      }
    }
    check(chosen >= 0) { "No hay ningún calendario en el que escribir. Crea uno en la app Calendario." }
    return chosen
  }

  private fun openClock(intent: Intent) {
    intent.putExtra(AlarmClock.EXTRA_SKIP_UI, true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      appCtx().startActivity(intent)
    } catch (e: ActivityNotFoundException) {
      throw IllegalStateException("Este teléfono no tiene una app de reloj que lo admita.", e)
    }
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
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      native.initBackend(File(dir, "session.log").path, context.applicationInfo.nativeLibraryDir)
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

    AsyncFunction("requestCalendarPermission") { promise: Promise ->
      val context = appCtx()
      val wanted = arrayOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR)
      if (wanted.all { context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }) {
        promise.resolve(mapOf("granted" to true))
      } else {
        Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, *wanted)
      }
    }

    AsyncFunction("requestContactsPermission") { promise: Promise ->
      val context = appCtx()
      val wanted = arrayOf(Manifest.permission.READ_CONTACTS)
      if (context.checkSelfPermission(wanted[0]) == PackageManager.PERMISSION_GRANTED) {
        promise.resolve(mapOf("granted" to true))
      } else {
        Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, *wanted)
      }
    }

    // Contactos cuyo nombre contiene el texto, con sus teléfonos y correos (JSON). Máximo cinco.
    AsyncFunction("searchContacts") { name: String ->
      val context = appCtx()
      check(context.checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
        "Sin permiso de contactos."
      }
      val out = JSONArray()
      val uri = Uri.withAppendedPath(ContactsContract.Contacts.CONTENT_FILTER_URI, Uri.encode(name))
      context.contentResolver.query(
        uri,
        arrayOf(ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY),
        null,
        null,
        null
      )?.use { cursor ->
        while (cursor.moveToNext() && out.length() < 5) {
          val id = cursor.getString(0)
          val displayName = cursor.getString(1) ?: ""
          val phones = JSONArray()
          val emails = JSONArray()
          context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
            "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
            arrayOf(id),
            null
          )?.use { p -> while (p.moveToNext()) phones.put(p.getString(0)) }
          context.contentResolver.query(
            ContactsContract.CommonDataKinds.Email.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Email.ADDRESS),
            "${ContactsContract.CommonDataKinds.Email.CONTACT_ID} = ?",
            arrayOf(id),
            null
          )?.use { e -> while (e.moveToNext()) emails.put(e.getString(0)) }
          out.put(JSONObject().put("name", displayName).put("phones", phones).put("emails", emails))
        }
      }
      out.toString()
    }

    // Abre el marcador con el número; no llama: el usuario pulsa llamar.
    AsyncFunction("dialNumber") { number: String ->
      appCtx().startActivity(
        Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    // Abre el chat de WhatsApp con el número; el usuario envía el mensaje.
    AsyncFunction("openWhatsApp") { number: String ->
      val digits = number.filter { it.isDigit() }
      check(digits.isNotEmpty()) { "El número no tiene dígitos." }
      try {
        appCtx().startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$digits")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      } catch (e: ActivityNotFoundException) {
        throw IllegalStateException("No hay WhatsApp ni navegador para abrir el chat.", e)
      }
    }

    AsyncFunction("addEvent") { title: String, startMs: Double, endMs: Double ->
      val context = appCtx()
      val event = ContentValues().apply {
        put(CalendarContract.Events.CALENDAR_ID, writableCalendar(context))
        put(CalendarContract.Events.TITLE, title)
        put(CalendarContract.Events.DTSTART, startMs.toLong())
        put(CalendarContract.Events.DTEND, endMs.toLong())
        put(CalendarContract.Events.EVENT_TIMEZONE, java.util.TimeZone.getDefault().id)
      }
      val uri = context.contentResolver.insert(CalendarContract.Events.CONTENT_URI, event)
      val id = ContentUris.parseId(checkNotNull(uri) { "El calendario no aceptó el evento." })
      val reminder = ContentValues().apply {
        put(CalendarContract.Reminders.EVENT_ID, id)
        put(CalendarContract.Reminders.MINUTES, 10)
        put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT)
      }
      context.contentResolver.insert(CalendarContract.Reminders.CONTENT_URI, reminder)
      id.toString()
    }

    AsyncFunction("deleteEvent") { id: String ->
      val uri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id.toLong())
      appCtx().contentResolver.delete(uri, null, null) > 0
    }

    AsyncFunction("setAlarm") { hour: Int, minute: Int, label: String ->
      openClock(
        Intent(AlarmClock.ACTION_SET_ALARM)
          .putExtra(AlarmClock.EXTRA_HOUR, hour)
          .putExtra(AlarmClock.EXTRA_MINUTES, minute)
          .putExtra(AlarmClock.EXTRA_MESSAGE, label)
      )
    }

    AsyncFunction("setTimer") { seconds: Int, label: String ->
      openClock(
        Intent(AlarmClock.ACTION_SET_TIMER)
          .putExtra(AlarmClock.EXTRA_LENGTH, seconds)
          .putExtra(AlarmClock.EXTRA_MESSAGE, label)
      )
    }

    AsyncFunction("loadModel") Coroutine { path: String, contextTokens: Int, threads: Int, useMmap: Boolean ->
      withContext(Dispatchers.IO) { native.loadModel(path, contextTokens, threads, useMmap) }
    }

    AsyncFunction("generate") Coroutine { handle: Long, roles: List<String>, contents: List<String>, threads: Int, noThink: Boolean ->
      withContext(Dispatchers.IO) {
        native.generate(handle, roles.toTypedArray(), contents.toTypedArray(), threads, noThink, object : LlamaEventSink {
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

    AsyncFunction("warm") Coroutine { handle: Long, roles: List<String>, contents: List<String>, threads: Int ->
      withContext(Dispatchers.IO) { native.warm(handle, roles.toTypedArray(), contents.toTypedArray(), threads) }
    }

    AsyncFunction("complete") Coroutine { handle: Long, roles: List<String>, contents: List<String>, threads: Int, noThink: Boolean, maxTokens: Int ->
      withContext(Dispatchers.IO) {
        native.complete(handle, roles.toTypedArray(), contents.toTypedArray(), threads, noThink, maxTokens)
      }
    }

    // Prueba de rendimiento (P13): devuelve JSON con los tiempos de prefill y generación.
    AsyncFunction("bench") Coroutine { handle: Long, nPrompt: Int, nGen: Int, threads: Int ->
      withContext(Dispatchers.IO) { native.bench(handle, nPrompt, nGen, threads) }
    }

    // Estado del equipo (P13): batería, temperatura de la batería, estado térmico de Android y ahorro de energía.
    // Todo sin permisos: la batería llega por el broadcast fijo ACTION_BATTERY_CHANGED.
    Function("deviceStatus") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val battery = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
      val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
      val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
      val pct = if (level >= 0 && scale > 0) level * 100 / scale else -1
      // Android da la temperatura de la batería en décimas de grado. No es la del procesador, que suele ir por delante.
      val tenthsC = battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1) ?: -1
      val status = battery?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      // Estado térmico que usa Android para limitar la CPU: 0 normal … 6 apagado (desde Android 10).
      val thermal = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) power.currentThermalStatus else -1
      JSONObject()
        .put("batteryPct", pct)
        .put("batteryTempC", if (tenthsC >= 0) tenthsC / 10.0 else -1.0)
        .put(
          "charging",
          status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        )
        .put("thermal", thermal)
        .put("powerSave", power.isPowerSaveMode)
        .toString()
    }

    // Memoria del proceso (RSS y pico) y del sistema, leída de /proc (sin permisos).
    Function("memoryInfo") {
      fun readKb(file: String, key: String): Long = try {
        File(file).useLines { lines ->
          lines.firstOrNull { it.startsWith(key) }?.let { Regex("(\\d+)").find(it)?.value?.toLong() } ?: -1L
        }
      } catch (e: Exception) {
        -1L
      }
      JSONObject()
        .put("rssKb", readKb("/proc/self/status", "VmRSS:"))
        .put("hwmKb", readKb("/proc/self/status", "VmHWM:"))
        .put("availKb", readKb("/proc/meminfo", "MemAvailable:"))
        .put("totalKb", readKb("/proc/meminfo", "MemTotal:"))
        .toString()
    }

    // Reinicia el pico de RAM (VmHWM) para medirlo por prueba; devuelve false si el sistema no lo permite.
    Function("resetPeakMemory") {
      try {
        FileOutputStream("/proc/self/clear_refs").use { it.write("5".toByteArray()) }
        true
      } catch (e: Exception) {
        false
      }
    }

    // Instrucciones y frecuencias de la CPU, para interpretar las medidas (sin permisos).
    Function("cpuInfo") {
      val features = try {
        File("/proc/cpuinfo").useLines { lines ->
          lines.firstOrNull { it.startsWith("Features") }?.substringAfter(":")?.trim() ?: ""
        }
      } catch (e: Exception) {
        ""
      }
      val freqs = JSONArray()
      for (i in 0 until Runtime.getRuntime().availableProcessors()) {
        val khz = try {
          File("/sys/devices/system/cpu/cpu$i/cpufreq/cpuinfo_max_freq").readText().trim().toLong()
        } catch (e: Exception) {
          -1L
        }
        freqs.put(khz)
      }
      JSONObject().put("features", features).put("maxKhz", freqs).toString()
    }

    // Evita que la pantalla se apague durante una prueba larga.
    Function("keepScreenOn") { on: Boolean ->
      val activity = appContext.currentActivity
      activity?.runOnUiThread {
        if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
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
