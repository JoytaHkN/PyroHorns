# Estado de PyroHorns

> Documento vivo para retomar el trabajo desde cualquier agente o entorno. Se actualiza al cerrar
> cada bloque de trabajo (ver `AGENTS.md`).

**Última actualización:** 2026-11-25 · Claude Opus 5.5 en and-code

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
   - **Resultados de P13 en la tablet (HUAWEI TGR-W09, misma compilación base y preajuste Rápida, 2026-11-24 03:40):**

     | Modelo | mmap | Hilos | Prompt | Carga s | TTFT ms | Prefill tok/s | Gen tok/s | RAM pico MB | Objetivo |
     |---|---|---|---|---|---|---|---|---|---|
     | LFM3 1.7B | sí | 4 | 1024 | 6.0 | 49670 | 20.6 | 12.6 | 1550 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | sí | 4 | 7616 | 6.0 | 409055 | 18.6 | 7.8 | 1557 | gen ✗ |
     | LFM3 1.7B | no | 4 | 1024 | 1.1 | 53687 | 19.1 | 11.4 | 1557 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | no | 4 | 7616 | 1.1 | 422740 | 18.0 | 7.7 | 1557 | gen ✗ |

     **Comparación teléfono / tablet:** prácticamente iguales (prefill 17–21 y 18–21 tok/s; generación 13,3/11,2 frente a 12,6/11,4 a 1K y 8,8/8,4 frente
     a 7,8/7,7 a 7,6K; RAM pico ≈ 1,55–1,62 GB). Conclusiones: (1) el resultado es **reproducible**, no ruido de un dispositivo; (2) los dos Huawei rinden igual,
     probablemente con la misma familia de CPU; (3) en los dos, **con mmap la carga es la «fría» (4,4 y 6,0 s) y sin mmap la «caliente» (1,0 y 1,1 s)**: el
     orden de la prueba domina la comparación de carga, y para la generación mmap es 10–15 % más rápido. **Pendiente de saber si la tablet soporta dotprod/fp16**
     (este informe es del APK base y no trae la línea de CPU).
   - **(f)-B hecho (2026-11-24), CI Android en verde (`6f481b0`), pendiente de medir en el teléfono** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-p13-dotprod-prueba.apk` + `.sha256`): `-DGGML_CPU_ARM_ARCH=armv8.2-a+dotprod+fp16` en `modules/pyrohorns-llama/android/build.gradle`
     (`ENGINE_BUILD` en `src/lib/bench.ts` lo refleja) y el informe incluye ahora la línea de **CPU** (núcleos por frecuencia; dotprod/fp16/i8mm/bf16/sve) y la de
     **compilación**. **Riesgo:** en una CPU sin dotprod/fp16 (Cortex-A53/A72/A73 y similares) la app se cae con SIGILL al generar. Este teléfono sí los tiene.
     La tablet del usuario: **no instalar este APK ahí hasta conocer su CPU** (o hacerlo sabiendo que puede cerrarse); la línea de CPU del informe lo dirá. La
     alternativa segura para todos los móviles son variantes con elección en tiempo de ejecución (decisión f-C, F2).
   - **Informe de P13 con condiciones del equipo (2026-11-24), CI Android en verde (`38367c6`), pendiente de medir** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-equipo-prueba.apk` + `.sha256`): antes y después de cada prueba se lee la
     **temperatura de la batería**, el **porcentaje de batería**, el **estado térmico de Android** (`PowerManager`, desde Android 10; 0 normal …
     6 apagado), si hay **cargador** y si está el **ahorro de energía** (`deviceStatus()` nativo, sin permisos). El informe muestra el equipo al
     empezar, las columnas «Temp °C ini→fin», «Batería % ini→fin» y «Térmico máx», y avisos si hubo carga, ahorro de energía o pruebas en caliente
     (batería ≥ 40 °C o térmico moderado o peor). El registro en vivo de cada prueba también los muestra. **Límite:** la temperatura es la de la
     batería, que va por detrás de la del procesador; el estado térmico es el indicador que de verdad limita la CPU.
     **Pendiente de decisión (no implementado):** esperar a que el equipo baje de un umbral antes de cada prueba, y/o descartar las pruebas hechas en caliente.
   - **Resultados con dotprod (2026-11-24, informes completos en el chat del usuario; resumen):**
     - **Teléfono LMR-LX9, 10:11 (cargando, 100 %, 20 °C), LFM3 4 hilos:** prefill **56,5 tok/s** (antes 17–21), generación **18,8** a 1K y 12,9 a 7,6K,
       TTFT 18 s con 1K y 154 s con 7,6K; RAM pico **2646 MB** (antes 1,6 GB).
     - **Teléfono 13:32 (sin cargador, 93 % → 10 %, 34 → 46 °C), preajuste completo:** LFM3: prefill 56,5 / 62,9 / 69,8 tok/s con 4 / 6 / 8 hilos (+24 % con 8),
       generación 18–18,6 a 1K y 12,8–13,2 a 7,6K, sin diferencia con o sin mmap. Qwen3: prefill 52–65, generación 13–14 a 1K y **4–5 a 7,6K**, RAM 3,4 GB.
       CyberSecQwen 4B: prefill 20–21, generación **5,2–5,5**, RAM **5,0 GB**; la prueba se cortó al 10 % de batería (7 de 12 filas del 4B). El estado térmico llegó a
       «crítico» desde ≈ 43 °C y **el rendimiento no bajó de forma visible** (las filas en caliente son iguales a las frías). Se gastó ≈ 83 % de batería.
     - **Tablet TGR-W09, APK base (11:00, completo con 4/6/8 hilos):** los hilos no cambian nada (LFM3 prefill 18–20, gen 11–12; Qwen3 gen 9,2–9,5 a 1K y 2,7–3,1 a 7,6K).
     - **Tablet con dotprod (11:32):** su CPU **sí** tiene dotprod, fp16, i8mm y sve (bf16 no): LFM3 4 hilos prefill **42,8** (antes 20), gen **16,3** a 1K y 9,1 a 7,6K, RAM 2615 MB.
       **Ese informe mezcla filas viejas:** las filas con «-» en temperatura y batería (6 y 8 hilos, Qwen3) son resultados guardados de la ejecución anterior con la compilación base,
       porque el almacén conserva los resultados entre ejecuciones y el informe los agrupa por combinación.
     **Lectura:** (1) dotprod da ≈ 2,5× en prefill y +35–45 % en generación, pero **el TTFT con 1K sigue en 15–32 s frente al objetivo de 1,5 s**: ese objetivo exigiría ≈ 700 tok/s de prefill y
     no es alcanzable con esta CPU; un prompt de chat real (≈ 100 tokens) tardaría ≈ 2 s. (2) La generación cumple ≥ 10 tok/s solo con LFM3 (y Qwen3 a 1K); a 7,6K de contexto Qwen3 cae a 4–5 y el 4B rinde 5.
     (3) La RAM pico subió ≈ 1 GB con dotprod (hipótesis: reempaquetado de pesos `GGML_CPU_REPACK`): el 4B llega a 5 GB. (4) Más hilos solo ayudan al prefill del teléfono.
     **Pendiente de decisión:** reformular el objetivo de TTFT (propuesta: < 2 s con un prompt de ≈ 100 tokens y prefill ≥ 50 tok/s) y arreglar el informe para que no mezcle ejecuciones (etiquetar por compilación y ejecución).
   - **Decisiones del usuario (2026-11-24, tras los resultados con dotprod):** (1) el objetivo de TTFT **se mantiene** en < 1,5 s con 1K (≈ 700 tok/s de prefill) «para probar»;
     la propuesta de reformularlo (< 2 s con ≈ 100 tokens) queda para después; (2) el informe **ya no mezcla ejecuciones** (cada «Empezar» tiene un `runId` y el informe resume solo la última);
     (3) **sin control térmico**: solo el aviso del informe. **Modelo nuevo:** `NVIDIA-Nemotron-3.5-Bolt-E4B-Q4_K_M.gguf` (6,18 GB; el GGUF declara arquitectura **gemma4**,
     42 capas, ventana deslizante de 512, 2 cabezas KV; llama.cpp `dc33e61` la soporta) añadido a `LOCAL_MODELS` como opcional (id `nemotron-bolt-e4b`, contexto 4K, KV 172 KB/token = cota
     superior). Se importa con el selector (copia 6,2 GB) o con «Todo el almacenamiento». Sin probar: plantilla de chat y razonamiento (`thinking: false`). **Preajuste nuevo «Resumen»:**
     los 5 modelos, solo con mmap, 4 y 8 hilos, prompts corto y largo, 1 repetición = **20 ejecuciones** (la completa pasa a 180). CI Android en verde (`af00214`); APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-resumen-prueba.apk` (+ `.sha256`). Pendiente: probar en el móvil.
   - **Nemotron 3.5 Bolt E4B (gemma4) medido en el teléfono (2026-11-24 17:13 y 17:28, dotprod, mmap):** **carga sin problemas** (41 s en frío, 32 s después; 6,2 GB); prefill **27 tok/s con 4 hilos y 34 con 8**;
     generación **5,7–5,9 tok/s** a 1K y 4,9–5,7 a 3,7K; TTFT 31–38 s con 1K; RAM pico **5,8–6,2 GB**. No cumple ningún objetivo y rinde como CyberSecQwen 4B (5,4 tok/s). El informe ya no mezcla ejecuciones
     (la primera dice «hay 99 guardadas»). El usuario cerró la prueba «por un error» (pendiente de saber cuál). Sin probar en el chat: plantilla y razonamiento.
   - **Resumen con «máximo rendimiento» desactivado (teléfono, 2026-11-24 18:36, hilos 6 y 8, 20 mediciones, batería 85 % → 59 %):** LFM3 prefill 63 / 70 tok/s y generación 18–19 (a 1K) y 13,6–13,8 (a 7,6K):
     **idéntico a las medidas anteriores**, así que ese ajuste del teléfono no cambió nada. Qwen3: prefill 58 / 68, gen 14,5 (1K) y 5,3–5,9 (7,6K). CyberSecQwen 4B: gen 6,5–6,8 (1K) y 4,0–4,1 (3,7K); con 6 hilos el prefill se hundió a 10,8 tok/s (TTFT 95 s)
     frente a 25 con 8. Phi-3.5: gen 5,2–6,3 (1K) y 2,1–3,9 (3,7K). Nemotron: prefill 30–33, gen 4,7–6,1 (1K) y 2,4–2,7 (3,7K). **Solo LFM3 (y Qwen3 a 1K) cumple ≥ 10 tok/s; ningún modelo cumple el TTFT.** 17 de 20 mediciones en caliente, sin caída visible.
     **La columna de RAM pico no es fiable en esta ejecución** (6395 MB en todos los modelos, 6720 en Nemotron): el proceso ya tenía memoria retenida de cargas anteriores (el asignador no la devuelve) y el pico se reinicia al valor actual.
     Para medir RAM hay que cerrar la app del todo antes de empezar. Propuesta pendiente: guardar la RSS base antes de cada prueba y mostrar el incremento.
   - **Causa del «error» al cerrar la prueba (2026-11-24, informe del Diagnóstico):** cargar **Nemotron sin mmap** (6,2 GB) → `SIGNAL 6` durante la carga y «proceso matado» (RAM 3,7 GB): sin mmap el archivo entero
     debe caber en RAM y no cabe. Corregido: la prueba **omite** las cargas sin mmap que no cumplen la regla de memoria (80 % de la RAM libre) y lo anota en el registro. También se vio que la columna
     «RAM pico» salía **constante (6395 MB)** porque el sistema no deja reiniciar el pico del proceso: ahora, si no se puede reiniciar, se usa la RAM actual. El resumen con «máximo rendimiento
     desactivado» (18:36, 6 y 8 hilos) dio lo mismo que antes: LFM3 prefill 63–70 y gen 18–19; Qwen3 gen 14,5 (1K) y 5–6 (7,6K); 4B, Phi y Nemotron 2–7 tok/s. Chat con Nemotron (3 mensajes): responde, plantilla aplicada.
     CI Android en verde (`21a95be`); APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-memoria-prueba.apk` (+ `.sha256`). Pendiente: repetir con el APK nuevo.
   - **Nemotron sin respuesta en el chat y selector de agente que no se desplaza (2026-11-24, capturas del usuario):** (1) el rastro del Diagnóstico mostraba «plantilla aplicada (22 bytes)» y «fin (1 tokens)»: el GGUF
     (arquitectura **gemma4**) trae una plantilla **Jinja** que `llama_chat_apply_template` no reconoce, así que el modelo recibía el texto crudo y terminaba al instante (en LM Playground va bien porque usa Jinja).
     Corregido en el JNI: si la plantilla contiene `<|turn>` y `<turn|>` se usa el formato de Gemma 4 (`<|turn>user\n…<turn|>\n<|turn>model\n`, el BOS lo añade el tokenizador; `<turn|>` ya es fin de generación en
     llama.cpp `dc33e61`); si una plantilla no se reconoce, el rastro lo anota. Es un parche por arquitectura: la solución general es un motor Jinja (F2). (2) El selector de agente usaba un `ScrollView` de 480 px fijos: ahora
     el de gesture-handler, con altura según la pantalla. CI Android en verde (`976e0f4`); APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-nemotron-prueba.apk` (+ `.sha256`). Pendiente: probar ambos en el móvil.
   - **Nemotron responde en el chat (2026-11-24, capturas):** 6,3–6,5 tok/s (generación), selector de agente ya se desplaza. **El usuario pide acelerar todos los GGUF** porque Nemotron en LM Playground, en el mismo teléfono, va mucho más rápido.
     **Investigación (código de LMPlayground, `andriydruk/LMPlayground`):** el LLM va **solo en CPU** (Vulkan solo para visión); su velocidad viene de compilar ggml con `GGML_BACKEND_DL=ON` + `GGML_CPU_ALL_VARIANTS=ON`
     (una biblioteca `libggml-cpu-<variante>.so` por nivel de CPU: NEON, dotprod, fp16, **i8mm**, SVE, SME…, elegida en ejecución), KleidiAI y **6 hilos** (núcleos − 2); nosotros teníamos una sola compilación fija
     `armv8.2-a+dotprod+fp16` (sin i8mm) y 4 hilos. **Implementado (pendiente de CI y de medir):** `-DBUILD_SHARED_LIBS=ON -DGGML_BACKEND_DL=ON -DGGML_CPU_ALL_VARIANTS=ON` (quita `GGML_CPU_ARM_ARCH`; en Android ggml
     ofrece `android_armv8.0_1 … android_armv8.6_1 (dotprod+fp16+i8mm) … android_armv9.x`), `ggml_backend_load_all_from_path(nativeLibraryDir)` al iniciar, plugin `plugins/with-legacy-packaging.js` (`expo.useLegacyPackaging=true`
     para que las bibliotecas estén extraídas), 6 hilos por defecto en el chat, y el rastro del Diagnóstico muestra los dispositivos y `llama_print_system_info()` (qué variante se eligió). Esto además **resuelve la decisión (f)-C**:
     ya no hay riesgo de SIGILL en CPUs sin dotprod, así que el APK es seguro en cualquier móvil arm64. **No incluido (por riesgo/tiempo):** KleidiAI (ayuda sobre todo a Q4_0, no a Q4_K_M) y GPU Vulkan.
     CI Android en verde (`bfd4287`); el APK incluye `libggml-cpu-android_armv8.0_1 / 8.2_1 / 8.2_2 / 8.6_1 / 9.0_1 / 9.2_1 / 9.2_2.so` (28 MB); APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-variantes-prueba.apk` (+ `.sha256`). **Qué comprobar:** el chat con Nemotron y LFM3 debe ir más rápido, y Ajustes → Diagnóstico del motor debe mostrar «sistema: … MATMUL_INT8 = 1 …». Si la app no arranca o falla la carga del motor, el rastro lo dirá.
   - **P16 (2026-11-24), CI en verde (`edf3993`), pendiente de probar en el móvil** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-p16-prueba.apk` + `.sha256`). El usuario aprobó, si ssd-llm no aportaba mejora: B → D → A → C y carga
     al abrir el chat (opción 1). **ssd-llm (`quantumnic/ssd-llm`) analizado sin ejecutarlo y descartado:** su cargador de capas no soporta pesos `Q4_K`
     (los rellena con ceros), su propio BENCHMARKS.md estima 9,2 tok/s frente a 156,6 de llama.cpp, la prueba de 70B no está hecha y la aceleración es solo Metal.
     **Fallos corregidos:** al motor solo le llegaba el último mensaje (sin memoria), no había instrucción de sistema y la respuesta se cortaba a 512 tokens.
     **Hecho:** (B) instrucción de sistema (`src/lib/system-prompt.ts`) y tope de 2048; (D) `preloadLlamaModel` al abrir el chat o cambiar de modelo, con aviso
     «Cargando modelo…»; (A) compartir, copiar, 👍/👎 (columna `feedback`, esquema v2) y ⋮ (Regenerar, solo en la última respuesta; Ramificar), con
     «N tokens · N s · N tok/s»; (C) historial completo y reutilización de la caché KV (el rastro dice «N ya en memoria»; si el modelo no permite recortarla, se
     procesa todo). Semilla del muestreo aleatoria para que Regenerar cambie la respuesta.
     **Qué comprobar:** recuerda lo dicho antes; respuestas cortas; los botones; el segundo mensaje de una conversación y el Diagnóstico («ya en memoria» en LFM3 y Nemotron).
   - **Botón de copiar en los mensajes del usuario (2026-11-25), CI en verde (`f18489f`), pendiente de probar** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-copiar-prueba.apk` + `.sha256`; incluye P16).
   - **P17 (`PLAN.md` §7), pendiente de visto bueno, sin código:** dos sesiones propusieron a la vez; quedan unidas en una sola propuesta. Se añade la pieza 0 (tabla
     `per_layer_token_embd` de Nemotron bajo demanda). ssd-llm reverificado: convierte cada capa a f32 y `Q4_K` queda en ceros; sus rutas cuantizadas no se llaman.
   - **Prueba en el móvil del APK con P16 (2026-11-25, capturas y Diagnóstico):** la memoria funciona (131/149, 201/221 y 367/408 tokens reutilizados; el modelo
     recuerda el teléfono), botones y métricas visibles. LFM3 16,4–19 tok/s. Fallos: (1) el 3.er turno de una conversación reprocesó los 776 tokens (11,5 s);
     hipótesis: volver a tokenizar una respuesta larga da otros tokens y la memoria híbrida no se puede recortar; (2) los `###` se veían en crudo;
     (3) LFM3 inventó datos históricos graves; su GGUF recomienda temp 0,1, top-k 50 y penalización 1,1, y la app usa 0,8/40/0,9 (pendiente de decisión).
     Carga de Nemotron en el chat: 39 s (referencia antes de P17-0). Android mató la app el 25-11 00:24 con 3,6 GB de RAM (estado 9).
   - **P17-0 y arreglos (2026-11-25), CI en verde (`df37523`), pendiente de probar en el móvil** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-tabla-prueba.apk` + `.sha256`): `lazy_mode = LLAMA_LAZY_MODE_ON` (el Diagnóstico anota «lazy read enabled»), prompt
     comparado por texto con lo que hay en memoria (solo se tokeniza lo nuevo; el rastro anota «coinciden N de M») y títulos `#` en las respuestas.
   - **Prueba en el móvil de P17-0 (2026-11-25, Diagnóstico y capturas):** «lazy read enabled» (2856 MiB). Carga de Nemotron **28,7 s frente a 39,2 s** (una medida de
     cada; condiciones no idénticas). Generación 5,9–6,2 tok/s (antes 6,3): sin cambio. RAM sin medir. Memoria de conversación con Nemotron correcta en 4 turnos
     seguidos (131/157, 219/248, 269/310, 351/408). Primer turno: 90 tokens en 3,4 s. **Sin probar:** el arreglo de reutilización con LFM3 y los títulos.
     Fallo visto: `*cursiva*` con un asterisco se ve en crudo. Nemotron inventó datos sobre sus «predecesores» (el GGUF solo trae nombre, gemma4 y 7,5B).
   - **Pruebas del 2026-11-25 (LFM3):** el arreglo de memoria funciona (840 de 959 tokens reutilizados). Nemotron cargó en 21 s en frío (antes 28,7 y 39,2: varía).
     LFM3 se alargó hasta el tope de 2048 tokens (148 s) y escribió código incorrecto. Cambiar de modelo durante una carga obliga a esperar a que termine.
   - **El usuario aprobó A, 2, B y C (2026-11-25); implementados (`7a7b3b8`), pendiente de CI y móvil:** (A) `readAhead` lee el GGUF en bloques de 8 MiB antes de
     mapearlo, saltando la tabla por capas (rastro «MiB leídos en bloques en N ms»); (2) `warm`: la instrucción se procesa tras la carga anticipada (rastro
     «warm: …»); (B) muestreo según `general.sampling.*` (LFM3 temp 0,1 / top-k 50 / penalización 1,1; CyberSecQwen 0,7/20/0,8; Nemotron 1,0/64/0,95; Qwen3 y Phi
     sin cambios), y se quita un segundo `accept` del sampler; (C) `*cursiva*`. **Comparar:** carga de Nemotron (21–39 s antes) y primer mensaje (87–90 tokens).
   - **P18 internet (2026-11-25), CI en verde (`430c5a4`), pendiente de móvil** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-internet-prueba.apk` + `.sha256`; incluye A, 2, B y C): el usuario eligió botón por mensaje y solo DuckDuckGo (`PLAN.md` §7). **Comprobar en el móvil si
     DuckDuckGo responde o bloquea**; el análisis de la página solo está probado con HTML de ejemplo.
   - **S18-B (2026-11-25), elegida por el usuario e implementada:** los resultados de internet llevan la petición de no seguir instrucciones que contengan. CI en verde (`ca7ac5f`), pendiente de móvil (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-internet-b-prueba.apk` + `.sha256`).
   - **Prueba en el móvil del APK de internet (2026-11-25, capturas y Diagnóstico):** **DuckDuckGo responde** y salen las fuentes. Carga: Nemotron **14,2 s** (antes
     21–39; leer 3038 MiB: 2,6 s; quedan ≈ 11 s que no son lectura), LFM3 2,5 s (antes 3,7). `warm`: 1,0 s (LFM3) y 2,6 s (Nemotron); primer mensaje de Nemotron
     1,0 s de procesamiento (antes 3,4). Muestreo del GGUF aplicado. Generación sin cambios claros (LFM3 16–17, Nemotron 5,6–6,1 tok/s).
     **Fallos:** Nemotron dice que no puede buscar en internet aun con resultados (la instrucción dice «sin nube»); un mensaje largo con erratas como consulta dio
     enlaces inútiles (google.com, traductor); LFM3 leyó mal los resultados (p. ej. Allende «detenido»); las fórmulas `$…$` se ven en crudo; los bloques de código no
     tienen botón de copiar. Propuestas pendientes de visto bueno.
   - **Arreglos 1, 4 y 2 aprobados (2026-11-25), CI en verde (`b1bfd51`), pendientes de móvil** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-arreglos-prueba.apk` + `.sha256`): (1) los resultados dicen que sí tiene acceso y la instrucción de sistema menciona el
     botón del globo; (4) «Copiar código» en cada bloque; (2) los mensajes de más de 8 palabras o que remiten al anterior se convierten en una consulta corta con el
     modelo cargado (`complete` nativo: guarda la memoria del chat, genera hasta 32 tokens y la restaura; rastro «complete: …»), y se muestra «Se buscó en
     DuckDuckGo: «…»». **Comprobar en el móvil** que restaurar la memoria no cierra la app con LFM3 y Nemotron y que el turno siguiente la reutiliza.
     Quedan 3 (fórmulas) y 5 (los 11 s de carga).
   - **Modelos de NVIDIA para el móvil (investigación del 2026-11-25, a petición del usuario, sin integrar):** el GGUF de Nemotron 3.5 Bolt E4B es el oficial
     (6,18 GB, español incluido, temp 1,0 / top-p 0,95, OpenMDW-1.1); tiene borrador DFlash oficial (`…E4B-4GB-DFlash`) y el llama.cpp vendimizado trae `dflash`.
     Nemotron 3 Nano 4B (2,84 GB) solo declara inglés y código. Voz: Nemotron 3.5 ASR Streaming 0,6B (español, NeMo-Speech.cpp; sin Android oficial) y Magpie TTS
     364M (español; sin indicios de uso en móvil). Imagen: SANA no figura en stable-diffusion.cpp (que sí admite SD 1.5 / SD-Turbo, no de NVIDIA).
   - **GGUF nuevos en `APK IA/` (2026-11-25, solo metadatos, sin probar; no están en `LOCAL_MODELS`, así que la app aún no puede elegirlos):**
     candidatos: `Qwen3-VL-4B-…-Q4_K` (2,49 GB, `qwen3vl`, ChatML, muestreo 0,7/20/0,8), `MiniCPM-V-4.7-1B-AD-Q4_K_M` (0,67 GB, `qwen35`) y
     `NVIDIA-…-E4B-Uncensored-AD` (5,06 GB, `gemma4`, tabla por capas 1,59 GB en IQ4_NL). Con reservas: los dos `Llama-3.1-Nemotron-Nano-8B-v1` (el mismo modelo
     dos veces, 4,92 GB, declara solo inglés; con el reempaquetado podría necesitar ≈ 9–10 GB de RAM), `Cosmos3-Nano-VLM` (5,03 GB, visión/robótica), `Qwen3-VL Q6_K`
     (3,68 GB, más lento). No sirven hoy: `Dory1.0-4B` (arquitectura `dory` no soportada por llama.cpp `dc33e61`), los dos `Qwen3.8-27B-Draft` (borradores de un
     27B que no está) y el LoRA `Ternary-Bonsai` (adaptador sin modelo base; la app no admite LoRA). Ningún modelo de visión trae `mmproj`: solo texto.
   - **P19 (2026-11-25), pendiente de CI y móvil:** 12 GGUF nuevos en `models.ts` (secciones Chat / Visión / Complementos; ninguno genera imagen ni video),
     enlaces `mmproj` (Qwen3-VL, MiniCPM, Gemma 4; Cosmos: no encontrado; la app aún no admite imágenes), agente en la nube (`src/providers/cloud.ts`, pantalla
     «Agente en la nube», claves en SecureStore; `nvidia/nemotron-3-ultra-550b-a55b`, `moonshotai/kimi-k3.1-pro`, `z-ai/glm-5.3-flash`,
     `nvidia/nemotron-3-ultra-550b-a55b:free`; **sin probar con una clave real**, y las condiciones de la prueba gratuita de NVIDIA no se pudieron leer) y
     respuestas que se tocan (bloque ```opciones o pregunta + lista). La instrucción de sistema cambió.
   - **P20 punto 1 (2026-11-25), CI en verde (`1fdcd19`), pendiente de móvil** (APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-asistente-prueba.apk` + `.sha256`; incluye P19 y Dory): `src/lib/assistant/` (instrucciones solo cuando el mensaje pide anotar/agendar; bloques ```accion),
     tabla `items` (esquema v4), pantalla «Notas y tareas», modo Automático/Toque/Apagado en Ajustes, y nativo para calendario (permiso al primer evento, aviso 10 min
     antes) y reloj. **Comprobar en el móvil** si LFM3 y los demás respetan el formato, y que exista un calendario con escritura.
   - **Prueba del asistente en el móvil (2026-11-25, capturas):** LFM3 escribe bloques con la primera línea «alarma» o «tarea» y sin «tipo:» (ahora se aceptan); la aclaración
     «¿qué texto?» perdía las instrucciones (corregido); el modelo inventó «ya existe una alarma a las 15:00» (corregido con una instrucción). Nemotron sin restricciones
     escribió bien el formato. Un bloque no entendido ya no se muestra como código. **Por comprobar:** si se creó el evento, la alarma y la tarea del mensaje anterior.
   -    - Paso 3 ✅ (medido con P13, teléfono y tablet, compilación base): mmap frente a sin mmap. La generación es 10–15 % más rápida con mmap;
     la carga no es comparable por el orden de la prueba (ver lectura en esta sección). Abrir desde `/sdcard` no se ha comparado todavía
     con copiar a la app: la app copia (vía B) en las pruebas de P13 — pendiente si se quiere medir la diferencia.
   - Paso 4 ✅ (medido con P13): TTFT, tok/s y RAM con 1K y 7,6K de contexto; no cumple el objetivo de TTFT ni la generación a 7,6K.
     Pendiente: medir con `dotprod` y con batería, y decidir el control térmico (ver abajo).
   - Sin plan B: directo con el módulo nativo (decisión del usuario).
