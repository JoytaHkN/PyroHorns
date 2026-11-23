# Estado de PyroHorns

> Documento vivo para retomar el trabajo desde cualquier agente o entorno. Se actualiza al cerrar
> cada bloque de trabajo (ver `AGENTS.md`).

**Última actualización:** 2026-11-23 · Claude Code en and-code

## Dónde estamos
- **F1** ✅ y **F1.1** ✅, cerradas: el usuario probó el APK en su móvil y todo está OK (2026-11-23).
  - Incluyen: PyroHorns, conversaciones cifradas (SQLCipher + FTS5), contraseña de copia, Profundo,
    modo → modelo, contrato del motor ampliado, CI.
- Repo **público**: https://github.com/JoytaHkN/PyroHorns · PWA: https://joytahkn.github.io/PyroHorns/
- **APK de prueba**: `APK IA/apk/PyroHorns-0.1.0-F1.1-prueba.apk`, compilado por GitHub Actions con la
  firma de depuración de la plantilla de Expo. Los APK siguientes de `android.yml` llevan la misma firma
  y se instalan encima.
- **Permisos (D9):** se mantienen todos los que declara el APK, aunque algunos aún no se usen. No quitarlos.
- **Versión de prueba firmada `v0.1.0-alpha.1`** (firma de prelanzamiento) publicada en GitHub Releases como pre-release. Pasar del APK con firma de depuración a esta exige desinstalar una vez; las siguientes versiones firmadas se instalan encima.
- Secretos de firma de prelanzamiento cargados en el repo. Dependabot ajustado (#7 y #9 cerrados).
- **Dato para F1.5:** el llama.cpp que fija LMPlayground (commit `dc33e61`, 2026-10-13) ya soporta
  `LLM_ARCH_LFM3`.

## Siguiente paso
1. **F1.5 — prueba de inferencia en el móvil** (`PLAN.md` §5), EN CURSO (visto bueno del usuario, 2026-11-23):
   - Paso 1 ✅: `LlamaProvider` en TypeScript (`src/providers/llama.ts`) con fallback a
     `MockProvider` cuando el módulo nativo no esté disponible; integración en `src/lib/engine.ts`.
   - Paso 2 ✅ en CI (`f5503ca`), **pendiente de probar en el móvil**: el CI en verde de `bc145ff` era un
     falso positivo (`.gitignore` con `android/` sin anclar ocultaba `modules/pyrohorns-llama/android/` y
     `fastlane/metadata/android/`; el módulo no se había subido ni compilado). Corregido a `/android/`; además
     `AsyncFunction` pasó a `Coroutine` (no compilaba). Ahora el APK lleva `libpyrohorns_llama.so` (arm64-v8a).
     APK para probar: `APK IA/apk/PyroHorns-0.1.0-F1.5-paso2-prueba.apk` (+ `.sha256`). Módulo propio
     `modules/pyrohorns-llama` (Expo Modules + JNI + CMake), con llama.cpp `dc33e61` vendimizado por
     `scripts/vendor-llama.sh` (SHA-256). Se registra solo en Android; en web y pruebas sigue
     `MockProvider`. `android.yml` instala NDK 27.1.12297006 y CMake 3.31.6.
   - **Probado en el móvil (2026-11-23): falló** con «No se encontró LFM3-1.7B-Q4_K_M.gguf…»: la app no tenía acceso
     a `/sdcard`. El usuario eligió **P14-C** (A y B seleccionables, por defecto B) y está **implementado (`955dbed`), CI en verde,
     pendiente de probar en el móvil**: Modelos → «Acceso a los modelos» (carpeta de la app / todo el almacenamiento), botón para
     conceder `MANAGE_EXTERNAL_STORAGE`, «Importar archivo .gguf» con el selector del sistema (copia a `models/` de la app,
     por nombre o por tamaño exacto) y estado «Disponible/Falta» por modelo. `app.json` declara `MANAGE_EXTERNAL_STORAGE`
     (se conservan los demás permisos, D9). Nativo nuevo: `fileSize`, `hasAllFilesAccess`, `requestAllFilesAccess`.
     APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-P14C-prueba.apk` (+ `.sha256`; lleva `libpyrohorns_llama.so` y
     `MANAGE_EXTERNAL_STORAGE`). **Cómo probar:** instalar el APK nuevo → Modelos → importar LFM3 (vía B) → abrir un chat en modo General y escribir.
   - **Prueba del APK P14-C (2026-11-23):** importar y «Disponible» funcionan, pero **al escribir en el chat la app se
     cierra sola** con los 4 GGUF, sin mensaje de error. Causa **aún sin identificar** (no hay registro del móvil). Hallado
     por lectura de código y corregido: (1) `ModelState` no liberaba modelo/contexto/sampler (con la carga por mensaje,
     cada mensaje dejaba el modelo en RAM); (2) las excepciones C++ no se capturaban en el JNI; (3) un token que
     cortaba un carácter UTF-8 se enviaba a medias. Añadido **Ajustes → Diagnóstico del motor**: el JNI escribe un rastro
     por etapas (carga, plantilla, tokenizar, prompt, tokens) en un archivo que sobrevive al cierre, registra la señal
     fatal (SIGSEGV/SIGABRT/SIGILL/SIGBUS) y la pantalla muestra además los motivos de cierre de Android
     (`ApplicationExitInfo`: falta de memoria, fallo nativo + traza). CI Android en verde (`1497dda`). APK:
     `APK IA/apk/PyroHorns-0.1.0-F1.5-diagnostico-prueba.apk` (+ `.sha256`). **Siguiente:** instalar el APK nuevo, repetir la
     prueba del chat, abrir Ajustes → Diagnóstico del motor, seleccionar el informe y pegarlo al agente.
     Nota para P13: `GGML_NATIVE=OFF` compila ggml-cpu en armv8-a básico (sin dotprod/i8mm): funciona, pero más lento.
   - Pasos 3 y 4: diseño propuesto en `PLAN.md` §7 (P13), a la espera de visto bueno.
   - Paso 3 (pendiente): comparar abrir el GGUF desde /sdcard con copiarlo al almacenamiento de la app;
     elegir la más rápida.
   - Paso 4 (pendiente): medir TTFT, tok/s y RAM con 1K y 8K de contexto.
   - Sin plan B: directo con el módulo nativo (decisión del usuario).
2. Revisar los PR de Dependabot que quedan: #1–#5 (acciones de GitHub; relanzar su CI, que falló por
   la facturación), #6 uniwind 1.14, y #8 y #10 (esperar al siguiente Expo SDK).

## Pendiente de decisión del usuario
- **P13** · pantalla de prueba de rendimiento para los pasos 3 y 4 de F1.5 (`PLAN.md` §7): esperando visto
  bueno y las cinco decisiones abiertas (variante sin mmap, barrido de hilos, modelos a probar, salida de
  resultados, tok/s del chat). No se ha escrito código. Ya no está bloqueada por P14.
- Propuestas de diseño e interacción P1–P12 (`PLAN.md` §7).

## Prompt para retomar en otro agente
Si cambias de agente (and-code → menú del chat → *Continuar en otro runtime*) o abres un chat nuevo,
envía esto primero:

> Trabaja en /sdcard/IA/Proyectos/APK IA/PyroHorns. Lee AGENTS.md, docs/ESTADO.md, PLAN.md y
> docs/CONTINUIDAD.md; revisa `git log --oneline -10`, `git status` y `gh run list --limit 4`, y continúa
> con el siguiente paso de docs/ESTADO.md. No des por cerrado lo que esté pendiente de decisión o de
> validar en CI/móvil; al cerrar cada bloque actualiza ESTADO.md (y PLAN.md si cambia el alcance), pasa
> `sh scripts/sync-build.sh`, haz commit en español y push. Responde en español.

Checklist completo de cierre, versión para PC y pasos de instalación: `docs/CONTINUIDAD.md`.

## Registro
- **2026-11-23** · F1 (commit `c8234c0`) y F1.1 (commit `66dd555`). Repo creado y hecho público;
  Pages activado; secretos de firma cargados; Dependabot ajustado (#7 y #9 cerrados); documentos de
  traspaso entre agentes (`AGENTS.md`, este archivo).
- **2026-11-23** · Primer APK (F1.1) compilado y verificado; copiado a `APK IA/apk/`.
- **2026-11-23** · El usuario probó el APK: todo OK. Los permisos declarados se mantienen (D9).
  Comprobado que llama.cpp `dc33e61` soporta LFM3.
- **2026-11-23** · S10 confirmado (javascript:/data: como texto). Publicada `v0.1.0-alpha.1` firmada. Empieza F1.5.
- **2026-11-23** · F1.5 paso 1: `LlamaProvider` en TypeScript con fallback a `MockProvider`; integración en
  `engine.ts`; typecheck y 83 pruebas en verde. Siguiente: módulo nativo (Expo Modules + JNI) basado en
  LMPlayground `dc33e61`.
- **2026-11-23** · F1.5 paso 2: módulo `modules/pyrohorns-llama` (Expo Modules + JNI + CMake),
  llama.cpp `dc33e61` vendimizado con SHA-256, registro automático desde `_layout.tsx`, NDK y CMake en
  `android.yml`, avisos de terceros actualizados. Typecheck, 83 pruebas y bundle Android en verde;
  autolinking resuelve el módulo. Falta validar la compilación nativa en GitHub Actions y probar el APK
  en el móvil. Siguiente: paso 3 (ruta del GGUF).
- **2026-11-23** · CI de F1.5 paso 2 en verde (`bc145ff`): el primer intento falló por licencias del SDK
  en `android-actions/setup-android@v3`; se sustituyó por el `sdkmanager` preinstalado del runner.
- **2026-11-23** · Continuidad: `docs/CONTINUIDAD.md` con checklist de cierre, prompt reforzado para
  and-code, prompt para PC y pasos de instalación; referenciado desde `AGENTS.md` y este archivo.
- **2026-11-23** · Hallazgo: el módulo nativo no estaba en git por un `.gitignore` demasiado amplio (`android/`);
  el APK de `bc145ff` no contenía `libpyrohorns_llama.so`. Se ancla a `/android/` y `/ios/`, y se añaden
  el módulo Android y los metadatos de F-Droid (`fastlane/`). Pendiente: CI y comprobación del `.so`.
- **2026-11-23** · F1.5 paso 2 corregido (`5ce99a6`, `f5503ca`): `.gitignore` anclado, módulo Android y
  `fastlane/` añadidos a git, Kotlin con `Coroutine`. CI Android en verde y APK con `libpyrohorns_llama.so`
  (copiado a `APK IA/apk/`). No probado todavía en el móvil. Siguiente: probarlo y seguir con pasos 3 y 4.
- **2026-11-23** · F1.5: propuesta P13 (pantalla de benchmark) redactada en `PLAN.md` §7; sin código, pendiente de visto bueno.
- **2026-11-23** · Prueba del APK F1.5 paso 2 en el móvil: el motor nativo se carga, pero no encuentra el GGUF por falta de
  acceso a `/sdcard`. Se registra P14 (acceso a modelos) en `PLAN.md` §7, pendiente de decisión; P13 (benchmark) queda tras ella.
- **2026-11-23** · P14 decidida por el usuario: opción C. Implementada: ajuste `modelAccess`, permiso
  `MANAGE_EXTERNAL_STORAGE`, importación con selector, disponibilidad por modelo, mensajes de error accionables;
  21 pruebas nuevas (`tests/model-files.test.ts`). Typecheck, pruebas y bundle Android en verde; prebuild conserva los
  permisos previos. CI Android en verde (`955dbed`); falta probar en el móvil.
- **2026-11-23** · Prueba del APK P14-C: los GGUF se importan, pero el chat cierra la app. Se corrigen la fuga del
  modelo, las excepciones C++ y el corte de UTF-8, y se añade la pantalla «Diagnóstico del motor» (rastros en disco,
  señal fatal y `ApplicationExitInfo`) para localizar la causa. 13 pruebas nuevas (`tests/diagnostics.test.ts`).
  CI Android en verde (`1497dda`); APK copiado a `APK IA/apk/`. Pendiente: nueva prueba en el móvil.
