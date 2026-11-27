# Registro de bloques

> Una línea por bloque cerrado, con el SHA del commit. Añadir al final.

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
- **2026-11-25** · CI en verde (`d433b2a`); APK `PyroHorns-0.1.0-F1.5-asistente2-prueba.apk` copiado. Pendiente: móvil.
- **2026-11-25** · Botón Nube implementado; NVIDIA y OpenRouter exigen clave; OpenCode Zen no se replica (uso restringido a OpenCode).
- **2026-11-25** · CI del botón Nube en verde (`b5ff3a0`); APK `PyroHorns-0.1.0-F1.5-nube-prueba.apk` copiado.
- **2026-11-25** · Nemotron 3 Nano 4B descargado y añadido al catálogo local (tests en verde). Pendiente: CI y móvil.
- **2026-11-25** · CI de Nemotron Nano 4B en verde (`0bfab7d`); APK `PyroHorns-0.1.0-F1.5-nano4b-prueba.apk` copiado.
- **2026-11-25** · P23: catálogo de 29 empresas y 191 modelos de la nube, selector agrupado, pantalla de claves para todas. Solo Pollinations funciona sin clave; el resto espera claves del usuario.
- **2026-11-25** · Prueba del asistente y de la nube: el bloque con etiqueta distinta de «accion» (```nota) y el bloque sin ``` (Nemotron Nano) ya se ejecutan; las acciones repetidas cuentan una vez. LFM3 mezcla su razonamiento en la respuesta (pendiente). OpenRouter sin clave avisa bien.
- **2026-11-25** · Asistente: bloques con cualquier etiqueta (nota) y sin cercar (Nemotron Nano) ya se ejecutan; repetidas cuentan una vez. LFM3 mezcla su razonamiento en la respuesta (pendiente). OpenRouter sin clave avisa bien.
- **2026-11-25** · Voz (P25) implementada: whisper.cpp aislado, modelo verificado, doble toque, «sí/no» por voz, lectura en voz alta; planilla con sintaxis y nombres de Home Assistant (CC-BY-4.0). Pendiente: CI y móvil.
- **2026-11-26** · CI de la voz en verde (`61e94a8`): `libpyrohorns_whisper.so` (1,2 MB) exporta solo las funciones JNI; ningún símbolo de ggml sale de la biblioteca. Fuentes de plantillas revisadas: Home Assistant (es, CC-BY-4.0) incorporado; Rhasspy y Rasa sin plantillas en español accesibles.
- **2026-11-26** · Informe de voz del móvil: causas comprobadas en el código (dictado sin corregir, corte a 1,2 s, «[Música]» enviado como mensaje, respuestas vacías, calendario y alarmas sin comprobar, acciones del modelo sin validar). Plan P26 en `PLAN.md` §7; sin código hasta el visto bueno.
- **2026-11-26** · P26 aprobada por el usuario (1b, 2a, 3b, 4a) e implementada: nativo (umbral de voz adaptativo, normalización, vocabulario y filtros de whisper, calendario verificado y en JSON, reloj con confirmación, abrir un día del calendario, contactos para el dictado); TS (`cleanTranscript`, corrección por vocabulario y con el modelo local, validación de acciones, política de Automático, «Oí», respuesta vacía, `completeLocal`); esquema v5 (`messages.heard`). Typecheck, 18 suites de pruebas y bundle Android en verde. CI en verde (`9f0844d`) y APK copiado a `APK IA/apk/PyroHorns-0.1.0-F1.5-voz2-prueba.apk` (+ `.sha256`). Pendiente: móvil.
- **2026-11-26** · Planificación de integraciones (P27–P30), sin código. Datos NLU: MASSIVE 1.0 con es-ES de 16.521 frases, 60 intenciones y licencia CC BY 4.0; SNIPS en inglés; Mycroft con 11 habilidades en español (formatos `.voc`/`.dialog`, no `.intent`); Leon sin español; Dialogflow sin los agentes prometidos. Notas: AppFlowy es AGPL-3.0 y el rol NOTES de Android exige la API 34 (el teléfono tiene Android 12). Archivos: AnExplorer es Apache-2.0 y su README no menciona nubes; SAF primero. IA: la planilla primero, con evaluación sobre MASSIVE. Documento: `docs/integraciones.md`. Quedan por leer en gnu.org las reglas GPL/AGPL (no accesible desde el entorno) y por comprobar en el teléfono los proveedores de SAF.
- **2026-11-26** · Guía de decisiones de P27–P30 (recomendación e impacto de cada opción, dependencias y orden) en `docs/integraciones.md` §9. Datos nuevos verificados: `expo-file-system` 58 ya trae en Android el selector de carpetas con permiso persistente; AppAuth-Android (Apache-2.0), MSAL (MIT) y el SDK de Dropbox (MIT) son libres; PdfBox-Android es Apache-2.0; F-Droid no admite Google Play Services.
- **2026-11-26** · El usuario aprueba P27–P30 con las opciones recomendadas. **P27-F1 hecho:** MASSIVE 1.0 descargado (39.500.415 bytes, SHA-256 `7df623fd…153f8`) en `APK IA/datasets/massive-1.0/`; solo se extrajo es-ES (16.521 frases, 60 intenciones, CC BY 4.0). Evaluador nuevo `scripts/eval-massive.ts` + `.mjs`. Resultado en test: la planilla acierta el 8,7 % de lo que la app hace y solo intercepta el 0,3 % del resto. Hay dos falsos positivos que corregir. El informe con ejemplos queda en local. Siguiente bloque: P28-F1 + P30-1 (diseño en `PLAN.md`); pendiente decidir F27-2.
- **2026-11-26** · Evaluación del plan registrada como P31 y aprobada («todo lo recomendado», M8 aparte). F1.5 cerrada con acta; ESTADO dividido en estado, historial, mediciones y pruebas.
- **2026-11-27** · P31 bloque 1 (`908ba60`, `d7f0607`, `1ff2631`, `fd7b996`): documentación dividida, versión visible, `check-apk.py`, firma de prelanzamiento en la CI (M8-b), acciones al día y ccache (96 % de aciertos; 327–491 s frente a 560 s sin él). Parches #11 y #12 fusionados (`c2bc8c6`, `c397791`). APK `v0.2-p31` comprobado. Pendiente: móvil.