2. Revisar los PR de Dependabot que quedan: #1–#5 (acciones de GitHub; relanzar su CI, que falló por
   la facturación), #6 uniwind 1.14, y #8 y #10 (esperar al siguiente Expo SDK).

## Pendiente de decisión del usuario
- **P17 — Método Brasa** (`PLAN.md` §7): aprobar el orden (0 + 1 → 2 + 3 → 4 → 5), elegir la seguridad de la memoria guardada (A sin cifrar / B cifrada /
  C no guardar) y si se descarga LFM2.5-8B-A1B (≈ 5 GB) para probar un MoE. Medidas del almacenamiento del teléfono en la misma entrada.
- **Medir con `dotprod` (f-B):** el APK `PyroHorns-0.1.0-F1.5-p13-dotprod-prueba.apk` está en CI (`6f481b0`); falta la prueba Rápida en el teléfono con batería.
  La tablet solo si se confirma que tiene dotprod y fp16 (la línea de CPU del informe lo dirá).
- **Control térmico de P13 (no implementado):** (1) esperar a que el equipo baje de un umbral antes de cada prueba (propuesta: 35 °C);
  (2) descartar o separar las pruebas hechas en caliente. Recomendación: 1, y 2 como respaldo.
- **Revisar en F2/F3:** Qwen3 respondió en portugués con Profundo apagado (`PLAN.md` §7, P15).
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
- **2026-11-24** · Resultados de P13 en la tablet (HUAWEI TGR-W09, base): casi idénticos a los del teléfono (prefill 18–21 tok/s, generación 12,6/11,4 a 1K y 7,8/7,7 a 7,6K,
  RAM ≈ 1,55 GB). Resultado reproducible; falta medir con dotprod y conocer la CPU de la tablet.
