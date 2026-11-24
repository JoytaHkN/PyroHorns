# Estado de PyroHorns

> Documento vivo para retomar el trabajo desde cualquier agente o entorno. Se actualiza al cerrar
> cada bloque de trabajo (ver `AGENTS.md`).

**Última actualización:** 2026-11-24 · Claude Code en and-code

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
   - **Causa del cierre encontrada (2026-11-24, informe del Diagnóstico):** el motor sí carga LFM3 (modelo ≈ 5,8 s, contexto
     ok, prompt de 15 tokens en 1,06 s) y llega al primer token; entonces `SIGNAL 6` (abort). La traza de Android lo explica:
     `NoSuchMethodError: no non-static method "Lz10;.emit(...)"`. **R8 (minificación del build release) renombra
     `LlamaEventSink.emit` y la clase anónima que lo implementa**, y el JNI lo busca por nombre; la excepción pendiente aborta
     la app. En depuración no ocurriría. Corregido: `consumer-rules.pro` (keep de la interfaz, sus implementaciones y
     `PyroHornsLlamaNative`) y el JNI busca `emit` una sola vez en la interfaz y limpia la excepción si falla. CI Android en verde (`88369c6`) y comprobado en el dex que la
     clase que implementa la interfaz ya conserva su nombre. APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-r8-prueba.apk` (+ `.sha256`).
     **Probado en el móvil (2026-11-24): ✅ el chat responde** con LFM3 (≈ 11,1 tok/s) y Qwen3 (≈ 10,5 tok/s), medidos en
     conjunto (incluye prefill; el «Pensó 16 s / 43 s» incluye cargar el modelo en cada mensaje). Con eso el paso 2 de F1.5 queda
     validado en el móvil. Problemas vistos en las capturas: `<think>` dentro de la burbuja, «Pensó N s» mal medido, tok/s sin
     formato, etiqueta «simuladas» obsoleta y razonamiento con Profundo apagado → **P15** (`PLAN.md` §7), pendiente de decisión.
     Datos para P13: el prompt de 15 tokens tardó 1,06 s (≈ 14 tok/s de prefill), lento por
     compilar ggml-cpu sin dotprod/i8mm; el modelo tardó ≈ 5,8 s en abrirse desde la carpeta de la app.
   - **P15 opción 2 decidida e implementada (2026-11-24), CI Android en verde (`d216048`); ✅ probado en el móvil (2026-11-24)** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-p15-prueba.apk` + `.sha256`)**:** `ThinkSplitter`
     (`src/lib/think-parser.ts`) separa `<think>` del texto aunque la etiqueta llegue partida y `LlamaProvider` lo emite como
     `thinking_delta` (se pliega y no se reenvía); «Pensó N s» mide solo el razonamiento (si no hay, no aparece); tok/s con un
     decimal y calculado solo sobre la generación (sin prefill) en el JNI; etiqueta «en tu dispositivo» / «respuestas simuladas»
     según el motor activo (`src/store/engine.ts`); con **Profundo apagado** y un modelo con razonamiento, el JNI añade
     `<think>\n\n</think>\n\n` tras la plantilla (lo mismo que hace Qwen3 con enable_thinking=false). **Hay que comprobar en el móvil**
     que LFM3 y Qwen3 realmente dejan de razonar con Profundo apagado y que con Profundo encendido el razonamiento sale plegado.
     **Resultado en el móvil:** con Profundo apagado, LFM3 y Qwen3 responden sin razonar (sin «Pensó» ni `<think>`); con Profundo
     encendido sale «Pensó 1 s · ver» plegado y la burbuja solo lleva la respuesta; tok/s con un decimal y etiqueta «en tu
     dispositivo». Observaciones: (1) LFM3 dio **3,0 tok/s en el primer mensaje y 12,6 en el segundo** (hipótesis: caché de archivos
     fría del mmap al cargar el modelo de nuevo; lo debe confirmar P13); Qwen3 ≈ 11,3–11,5 tok/s. (2) Qwen3 con Profundo apagado
     respondió en **portugués** a una pregunta en español (con Profundo encendido, en español): posible efecto del bloque
     `<think>` vacío o del muestreo (temp 0,8, top-k 40, top-p 0,9; Qwen3 recomienda 0,7/20/0,8 sin razonar); a revisar en F2/F3.
     **Opción 3 hecha (2026-11-24), pendiente de CI y de probar en el móvil:** `LlamaProvider` mantiene el modelo cargado entre
     mensajes (se recarga solo si cambia el modelo o el contexto, o tras un error), encola las generaciones (un contexto no admite dos
     a la vez) y expone `unloadLlamaModel()`; el JNI vacía la caché KV y el sampler antes de cada generación. 22 pruebas del proveedor.
     **Qué comprobar:** el segundo mensaje ya no debe tardar unos 6 s en empezar, y las respuestas siguientes deben ser independientes
     (sin restos del mensaje anterior).
   - **Opción 3 de P15: CI Android en verde (`b962fbb`)**, APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-p15-3-prueba.apk` (+ `.sha256`), pendiente de probar
     en el móvil (el segundo mensaje no debe tardar ≈ 6 s en empezar).
   - **P13 implementada (2026-11-24), CI Android en verde (`6456a98`; el primer intento falló porque esta versión de llama.cpp usa `load_mode` y no `use_mmap`; `AUTO` equivale a mmap en CPU), pendiente de ejecutarla en el móvil** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-p13-prueba.apk` + `.sha256`; incluye también la opción 3 de P15): **Ajustes → Prueba de rendimiento**
     (`src/app/benchmark.tsx`). Nativo: `bench(handle, nPrompt, nGen, threads)` (prefill y generación medidos por separado con tokens
     sintéticos, 128 tokens generados), `useMmap` en `loadModel`, `memoryInfo`/`resetPeakMemory` (RSS y pico desde `/proc`) y `keepScreenOn`.
     TypeScript: `src/lib/bench.ts` (matriz, medianas, veredicto contra TTFT < 1,5 s con 1K y ≥ 10 tok/s, informe en Markdown),
     `src/lib/bench-runner.ts` y `src/store/bench.ts` (resultados persistentes y marcador «prueba en curso» para detectar cierres por memoria).
     Decisiones: con y sin mmap, hilos 4/6/8, los cuatro modelos (Cyber y Phi con 4K, LFM3 y Qwen3 con 8K; prompts de 1024 y 7616/3712),
     3 repeticiones, pausa de 3 s entre pruebas, botón «Copiar resultados» (`expo-clipboard`, dependencia nueva). Preajustes: **Rápida**
     (LFM3, 4 hilos, con y sin mmap: 12 pruebas) y **Completa** (144 pruebas, larga). 35 pruebas nuevas (`tests/bench.test.ts`).
     **Cómo ejecutarla:** instalar el APK → Ajustes → Prueba de rendimiento → «Rápida» → Empezar → al terminar, «Copiar resultados» y pegarlos al agente.
     Con la decisión (f): primero se mide con la compilación base; después se prueba `armv8.2-a+dotprod` y se comparan.
   - **Resultados de P13 en el teléfono (HUAWEI LMR-LX9, compilación base armv8-a, preajuste Rápida, 2026-11-24 03:32):**

     | Modelo | mmap | Hilos | Prompt | Carga s | TTFT ms | Prefill tok/s | Gen tok/s | RAM pico MB | Objetivo |
     |---|---|---|---|---|---|---|---|---|---|
     | LFM3 1.7B | sí | 4 | 1024 | 4.4 | 48307 | 21.2 | 13.3 | 1611 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | sí | 4 | 7616 | 4.4 | 449620 | 16.9 | 8.8 | 1623 | gen ✗ |
     | LFM3 1.7B | no | 4 | 1024 | 1.0 | 59188 | 17.3 | 11.2 | 1623 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | no | 4 | 7616 | 1.0 | 448013 | 17.0 | 8.4 | 1623 | gen ✗ |

     **Lectura:** (1) el **prefill es el cuello de botella**: 17–21 tok/s → 48–59 s para un prompt de 1K (objetivo 1,5 s) y ≈ 7,5 min para
     7616 tokens; (2) la **generación cumple a 1K** (13,3 y 11,2 tok/s) pero **no a 7,6K** (8,8 y 8,4); (3) **RAM pico ≈ 1,6 GB**: sin
     problemas de memoria con LFM3 a 8K; (4) **mmap frente a sin mmap**: generación parecida (mmap algo más rápida); la carga (4,4 s frente a
     1,0 s) está **confundida por el orden** (la primera carga es con el archivo «frío» y la segunda con él ya en la caché de Android), así
     que no es concluyente; el 3,0 tok/s del primer mensaje del chat **no se reproduce** (la mediana de 3 repeticiones oculta la primera).
     **CPU del teléfono** (`/proc/cpuinfo`): HiSilicon, 8 núcleos desiguales (4 a 1,6 GHz parte 0xd23, 3 a 2,15 GHz parte 0xd46 y 1 a 2,15 GHz
     parte 0xd05); soporta **asimddp (dotprod), fp16, i8mm, bf16 y sve**. La compilación base no usa dotprod ni fp16: es la causa más probable del
     prefill lento. **Siguiente (decisión f-B, ya aprobada por el usuario):** compilar ggml-cpu con `armv8.2-a+dotprod+fp16`, añadir al informe
     la línea de CPU y de compilación, y comparar. Los datos de la tablet del usuario llegarán después (misma compilación base).
   - **(f)-B hecho (2026-11-24), CI Android en verde (`6f481b0`), pendiente de medir en el teléfono** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-p13-dotprod-prueba.apk` + `.sha256`): `-DGGML_CPU_ARM_ARCH=armv8.2-a+dotprod+fp16` en `modules/pyrohorns-llama/android/build.gradle`
     (`ENGINE_BUILD` en `src/lib/bench.ts` lo refleja) y el informe incluye ahora la línea de **CPU** (núcleos por frecuencia; dotprod/fp16/i8mm/bf16/sve) y la de
     **compilación**. **Riesgo:** en una CPU sin dotprod/fp16 (Cortex-A53/A72/A73 y similares) la app se cae con SIGILL al generar. Este teléfono sí los tiene.
     La tablet del usuario: **no instalar este APK ahí hasta conocer su CPU** (o hacerlo sabiendo que puede cerrarse); la línea de CPU del informe lo dirá. La
     alternativa segura para todos los móviles son variantes con elección en tiempo de ejecución (decisión f-C, F2).
   - Paso 3 (pendiente): comparar abrir el GGUF desde /sdcard con copiarlo al almacenamiento de la app;
     elegir la más rápida.
   - Paso 4 (pendiente): medir TTFT, tok/s y RAM con 1K y 8K de contexto.
   - Sin plan B: directo con el módulo nativo (decisión del usuario).
2. Revisar los PR de Dependabot que quedan: #1–#5 (acciones de GitHub; relanzar su CI, que falló por
   la facturación), #6 uniwind 1.14, y #8 y #10 (esperar al siguiente Expo SDK).

## Pendiente de decisión del usuario
- **(f)** Compilar ggml-cpu con `armv8.2-a+dotprod` (decidido: «base ahora y dotprod después de medir»): pendiente de hacerlo
  cuando haya los primeros resultados de P13.
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
- **2026-11-24** · Informe de Diagnóstico del móvil (HUAWEI LMR-LX9, Android 12): el cierre era un `NoSuchMethodError` por R8
  (renombra `LlamaEventSink.emit`). Se añaden reglas `consumer-rules.pro` y el JNI resuelve `emit` en la interfaz.
  CI en verde (`88369c6`), APK en `APK IA/apk/`. Pendiente: nueva prueba en el móvil.
- **2026-11-24** · El usuario probó el APK con la corrección de R8: el chat responde con LFM3 y Qwen3 (≈ 11 y ≈ 10,5 tok/s en
  conjunto). Paso 2 de F1.5 validado en el móvil. Se registra P15 (pulido del chat real) en `PLAN.md` §7, pendiente de decisión.
- **2026-11-24** · P15 opción 2 (elegida por el usuario): separación de `<think>`, «Pensó» solo del razonamiento, tok/s de generación
  y formateado, etiqueta según el motor, Profundo apagado sin razonamiento (`noThink` hasta el JNI). 19 pruebas nuevas
  (`tests/think-parser.test.ts`, `tests/llama-provider.test.ts`). Typecheck, pruebas y bundle Android en verde. CI en verde (`d216048`), APK en `APK IA/apk/`. Pendiente: móvil.
- **2026-11-24** · El usuario probó el APK de P15-2: Profundo apagado/encendido funciona como se diseñó en LFM3 y Qwen3. Se registran las
  observaciones (3,0 → 12,6 tok/s en LFM3 entre el primer y el segundo mensaje; Qwen3 en portugués con Profundo apagado) y se
  añade la decisión (f) (dotprod/i8mm) a P13.
- **2026-11-24** · El usuario decide P13: (a) B, (b) B, (c) C, (d) B, (f) A ahora y B después de medir; y pide la opción 3 de P15.
  Hecha: modelo cargado entre mensajes, generaciones en cola, KV y sampler vaciados en cada generación; 22 pruebas del proveedor.
  Typecheck, pruebas y bundle Android en verde. Pendiente: CI y móvil; P13 espera confirmación para empezar.
- **2026-11-24** · El usuario confirma que empiece P13. Implementada la pantalla de prueba de rendimiento (nativo: `bench`, `useMmap`,
  memoria, pantalla encendida; TS: matriz, medianas, veredicto, informe, ejecutor y almacén persistente; `expo-clipboard`). 35 pruebas
  nuevas. Typecheck, pruebas y bundle Android en verde. Pendiente: CI y ejecutarla en el móvil.
- **2026-11-24** · CI de P13 en verde (`6456a98`) tras corregir `use_mmap` → `load_mode`; APK en `APK IA/apk/`. Pendiente: ejecutar la prueba
  «Rápida» en el móvil y pegar los resultados.
- **2026-11-24** · Primeros resultados de P13 (teléfono, compilación base): prefill 17–21 tok/s (TTFT 48–59 s con 1K), generación 13,3/11,2 tok/s a 1K
  y 8,8/8,4 a 7,6K, RAM pico ≈ 1,6 GB; CPU con dotprod/fp16/i8mm. Se pasa a la decisión (f)-B (dotprod+fp16).
- **2026-11-24** · (f)-B: ggml-cpu con `armv8.2-a+dotprod+fp16`; el informe de la prueba incluye CPU y compilación (`describeCpu`, `ENGINE_BUILD`; 6 pruebas
  nuevas, 41 en `tests/bench.test.ts`). Typecheck, pruebas y bundle Android en verde. Pendiente: CI y medir en el teléfono.
- **2026-11-24** · CI de (f)-B en verde (`6f481b0`); APK en `APK IA/apk/`. Pendiente: medir con la prueba «Rápida» en el teléfono (con batería) y comparar con la base.