- **2026-11-24** · Informe de P13 con temperatura, batería, estado térmico y ahorro de energía antes y después de cada prueba (nativo `deviceStatus`,
  `parseDeviceStatus`, `conditionsOf`, avisos en el informe). 17 pruebas nuevas (58 en `tests/bench.test.ts`). Typecheck, pruebas y bundle Android en verde.
  Pendiente: CI y medir con batería.
- **2026-11-24** · CI del informe con condiciones del equipo en verde (`38367c6`); APK en `APK IA/apk/`. Pendiente: medir con batería.
- **2026-11-24** · Resultados con dotprod en teléfono (completo, 93 % → 10 % de batería) y tablet (que sí soporta dotprod): prefill ≈ 2,5× más rápido, TTFT con 1K sigue lejos de 1,5 s,
  RAM pico +1 GB. Detectado que el informe mezcla resultados de ejecuciones anteriores. Pendiente: reformular el objetivo de TTFT y separar ejecuciones.
- **2026-11-24** · Decisiones tras los resultados con dotprod (objetivo de TTFT sin cambios, informe sin mezclar ejecuciones, sin control térmico). Modelo Nemotron 3.5 Bolt E4B
  (gemma4) habilitado; preajuste «Resumen» (20 ejecuciones). 10 pruebas nuevas. Typecheck, pruebas y bundle Android en verde. Pendiente: CI y probar.
- **2026-11-24** · Resumen con máximo rendimiento desactivado: mismos resultados que antes; RAM pico no fiable (memoria retenida del proceso); solo LFM3 y Qwen3 (1K) cumplen ≥ 10 tok/s.
- **2026-11-24** · Informe del Diagnóstico: el cierre era Nemotron sin mmap (no cabe en RAM). La prueba omite cargas sin mmap que no caben y usa la RAM actual si no puede reiniciar el pico. 4 pruebas nuevas. Pendiente: CI.
- **2026-11-24** · Nemotron no respondía en el chat (plantilla Jinja de gemma4 no reconocida → texto crudo): formato de turnos de Gemma 4 en el JNI. Selector de agente con desplazamiento (ScrollView de gesture-handler). Pendiente: CI y móvil.
- **2026-11-24** · Aceleración general: ggml-cpu como variantes elegidas en ejecución (BACKEND_DL + ALL_VARIANTS, con i8mm), bibliotecas extraídas (plugin), 6 hilos y rastro con la CPU elegida. Pendiente: CI y medir.
- **2026-11-24** · ssd-llm descartado. P16: instrucción de sistema, carga anticipada, acciones bajo las respuestas y memoria de conversación. Typecheck, pruebas y bundle Android en verde. Pendiente: CI y móvil.
- **2026-11-24** · CI de P16 en verde (`edf3993`); APK copiado a `APK IA/apk/`. Pendiente: móvil.
- **2026-11-25** · ssd-llm y Colibrì analizados; medido el almacenamiento del teléfono (mmap por fallos de página ≈ 0,2 GB/s frente a 1,1–1,4 GB/s en bloques grandes). Propuesta P17 (Método Brasa), pendiente de decisión.
- **2026-11-25** · Botón de copiar en mensajes del usuario (CI verde, APK copiado). Análisis de streaming desde almacenamiento: la tabla de Nemotron bajo demanda se une a P17 como pieza 0.
- **2026-11-25** · Resultados de P16 en el móvil. Tabla de Nemotron bajo demanda (P17-0), reutilización de memoria por texto y títulos en las respuestas. Typecheck, pruebas y bundle Android en verde. Pendiente: CI y móvil.
- **2026-11-25** · CI de P17-0 en verde (`df37523`); APK copiado a `APK IA/apk/`. Pendiente: móvil y decidir 2, A (carga en bloques grandes) y B (muestreo recomendado).
- **2026-11-25** · P17-0 probada: carga de Nemotron 39 → 29 s, tok/s iguales, memoria correcta. Registrada P18 (internet). Pendiente: decidir 2, A, B, cursivas y P18.
- **2026-11-25** · A, 2, B y cursiva implementados (typecheck, pruebas y bundle en verde). Revisados los repositorios clonados y medidos tres buscadores sin clave (P18).
- **2026-11-25** · P18: botón de internet con DuckDuckGo. Typecheck, pruebas y bundle Android en verde. Pendiente: CI y móvil.
- **2026-11-25** · CI de P18 en verde (`430c5a4`); APK copiado a `APK IA/apk/`. Pendiente: móvil y decidir la protección frente a instrucciones en páginas.
- **2026-11-25** · S18-B implementada. Pendiente: CI y móvil.
- **2026-11-25** · Internet, carga en bloques e instrucción por adelantado probados en el móvil: todo funciona; anotados fallos y propuestas.
- **2026-11-25** · CI de S18-B en verde (`ca7ac5f`); APK copiado a `APK IA/apk/`.
- **2026-11-25** · Arreglos 1, 4 y 2 implementados (typecheck, pruebas y bundle en verde); investigados los modelos de NVIDIA para el móvil. Pendiente: CI y móvil.
- **2026-11-25** · CI de los arreglos 1, 4 y 2 en verde; APK copiado. Revisados los metadatos de 13 GGUF nuevos.
- **2026-11-25** · P19: modelos nuevos, nube y opciones táctiles (typecheck, pruebas y bundles en verde). Pendiente: CI y móvil.
- **2026-11-25** · Primer parche de Dory no compilaba (`graph_nodes_per_tensor`), corregido (`716a283`). Asistente (P20-1): typecheck, pruebas y bundle en verde.
- **2026-11-25** · Compilación de Android en verde con el parche de Dory corregido (`716a283`); APK en `APK IA/apk/PyroHorns-0.1.0-F1.5-modelos-prueba.apk` (+ `.sha256`). Pendiente: probar Dory en el móvil.
- **2026-11-25** · CI del asistente en verde; APK copiado con permisos de calendario y alarma comprobados. Pendiente: móvil y que el usuario elija los accesos siguientes.
- **2026-11-25** · Registradas P21 (accesos y voz) y P22 (conexiones); comprobado que and-code/OpenCode admiten NVIDIA sin variante. Sin código; pendiente de confirmación.
- **2026-11-25** · Prueba del asistente: tres fallos corregidos (formato sin «tipo:», aclaraciones, estado inventado). NVIDIA bloqueado para esta cuenta. Decisiones de P21 registradas.
