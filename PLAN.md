# PLAN — PyroHorns

> **Versión 2.5** · 2026-11-26 (añade P27–P30: datos NLU, notas y agenda, archivos y nubes, integración con la IA; ver `docs/integraciones.md`)
> Estado: F1 implementada (commit `c8234c0`). Todas las decisiones cerradas (D1–D8, S1–S19 y las dos dudas de seguridad). **F1 y F1.1 cerradas**: primer APK compilado por GitHub Actions y **probado por el usuario en el móvil: todo OK** (2026-11-23). Versión de prueba firmada `v0.1.0-alpha.1` publicada. **F1.5 en curso** (visto bueno del usuario, 2026-11-23). Siguen pendientes las propuestas de diseño (sección 7).
> Proyecto: `/sdcard/IA/Proyectos/APK IA/`. El código está en `PyroHorns/` (repo git). Este plan vive en el repo (`PyroHorns/PLAN.md`), con una copia idéntica en la carpeta del proyecto.

## 1. Decisiones tomadas

| # | Decisión (2026-11-23) |
|---|---|
| D1 | Nuevo reparto de modelos: LFM3 principal, Qwen3-1.7B para código, CyberSecQwen solo en los modos Cyber, Phi-3.5 opcional. Los niveles Fire Lite/Pro/Max se sustituyen por "el modo elige el modelo" + interruptor **Profundo** |
| D2 | Código propio escrito desde cero. Referencias principales: **and-code** y **LMPlayground** (ambos MIT). Nombre de la app: **PyroHorns** |
| D3 | Distribución: **GitHub Releases + F-Droid** |
| D4 | PWA: **visor online** |
| D5 | Compilación y publicación: **GitHub Actions** |
| D6 | Licencia: **GPL-3.0** |
| D7 | GitHub: usuario **JoytaHkN**, repo **PyroHorns** → identificador de app `io.github.joytahkn.pyrohorns` |
| D8 | Todo el desarrollo vive en el proyecto **APK IA** |
| D9 | Los permisos que declara el APK se mantienen todos, aunque algunos aún no se usen |

## 2. Contexto rector

| Aspecto | Decisión |
|---|---|
| Stack | React Native (Expo SDK 58, expo-router, TypeScript estricto) + heroui-native 1.1 + Uniwind/Tailwind v4 |
| Plataformas | Android arm64-v8a (principal) · PWA visor online |
| Identidad | PyroHorns · `io.github.joytahkn.pyrohorns` (en minúsculas: GitHub no distingue mayúsculas en los usuarios y es la convención de Android) · enlaces `pyrohorns://` |
| Repositorio | `https://github.com/JoytaHkN/PyroHorns` · PWA en `https://joytahkn.github.io/PyroHorns/` |
| Licencia | GPL-3.0 (SPDX `GPL-3.0-only`) |
| Diseño | Paleta Plasma, iconos de trazo redondeado, mascota Ibex (cuernos que terminan en chispa), temas oscuro y claro |
| Dispositivo de referencia | Tu móvil: 12 GB de RAM (≈ 4 GB libres con and-code abierto), 8 núcleos, arm64 |

### Entorno de trabajo (D8)
- **Código y git:** `APK IA/PyroHorns`. Git está configurado para `/sdcard` (`core.createObject = rename` y excepción de propietario), y una prueba de commits salió limpia.
- **Dependencias:** `node_modules` no puede vivir en `/sdcard`, porque ese almacenamiento no admite enlaces simbólicos. Por eso `/workspace/pyrohorns-build` se usa solo como caché: es una copia sincronizada desde APK IA para instalar dependencias, comprobar tipos y pasar pruebas. Nunca se edita ahí y se puede borrar.
- **APK:** se compila en GitHub Actions.
- **Modelos GGUF y mockup:** en la raíz de `APK IA`, fuera del repo.

### Cómo se usan las referencias (D2, D6)

| Repo | Licencia | Qué se toma |
|---|---|---|
| and-code | MIT | Runtime proot con su cargador y empaquetado de binarios (`useLegacyPackaging = true`, targetSdk 35); paquetes de Termux fijados por huella (`termux_assets.lock.json`); lanzamiento de CLIs (OpenCode, Claude Code, Codex, Antigravity); modos de permiso por sesión; skills `SKILL.md`; navegación (agentes, proyectos, recientes) |
| LMPlayground | MIT | Binding JNI de llama.cpp, descarga y generación en segundo plano, caché KV y sampler |
| termux-app | GPL-3 / Apache-2.0 | Terminal (`terminal-emulator`, `terminal-view`) y, con D6, partes de la app (sesiones, teclas extra), conservando su aviso de copyright |
| proot-distro | GPL-3 | Referencia para instalar y lanzar distros (Debian, Ubuntu, Alpine) |
| Agora | GPL-3 | Solo ideas de producto (ramas, compactado de contexto). No se copia código, assets ni servidores |

El código copiado de terceros conserva su aviso en `THIRD_PARTY_NOTICES.md`. El código de F1 ya está escrito desde cero (no copia nada de Agora): se conserva y solo se renombra.

## 3. Modelos (D1)

| Modelo | Rol | Modos | Contexto por defecto | RAM aprox. |
|---|---|---|---|---|
| LFM3-1.7B | **Principal** | General, Planificación, Investigación, Diversión, Automatización · títulos y resúmenes | 8K | 1,5 GB |
| Qwen3-1.7B | Código | Programación, Construcción, Depuración | 8K | 2,5 GB |
| CyberSecQwen-4B | Especialista | Red Cyber, Blue Cyber | 4K | 3,3 GB |
| Phi-3.5-mini | Opcional (no incluido por defecto) | Solo por elección manual | 4K, caché KV en q8_0 | ≈ 3,4 GB |

Reglas:
- **Profundo** (interruptor en el composer): activa el razonamiento (LFM3 y Qwen3) y amplía el contexto si cabe. La elección manual de modelo queda en "Avanzado".
- El modelo se elige al empezar la conversación según el modo; no se cambia de modelo en cada mensaje. Solo hay un modelo cargado a la vez.
- Memoria: un modelo se carga si `pesos + contexto × KB por token + 0,4 GB ≤ 80 % de la RAM libre`. KB por token: LFM3 12 · Qwen3-1.7B 112 · CyberSecQwen 144 · Phi-3.5 384. Si no cabe, se reduce el contexto; si aun así no cabe, se ofrece LFM3.
- Parámetros de generación por defecto: los del propio GGUF (`general.sampling.*`), ajustables por modo.
- El razonamiento se muestra plegado y no se reenvía en el historial.
- Al llegar al 80 % del contexto, LFM3 resume la conversación (compactado).
- CyberSecQwen trata las instrucciones de sistema como mensajes del usuario y no admite herramientas. Se probará la plantilla oficial de Qwen3-4B-Instruct-2507; si no funciona, irá sin herramientas. Solo declara inglés, así que hay que probar su calidad en español.
- F4 añadirá dos modelos: uno de embeddings multilingüe (RAG) y uno de visión pequeño.

## 4. Seguridad — definida contigo (2026-11-23)

Solo se aplican estas medidas. Ninguna otra.

| # | Decisión | Qué implica | Fase |
|---|---|---|---|
| S1 | **B** · Aceptar ediciones por defecto | El agente edita y ejecuta en su carpeta de trabajo sin preguntar. En cada conversación se puede elegir entre los 4 modos de and-code: Solo plan, Preguntar cada vez, Aceptar ediciones y Acceso total | F3 |
| S2 | **B** | Al crear cada automatización eliges qué herramientas puede usar | F6 |
| S3 | **A y B seleccionables** | En Ajustes, el acceso a archivos del agente puede ser "Todo el almacenamiento" (al elegirlo se pide el permiso de acceso a todos los archivos) o "Carpeta de trabajo + carpetas añadidas". **Por defecto B**, que no pide permisos (confirmado) | F2 / F5 |
| S4 | **A** | El contenido externo se trata como cualquier otro texto | — |
| S5 | **B** | Claves de API en el almacén seguro de Android (expo-secure-store) | F6 |
| S6 | **C** | PWA: casilla "recordar en este navegador" | F6 |
| S7 | **B** | Conversaciones en una base de datos cifrada (SQLCipher), con la clave en el almacén seguro | F1.1 |
| S8 | **A** + contraseña de copia | Las copias de seguridad de Android incluyen todo. Para que se puedan restaurar, la clave de la base de datos viaja protegida con tu contraseña de copia (ver abajo) | F1.1 |
| S9 | **B** | Registros técnicos sin conversaciones ni claves; sin telemetría | F1.1 |
| S10 | **B** | Imágenes remotas solo al tocarlas; enlaces directos; el HTML se muestra como texto. Los enlaces `javascript:` y `data:` también se muestran como texto (confirmado el 2026-11-23) | F1.1 |
| S11 | **B** | Lo que llega desde otras apps o por enlaces `pyrohorns://` aparece en el cuadro de texto y tú pulsas enviar | F3 |
| S12 | **B** modelos · **C** Linux y CLIs | Modelos: se comprueba su huella y, si no coincide, se cargan con la etiqueta "no verificado". Linux, Termux y CLIs: huellas fijadas en un archivo de bloqueo; lo que no coincida no se instala | F2 / F5 |
| S13 | **B** | Aceptación de uso responsable la primera vez que se abre un modo Red Cyber | F3 |
| S14 | **Termux integrado** | Termux forma parte del código de PyroHorns: no hace falta la app Termux ni permisos extra (detalle en F5) | F5 |
| S15 | **B** | Los botones de aprobación ignoran los toques cuando otra app los tapa | F3 |
| S16 | **A → B** | Clave de firma en los secretos de GitHub; compilación reproducible antes de entrar en F-Droid. Las versiones de prueba se firman con una clave de prelanzamiento generada en el móvil (`APK IA/firma-prelanzamiento/`, fuera del repo). La **v1** usará una clave nueva creada en el PC: habrá que desinstalar la versión de prueba antes de instalarla | F1.1 / antes de F-Droid |
| S17 | **B** | Dependabot propone actualizaciones (npm, Gradle, Actions) y se revisan | F1.1 |
| S18 | **B** | Búsqueda en internet: se pide al modelo que trate los resultados como información y no siga instrucciones que vengan en ellos (elegido por el usuario el 2026-11-25; reduce el riesgo, no lo elimina) | F1.5 |
| S19 | **Elegible** | Acciones del asistente: automáticas (por defecto, elegido por el usuario el 2026-11-25) con «Deshacer», confirmadas con un toque, o apagadas. Voz: cuando haya reconocimiento (F4). Solo se ejecutan si el propio mensaje del usuario las pide | F1.5 |

**Dudas resueltas (2026-11-23)**
1. **Copias frente a cifrado → opción b.** Las claves del almacén seguro no salen del móvil, así que en la copia viaja la clave de la base de datos protegida con una **contraseña de copia** que tú defines en Ajustes. Solo se pide al restaurar (en otro móvil o tras reinstalar). Detalle técnico:
   - La base principal (SQLCipher) usa una clave aleatoria de 256 bits guardada en el almacén seguro.
   - Esa misma clave se guarda también en un pequeño "sobre" (otra base SQLCipher) cifrado con tu contraseña de copia. El sobre sí entra en la copia.
   - Al restaurar, si falta la clave en el almacén seguro, la app pide la contraseña, abre el sobre y vuelve a guardar la clave en el almacén seguro del móvil nuevo.
   - Sin contraseña de copia no hay sobre: al restaurar no se podrán leer las conversaciones y la app ofrecerá empezar de cero.
   - Las entradas del almacén seguro se excluyen de la copia porque no sirven fuera del móvil (es el comportamiento estándar de expo-secure-store). Las claves de API (F6) usarán el mismo sobre.
2. **S3 → por defecto B**, con A disponible en Ajustes.

## 5. Fases

### F1 — Fundaciones: diseño y chat simulado ✅
Implementada (commit `c8234c0`): Expo SDK 58 + heroui-native, tokens Plasma, componentes (orbe, burbujas, composer, menú lateral, iconos, mascota), pantallas (hero, chat, proyectos, modelos, ajustes, terminal y Termux de muestra), Zustand + AsyncStorage, proveedor simulado con streaming y cancelación, 13 pruebas de lógica, bundles web y Android sin errores.
✅ Revisión visual (CA2, CA5, CA6) hecha por el usuario con el primer APK (2026-11-23): todo OK.

### F1.1 — Cierre de F1
- Renombrar a PyroHorns: nombre visible, `slug` y `scheme` `pyrohorns`, identificador `io.github.joytahkn.pyrohorns`, README (unas 15 menciones en 10 archivos).
- Licencia: `LICENSE` (GPL-3.0) y `THIRD_PARTY_NOTICES.md`.
- Sustituir Fire Lite/Pro/Max por "modo → modelo" + interruptor Profundo; datos de modelos según la sección 3.
- Base de datos SQLite cifrada (S7) en lugar de AsyncStorage: expo-sqlite con SQLCipher y la clave en expo-secure-store. Una fila por mensaje, búsqueda de conversaciones y escritura agrupada durante el streaming (no en cada token). No hay datos que migrar: la app todavía no se ha instalado en el móvil.
- Copias de seguridad según S8: contraseña de copia en Ajustes (crear y cambiar), sobre con la clave y pantalla de restauración. Registros según S9; Markdown según S10.
- Ampliar el contrato con el motor: eventos de razonamiento, herramientas, uso (tiempo hasta el primer token, tok/s) y error; adjuntos; modelo usado en cada mensaje; política de contexto.
- GitHub Actions: `ci.yml` (tipos y pruebas en cada push), `android.yml` (APK arm64-v8a con prebuild + Gradle, descargable como artefacto), `release.yml` (al crear un tag `v*`: APK firmado con la clave guardada en los secretos de GitHub, S16-A), `pages.yml` (PWA en GitHub Pages) y `dependabot.yml` (S17).
- Repo `JoytaHkN/PyroHorns`: lo creas en GitHub (o lo creo yo con `gh` si me das acceso). Subo el código cuando me lo pidas.
- Script de sincronización entre `APK IA/PyroHorns` y la caché `/workspace/pyrohorns-build`.
- Metadatos para F-Droid (`fastlane/metadata/android/es-ES`).
- **CA:** CI en verde · el APK se instala y abre en tu móvil · revisión visual de F1 hecha.

**Estado F1.1 (2026-11-23): implementada y con commit.**
- Hecho: renombrado a PyroHorns, `LICENSE` (GPL-3.0) y `THIRD_PARTY_NOTICES.md`, "modo → modelo" + Profundo, SQLite cifrado con búsqueda FTS5 y escritura agrupada, contraseña de copia y pantalla de restauración, registros S9, Markdown S10, contrato ampliado, 4 workflows + Dependabot, metadatos de F-Droid, `scripts/sync-build.sh`.
- Verificado en el móvil: 0 errores de tipos · 83 pruebas (las consultas SQL se ejecutan de verdad con `node:sqlite`) · bundle web (5,9 MB) y bundle Android (3,8 MB): Android lleva el almacenamiento cifrado y la web el del navegador.
- S10: los enlaces `javascript:` y `data:` se muestran como texto, no como enlaces (confirmado por el usuario el 2026-11-23).
- APK compilado por GitHub Actions (`APK IA/apk/PyroHorns-0.1.0-F1.1-prueba.apk`). Comprobado por dentro: arm64-v8a y SQLCipher con FTS5. **Probado por el usuario en el móvil: todo OK.**

### F1.5 — Prueba de inferencia en el móvil
Objetivo: comprobar lo más arriesgado antes de construir F2.
- Módulo nativo propio (Expo Modules + JNI) basado en LMPlayground, con llama.cpp fijado en una versión que soporte las arquitecturas `lfm3` y `qwen3`. **Comprobado (2026-11-23):** el commit que fija LMPlayground (`dc33e61`, 2026-10-13) ya incluye `LLM_ARCH_LFM3`. **Implementado (2026-11-23):** `modules/pyrohorns-llama` con llama.cpp vendimizado por `scripts/vendor-llama.sh`; pendiente de compilar en CI y probar en el móvil.
- Cargar LFM3 y mostrar sus tokens en el chat real.
- Comparar abrir el GGUF desde `/sdcard` con copiarlo al almacenamiento de la app.
- Medir en tu móvil el tiempo hasta el primer token, los tok/s y el pico de RAM, con 1K y 8K de contexto.
- Plan B si el módulo propio se atasca: llama.rn (MIT).
- **Pasos 3 y 4 medidos (2026-11-24):** paso 3 (mmap frente a sin mmap) y paso 4 (1K y 7,6K) con la compilación base, en teléfono y tablet; ver la tabla en `docs/ESTADO.md`. Quedan por medir: compilación con dotprod y medición con batería.
- **Primeros resultados (2026-11-24, teléfono HUAWEI LMR-LX9, LFM3, compilación base armv8-a):** prefill 17–21 tok/s (TTFT 48–59 s con un prompt de 1K: no cumple),
  generación 13,3 tok/s con mmap y 11,2 sin mmap a 1K (cumple) y 8,8/8,4 a 7,6K (no cumple), RAM pico ≈ 1,6 GB (sin cierres). La CPU soporta dotprod/fp16/i8mm; se
  prueba `armv8.2-a+dotprod+fp16` (decisión f-B). Detalle y tabla en `docs/ESTADO.md`.
- **Con dotprod (2026-11-24, teléfono y tablet):** prefill ≈ 2,5× (56 tok/s en el teléfono, 43 en la tablet), generación LFM3 16–19 tok/s a 1K y 9–13 a 7,6K; TTFT con 1K 15–32 s (objetivo no alcanzable con esta CPU); RAM pico +1 GB (LFM3 2,6 GB, Qwen3 3,4 GB, 4B 5,0 GB); Qwen3 4–5 tok/s a 7,6K y el 4B 5 tok/s. Propuesta pendiente: reformular el objetivo de TTFT (< 2 s con ≈ 100 tokens). Detalle en `docs/ESTADO.md`.
- **Modelo en prueba (2026-11-24):** `NVIDIA-Nemotron-3.5-Bolt-E4B-Q4_K_M.gguf` (6,18 GB, arquitectura gemma4), opcional y solo para medir; no cambia el reparto de modelos (D1). Preajuste «Resumen» de P13 (20 ejecuciones). Objetivo de TTFT sin cambios por ahora.
- **Objetivos iniciales** (se ajustan tras medir): primer token en < 1,5 s con un prompt de 1K · ≥ 10 tok/s · sin cierres por memoria a 8K.
- **Salida:** decidir entre módulo propio y llama.rn.

### F2 — Runtime local y modelos
- Módulo completo: cargar, liberar, generar con eventos, parar, tokenizar; preparado para embeddings (F4).
- Gestor GGUF: importar según S3 (selector de archivos o acceso total), descargar de Hugging Face con reanudación (WorkManager + servicio en primer plano), verificar según S12-B y leer metadatos (arquitectura, contexto, plantilla, parámetros).
- Plantillas de chat: las del propio GGUF vía llama.cpp; plantilla sustituta para CyberSecQwen.
- Capacidad del dispositivo y regla de memoria de la sección 3.
- Servicio en primer plano para generaciones largas; ajuste de hilos; tok/s visible.
- `LlamaProvider` implementa el contrato ampliado en F1.1.
- **CA:** los tres modelos por defecto conversan en tu móvil · cambiar de modelo tarda < 10 s (objetivo) · ningún cierre por memoria con los contextos por defecto.

### F3 — Agente con modos
- 10 modos, cada uno con su modelo (sección 3), e interruptor Profundo.
- Bucle de herramientas con llamadas JSON (plantillas nativas de LFM3 y Qwen3; formato por prompt para CyberSecQwen).
- Modos de permiso por conversación, como en and-code; por defecto Aceptar ediciones (S1).
- Botones de aprobación protegidos frente a superposiciones (S15).
- Texto compartido y enlaces `pyrohorns://` al cuadro de texto (S11).
- Aceptación única de uso responsable en Red Cyber (S13).
- Skills por modo en formato `SKILL.md` (compatible con and-code).
- Ramas de mensajes (editar y reenviar, regenerar), compactado con LFM3 y registro del modelo de cada mensaje.
- **CA:** set de 10–20 pruebas en español por modo con resultados aceptables · herramientas funcionando con LFM3 y Qwen3.

### F4 — RAG, voz y multimodal
- RAG local: extracción (PDF, DOCX, EPUB, HTML, TXT, MD), troceado, **modelo de embeddings multilingüe** (nuevo), SQLite + sqlite-vec y respuestas con citas.
- Voz sin conexión: whisper.cpp (dictado) y TTS del sistema o Piper (voces en español).
- Multimodal: **modelo de visión pequeño con mmproj** (nuevo). OCR con Tesseract, no con ML Kit (es propietario y F-Droid no lo acepta).

### F5 — Linux, Termux integrado y ventana flotante
**Termux integrado (S14):**
- **Terminal:** `terminal-emulator` y `terminal-view` (Apache-2.0) y, gracias a D6, partes de termux-app (sesiones, teclas extra) con su aviso de copyright.
- **Paquetes:** el bootstrap y los paquetes oficiales de Termux, fijados por huella SHA-256 en un archivo de bloqueo (como `termux_assets.lock.json` de and-code) y verificados (S12-C).
- **Ejecución:** dentro del proot de PyroHorns. El proot hace falta de todos modos: con targetSdk 35, Android no deja ejecutar binarios desde la carpeta de datos de la app. proot redirige la ruta `/data/data/com.termux/files` a la carpeta de PyroHorns, así que `pkg install` funciona con los repositorios oficiales sin recompilar nada.
- **Sin permisos extra:** ni app Termux, ni `RUN_COMMAND`, ni `allow-external-apps`.
- **Pantalla "Termux" del mockup:** se mantiene, con sus pestañas de distros dentro de la app.
- **No incluido:** Termux:API, que necesita su propia app. Si hace falta alguna de sus funciones, se implementa de forma nativa.

**Resto de F5:**
- Distros (Debian, Ubuntu, Alpine) lanzadas directamente con el mismo proot, sin anidar, con proot-distro como referencia.
- Alpine como entorno del agente y de los CLIs, como en and-code.
- Archivos visibles para el agente según S3.
- Ventana flotante (servicio con overlay); el permiso se pide la primera vez que la usas.
- "Enviar a la terminal" desde los bloques de código del chat.
- Antes de empezar: revisar la política de F-Droid sobre descargar binarios en tiempo de ejecución.

### F6 — Online, automatización, GitHub y PWA visor
- Proveedores online con tus propias claves (S5): compatibles con OpenAI, Anthropic, Gemini, OpenRouter y servidores propios.
- Agentes CLI (OpenCode, Claude Code, Codex, Antigravity) dentro del Linux de F5, como en and-code.
- Automatizaciones programadas (WorkManager); al crear cada una eliges sus herramientas (S2).
- Clonar repositorios de GitHub en el espacio de trabajo.
- **PWA visor online** (GitHub Pages): chat con proveedores online, con la casilla "recordar en este navegador" para las claves (S6), y lectura de conversaciones exportadas desde el móvil (JSON). Sin modelos locales ni terminal.
- F-Droid: declarar la antifunción "NonFreeNet" (usa servicios de red no libres).

## 6. Distribución y CI
- **GitHub Releases:** APK arm64-v8a firmado con la clave guardada en los secretos de GitHub (S16-A).
- **F-Droid:** compila la app desde el código fuente. Requisitos: sin Google Play Services, Firebase, ML Kit ni actualizaciones automáticas fuera de F-Droid (no se usa `expo-updates`). Antes de enviarla: compilación reproducible para que F-Droid publique con tu firma (S16-B). En las dependencias de F1 no se detectó ninguna propietaria (las fuentes de `@expo-google-fonts` tienen licencia OFL).
- **GitHub Actions:** ver F1.1. No se puede compilar en el móvil: hermesc y el Android SDK solo existen para x86-64.

## 7. Propuestas pendientes de tu visto bueno

Diseño:
- P1. Degradado solo en el orbe, las respuestas de la IA y el botón enviar (el mockup lo usa en 21 iconos).
- P2. Variante del degradado para el tema claro: `#E0004D → #C25E00 → #A36F00` (el actual apenas se ve sobre blanco).
- P3. Texto secundario más legible: `#ABA7A2` (oscuro) y `#5E5A55` (claro).
- P4. Temas alternativos: que solo cambien el color de acento, o quitarlos.
- P5. Borde degradado y brillo solo en el último mensaje (rendimiento).
- P6. Assets en SVG/PNG (ahora son JPG), icono adaptativo y monocromo.
- P7. Ampliar los iconos a unos 40 (micrófono, parar, copiar, adjuntar, escudo, llave…).

Interacción:
- P8. Estados del orbe: inactivo, cargando, pensando, generando, error.
- P9. Primer uso sin modelos, permisos pedidos poco a poco y errores claros (memoria, archivo dañado, poco espacio).
- P10. Botón enviar de 48 dp y descripciones para el lector de pantalla.
- P11. Indicador "Local / Nube" en cada conversación (F6).

Rendimiento (F1.5, pasos 3 y 4):
- P13. **Pantalla de prueba de rendimiento** (Ajustes → Diagnóstico). Estado: **decisiones tomadas el 2026-11-24; implementada; medida en teléfono y tablet con la compilación base (2026-11-24); pendiente de medir con dotprod y con batería, y de decidir el control térmico**..
  - **Nativo (JNI):** `bench(handle, nPrompt, nGen)` estilo llama-bench: procesa `nPrompt` tokens sintéticos por lotes y genera `nGen`; devuelve por separado prompt tok/s (pp), generación tok/s (tg) y TTFT. Hoy `usage.tokPerSec` divide entre el tiempo total e incluye el prefill, así que subestima la generación. `memoryInfo()` lee `VmRSS`/`VmHWM` de `/proc/self/status` y `MemAvailable` de `/proc/meminfo` (sin permisos). `loadModel` ganaría el parámetro `useMmap` y usaría `threads`, que hoy ignora.
  - **Paso 3 (ruta del GGUF):** A) `/sdcard` con mmap · B) `/sdcard` sin mmap (una lectura secuencial) · C) copia en el almacenamiento de la app con mmap. Se mide tiempo de copia (una vez), de carga y tok/s. La caché de archivos de Android falsea las cargas repetidas: la primera es la fría y se anota el orden.
  - **Paso 4 (medidas):** LFM3 con contexto 8K; prompts de 1K y de ~7,5K tokens; 128 tokens generados; 3 repeticiones (mediana); pico de RAM por prueba. Hilos: 4 por defecto, con barrido opcional 4/6/8. Se contrastan los objetivos de §5 (TTFT < 1,5 s con 1K, ≥ 10 tok/s, sin cierres a 8K).
  - **Robustez:** se guarda una marca «prueba en curso» antes de cada ejecución; si Android cierra la app por memoria, al reabrir la pantalla indica qué prueba la mató. Pausa entre pruebas por temperatura.
  - **Resultados:** tabla en pantalla y botón «Copiar resultados» (JSON/Markdown). Requiere decidir cómo: `expo-clipboard` (dependencia nueva) o escribir un archivo en el almacenamiento de la app. Sin conversaciones ni claves (S9).
  - **Pruebas:** la lógica pura (matriz de pruebas, medianas, formato, lectura de `/proc`) con pruebas de Node; el JNI se valida por compilación en CI y la medición, en el móvil.
  - **Decisiones del usuario (2026-11-24):** (a) **B**: con y sin mmap (parámetro `useMmap` en `loadModel`; se observó 3,0 → 12,6 tok/s entre el primer y el segundo mensaje con LFM3); (b) **B**: barrido de 4, 6 y 8 hilos; (c) **C**: los cuatro modelos (Cyber y Phi con su contexto por defecto de 4K, LFM3 y Qwen3 con 8K; la pantalla debe permitir elegir un subconjunto porque la matriz completa es larga); (d) **B**: botón «Copiar» con `expo-clipboard` (dependencia nueva) y texto seleccionable como respaldo; (e) resuelta en P15 (tok/s del chat cuenta solo la generación); (f) **A ahora** (compilación base armv8-a) y **B después de medir** (probar `armv8.2-a+dotprod`).
  - **Resultados (2026-11-24):** Rápida con LFM3 en teléfono y tablet (compilación base): prefill 17–21 tok/s, TTFT 48–59 s con 1K, generación 11–13 tok/s a 1K y 8 tok/s a 7,6K, RAM pico ≈ 1,6 GB. Teléfono y tablet dan lo mismo. Compilación con dotprod: CI en verde (`6f481b0`), **pendiente de medir**. Informe con temperatura, batería, estado térmico y ahorro de energía: CI en verde (`38367c6`), **pendiente de medir con batería**. **Pendiente de decisión:** esperar a que el equipo baje de un umbral antes de cada prueba, y/o descartar o separar las pruebas en caliente.

Arquitectura:
- P12. Sustituir la "variante Compose completa" por piezas nativas solo donde React Native no llega (ventana flotante, terminal).

- **P16. Chat como LM Playground** — **aprobada por el usuario el 2026-11-24** e implementada (pendiente de móvil): instrucción de sistema breve, tope de 2048 tokens, carga del modelo al abrir el chat, compartir/copiar/👍/👎/⋮ y memoria de la conversación con reutilización de la caché KV. ssd-llm (streaming de capas desde SSD) descartado tras leer su código.

- **P17. Método Brasa: velocidad sin depender solo de la RAM** — propuesta del agente (2026-11-25), **pendiente de decisión**.
  - **Medido en el teléfono (LMR-LX9, 12 GB de RAM):** el almacenamiento lee a 1,1–1,4 GB/s en bloques grandes, pero solo a 0,19–0,24 GB/s por fallos de
    página de mmap, que es como carga hoy llama.cpp (`MADV_WILLNEED` no ayuda: 0,21; `MADV_SEQUENTIAL` sí: 1,37). Coincide con las cargas reales (LFM3 6,8 s y
    Nemotron 38 s ≈ 0,16 GB/s). Al generar, la RAM entrega ≈ 20 GB/s (P13), unas 15 veces más que el almacenamiento.
  - **Conclusión sobre ssd-llm y Colibrì:** traer pesos del almacenamiento no acelera modelos que caben en RAM; solo sirve para MoE que no caben. En un
    OnePlus 13 con 8 GB, Qwen3-30B-A3B cae de 20,2 a 0,18 tok/s; SmallThinker-21B-A3B, diseñado para ello (router antes de la atención), mantiene 15,5.
  - **Piezas:** (1) carga en bloques grandes (Nemotron ≈ 6–8 s, estimado); (2) memoria KV de cada conversación guardada en el almacenamiento (seguridad a
    elegir: A sin cifrar, B cifrada, C no guardar); (3) procesar el mensaje mientras se escribe; (4) decodificación especulativa (n-gramas y modelo borrador;
    `common/speculative.cpp` ya está en el llama.cpp vendimizado) y caché KV en q8_0 para chats largos; (5) MoE: LFM2.5-8B-A1B en RAM y después un MoE
    diseñado para leer del almacenamiento (p. ej. SmallThinker-21B-A3B) con precarga de expertos.
  - **El motor ya tiene:** arquitecturas `lfm2moe`, `smallthinker` y `qwen3moe`; `tensor_buft_overrides`, `use_extra_bufts`, `type_k` y
    `llama_state_seq_save_file`. Q4_K se reempaqueta en ARM, así que los expertos que se lean del almacenamiento deben quedar fuera del reempaquetado.
  - **(0) Tabla de Nemotron bajo demanda** (añadida el 2026-11-25 por otra sesión): `per_layer_token_embd` ocupa 2851 MiB de los 6,16 GB y solo se usan
    ≈ 11 KB por token. llama.cpp `dc33e61` sabe leerla bajo demanda, pero `LLAMA_LAZY_MODE_AUTO` exige más de 4 GiB: basta `modelParams.lazy_mode =
    LLAMA_LAZY_MODE_ON` (requiere mmap). Hipótesis sin medir: hasta ≈ 2,8 GiB menos de RAM y menos carga. Es compatible con la pieza 1 si la lectura en
    bloques grandes salta ese tramo del archivo.
  - **(0) implementada el 2026-11-25** (pedida por el usuario), pendiente de medir en el móvil. Solo Gemma 4 / Nemotron tiene tabla por capas; es una parte
    entrenada del modelo y no se puede añadir ni generar para los otros sin reentrenarlos. `token_embd` de Qwen3 1.7B (≈ 0,18 GB) y Phi-3.5 (≈ 0,06 GB) es solo de
    consulta (tienen `output.weight` aparte), pero habría que parchear llama.cpp y el ahorro es pequeño; en LFM3 y CyberSecQwen se usa entera en cada token.
  - Orden recomendado: 0 + 1 → 2 + 3 → 4 → 5. Las piezas 2 y 3 dependen de que la reutilización de memoria de P16 funcione con LFM3, que es híbrido.

- **P18. Internet para los modelos locales** — idea del usuario (2026-11-25). **Decidido: botón por mensaje y solo DuckDuckGo**; implementado, pendiente de móvil. No hace falta un servidor propio: la app consulta
  y añade el resultado al contexto. Cuándo se busca: (A) lo decide el modelo (necesita el bucle de herramientas de F3), (B) botón por mensaje (recomendada para
  empezar), (C) botón y confirmación del texto que sale del teléfono. Fuente: Wikipedia (sin clave, solo enciclopedia), un buscador con clave propia (S5) o un
  servidor SearXNG. Coste: el texto añadido se procesa antes de responder (≈ 1000 tokens: ≈ 35 s con Nemotron y ≈ 15 s con LFM3).
  - **Repositorios clonados revisados (2026-11-25):** LM Playground (MIT) trae `tools/WebSearchTool.kt` (DuckDuckGo sin clave) y `WebFetchTool.kt`; Agora (GPL-3, solo
    ideas, D2) admite Brave, Kagi, Serper, Tavily, Exa, SearXNG y DuckDuckGo; `public-apis` lista Wikipedia sin clave.
  - **Medido desde el teléfono (3 consultas con curl):** Wikipedia en español 0,6–0,7 s, resultados correctos; Exa sin clave (`mcp.exa.ai`) 0,5–0,75 s, web general;
    DuckDuckGo devolvió HTTP 202 con página antirrobots y ningún resultado.
  - **Implementación:** `src/lib/web-search.ts` (página sin JavaScript de DuckDuckGo, 4 resultados, plazo de 10 s, sin intentar esquivar bloqueos), botón de globo
    en el cuadro de texto que se apaga al enviar, resultados guardados con la pregunta (`web`, esquema v3) y fuentes pulsables bajo la respuesta. Del teléfono sale
    solo el texto del mensaje. **Riesgo:** desde este entorno DuckDuckGo respondió HTTP 202 (antirrobots), también su API de respuestas instantáneas.
  - **Protección frente a instrucciones escondidas en una página:** el usuario eligió **B** (S18).

- **P19. Pedido del 2026-11-25** — implementado (pendiente de móvil): los 12 GGUF nuevos en la app (chat, visión, complementos), enlaces de descarga de los
  `mmproj`, parche de Dory, respuestas que se tocan y **agente en la nube** (adelanta parte de F6: NVIDIA y OpenRouter con la clave del usuario, S5-B).
- **P20. Asistente tipo Jarvis** — **punto 1 aprobado e implementado el 2026-11-25** (pendiente de móvil): notas y tareas (base cifrada), eventos de calendario,
  alarmas y temporizadores; S19. El usuario quiere que tenga «acceso a todo lo posible»: cada acceso nuevo se le presenta y lo decide por separado. Siguientes:
  (2) dictado y voz (F4; el teléfono Huawei puede no tener el reconocimiento de Google); (3) asistente predeterminado de Android; después, según elija: abrir
  apps, contactos, llamadas, SMS, notificaciones, ubicación, cámara, ajustes del teléfono y control de pantalla (servicio de accesibilidad).

- **P21 — decisiones tomadas el 2026-11-25 (tarde):** (1) botón «Nube» junto al globo (opción a); (2) confirmación también por voz: **sí**; (3) control de pantalla con
  dos frases habladas **y huella** (opción ii); (4) orden de trabajo aprobado. **Bloqueo:** la cuenta del usuario en NVIDIA muestra «API Access Unavailable: contact
  support to verify your account» (`build.nvidia.com`); no hay acceso a la API gratuita hasta que NVIDIA verifique la cuenta. Alternativa: OpenRouter (Nemotron 3 Ultra
  gratis, 50 consultas al día sin créditos).
- **P21 (detalle previo).** — accesos del asistente **1–6 aprobados con la opción B** (lo irreversible, con un toque), activados con un
  comando de voz «tipo Alexa»; **7 (control de pantalla) aprobado con la opción B**, eligiendo antes las apps y con «doble seguro verbal» (por concretar). Sin código aún.
  - **Reutilizable de and-code (MIT, `/workspace/and-code`):** `feature/wakeword` (Vosk, sin conexión; su catálogo trae inglés y japonés, falta
    `vosk-model-small-es-0.42`, ≈ 39 MB, Apache-2.0), `VoiceInteractionService` (asistente predeterminado) y TTS.
  - **Pendiente de decidir:** confirmación por voz además del toque; forma del seguro del 7; cómo dejar NVIDIA «predefinido» (sin incluir claves: el repo es público).
- **P22. Conexiones con otros dispositivos** (pedido el 2026-11-25, sin código): SSH (con Linux/Termux de F5 o biblioteca), VPN (`VpnService` + WireGuard), visor VNC,
  KDE Connect (protocolo abierto; empezar apoyándose en su app). Huawei Share / Súper Dispositivo: no encontré SDK público; solo el menú «Compartir» del sistema.
- **Agente de respaldo en and-code:** no hace falta variante: and-code ya conecta proveedores en OpenCode y OpenCode 1.19.6 lista modelos de NVIDIA.

- **P25. Voz sin nube** — aprobada el 2026-11-25: **doble toque** en el chat para hablar (otro doble toque termina), **whisper.cpp** (modelo `base` multilingüe
  cuantizado, 60 MB, descarga única verificada), **voz del sistema** para responder, **sin nube** (el audio no sale del teléfono). Pendiente de medir: velocidad del
  dictado en el Huawei y voz en español. «Hey JJ» y el modo siempre escuchando quedan para después, si se decide.
- **P24. Planilla de intenciones y menú «@»** (pedido el 2026-11-25, tarde): `src/lib/assistant/intents.ts`. Frases de todos los días («llama», «marca», «agenda»,
  «correo de», «pon una alarma», «temporizador», «anota», «tarea») con sinónimos; lo que la app puede hacer se resuelve sin el modelo, lo demás va al modelo.
  Llamar abre el marcador y WhatsApp abre el chat (el usuario pulsa); buscar contactos usa el permiso de contactos. El menú «@» muestra los comandos y
  traduce «@llamar Ana» a «llama a Ana». **Pendiente:** voz «Hey JJ» o doble toque (requiere reconocimiento de voz y modelo Vosk en español) y la
  investigación de cómo lo hacen Alexa, Google y los modelos con herramientas (planilla de intenciones con ranuras; esquemas JSON de herramientas).
- **P23. Catálogo de la nube** (pedido el 2026-11-25): 29 empresas y 191 modelos, generados por `scripts/build-cloud-catalog.py` desde el registro público de OpenCode
  (`models.dev`). **Sin clave verificado en vivo:** solo Pollinations (`text.pollinations.ai/openai/chat/completions`, 1 respuesta cada 45 s por IP). **Con clave:**
  las demás; todas sus rutas de chat existen (401 sin clave). **Modelos verificados en vivo:** NVIDIA y OpenRouter (listas públicas). **OpenCode Zen** solo funciona
  con cuenta de OpenCode (429 sin ella); no se replica. ChatGPT, Claude y Grok: piden clave; no hay acceso gratuito sin ella. El selector agrupa por empresa:
  primero «sin clave», luego «con clave».

Bloqueo de F1.5 (2026-11-23; P14 decidida, P13 sigue pendiente):
- **P14. Cómo lee la app los GGUF** (bloquea P13 y la F1.5). **Decidido por el usuario el 2026-11-23: opción C** (A y B seleccionables, por defecto B); implementado en F1.5, pendiente de probar en el móvil. El APK de prueba falla con «No se encontró LFM3-1.7B-Q4_K_M.gguf en /sdcard ni en el
  almacenamiento de la app». Causa: el APK declara `READ/WRITE_EXTERNAL_STORAGE`, pero con targetSdk 35 no dan acceso a
  `/sdcard/IA/…`, y `MANAGE_EXTERNAL_STORAGE` no está declarado; `Paths.info` devuelve `exists:false`. Opciones (de la
  más libre a la más protegida; encajan con S3):
  - **A. Acceso a todos los archivos:** declarar `MANAGE_EXTERNAL_STORAGE` y un botón en Ajustes que abre la pantalla del
    sistema. El modelo se abre directo desde `/sdcard`, sin duplicarlo.
  - **B. Selector de archivos:** el GGUF se copia al almacenamiento de la app. Sin permisos nuevos; ocupa 1–2,5 GB más por modelo.
  - **C. A y B seleccionables (S3 ya decidido), por defecto B.** El paso 3 de F1.5 (comparar /sdcard con copia) necesita
    las dos. Recomendación del agente: C, y el permiso A solo se pide si eliges «Todo el almacenamiento».

Pulido del chat real (F1.5, 2026-11-24):
- **P15. Lo que muestran las capturas del primer chat real** — **Decidido por el usuario el 2026-11-24: opción 2**; implementada (pendiente de probar en el móvil); la opción 3 (modelo cargado entre mensajes) **hecha el 2026-11-24** (CI en verde `b962fbb`; pendiente de probar el chat en el móvil). (LFM3 y Qwen3 responden en el móvil: ≈ 11,1 y ≈ 10,5 tok/s en conjunto).
  Problemas vistos, todos de la integración TypeScript, no del motor:
  - a) El `<think>…</think>` sale dentro de la burbuja: `LlamaProvider` nunca emite `thinking_delta`, así que el razonamiento no
    se pliega (PLAN §3 dice que va plegado y no se reenvía).
  - b) «Pensó N s» mide hasta el primer token, que incluye **cargar el modelo en cada mensaje** (16 s con LFM3, 43 s con Qwen3
    con su razonamiento largo). No es tiempo de pensar.
  - c) `tok/s` se muestra sin formato (11.126495) y el motor lo calcula incluyendo el prefill.
  - d) La etiqueta «respuestas simuladas hasta F1.5» (`chat.tsx`, `index.tsx`) ya es falsa con el motor real.
  - e) Los dos modelos razonan aunque **Profundo esté apagado** (PLAN §3: Profundo activa el razonamiento).
  Opciones (de la más simple a la más completa):
  - **1. Solo mostrar bien:** separar `<think>` en el razonamiento plegado (analizador en TS con pruebas), formatear tok/s,
    cambiar la etiqueta y que «Pensó» mida solo el razonamiento. El modelo sigue pensando aunque Profundo esté apagado.
  - **2. 1 + respetar Profundo:** con Profundo apagado, pedir al modelo que no razone (Qwen3: `/no_think`; LFM3: según su plantilla;
    hay que probarlo en el móvil).
  - **3. 2 + mantener el modelo cargado entre mensajes:** quita 6–40 s por mensaje. Es trabajo de F2, pero falsea las
    medidas de P13 si no se hace antes.
  - Recomendación del agente: **2 ahora** y **3 antes de medir (P13)**.

- **P26. Voz fiable y acciones comprobadas** — **aprobada el 2026-11-26 con las opciones 1b, 2a, 3b y 4a**; implementada; CI en verde (`9f0844d`) y APK copiado. Pendiente: probarla en el móvil.
  - **Qué se ve en el código:**
    1. El dictado va tal cual de whisper a `send()` (`chat.tsx` → `listen()`): no hay corrección ni vocabulario. Lo que se transcribió como «misiones» llegó así al modelo.
    2. El corte: `listen.ts` termina tras 1,2 s de silencio y el umbral de voz es fijo (`SPEECH_RMS` = 0,02, `PyroHornsLlamaModule.kt`). Una pausa para pensar corta la frase, y el ruido por encima del umbral (música) impide el corte.
    3. «[Música]»: whisper convierte el ruido en una etiqueta; no hay filtro, así que se envía como mensaje tuyo. La respuesta vacía (0–42 tokens sin texto visible) deja la burbuja en blanco: `reply()` (`engine.ts`) no comprueba si el texto queda vacío.
    4. Acciones que se dan por hechas sin estar hechas:
       - **Evento:** `writableCalendar` toma un calendario escribible sin mirar si está oculto; `addEvent` no vuelve a leer el evento; `run.ts` responde «Evento creado» en cualquier caso.
       - **Alarma y temporizador:** `openClock` usa `EXTRA_SKIP_UI = true`, así que el Reloj las pone sin mostrar nada. La app responde «Alarma puesta» al abrir el Reloj, sin poder comprobar que quedó guardada.
       - **Automático:** `proposeActions` (`engine.ts`, línea ~308) ejecuta lo que propone el modelo sin validarlo. Así entraron la nota «Calendario» y el evento de las 00:00 del 17/09/2026 (fecha ya pasada y hora por defecto).
       - **«Abre el calendario en…»** no tiene intención propia: la frase fue al modelo.
  - **Propuesta por bloques:**
    - **A. Dictado.** A1: vocabulario para whisper (`initial_prompt`) con palabras de comandos y hasta 25 nombres de contactos (`contactNames`, nuevo); si whisper devuelve el vocabulario en silencio, se descarta. A2: filtro de no-voz (`[…]`, `(…)`, `*…*`, ♪ y frases típicas de silencio); si no queda texto, no se envía nada y se avisa «No te escuché». A3: corrección con contexto, según la decisión 1: primero determinista (palabras cercanas al vocabulario) y, si se elige, reescritura con el modelo local ya cargado (nunca en la nube; si no está cargado, se omite). Guardas: solo cambia palabras, no añade números ni palabras nuevas, con tope de tokens y de tiempo; si algo falla, usa el original. Si cambia algo, se muestra bajo tu mensaje «Oí: …».
    - **B. Escucha.** Corte tras 2,5 s de silencio (decisión 2); máximo 30 s (límite del búfer nativo); 8 s sin voz antes de cortar; umbral adaptativo (3 veces el ruido medido en los primeros 0,5 s, entre 0,006 y 0,03); normalización del pico a 0,9; el doble toque para terminar se ignora durante 1,5 s tras empezar.
    - **C. Acciones.** C1: `problemOf(action, now)` antes de ejecutar (planilla, modelo y al confirmar). Texto vacío o genérico (calendario, alarma, nota, tarea, evento, recordatorio, reloj, temporizador, agenda, eso, esto, algo, cosa) → pregunta. Evento en una fecha de más de 24 h atrás → pregunta si lo quieres en otro año. Hora 00:00 sin hora dicha → «¿A qué hora?». C2: política de Automático (decisión 3). C3: calendario visible y escribible (preferir el principal y el sincronizado); tras insertar, se relee el evento y se responde «Evento guardado en «<calendario>»»; si está oculto, se avisa. C4: alarma y temporizador según la decisión 4.
    - **D. Intención «abre el calendario».** `PyroOpenCalendar`, colocada antes de `PyroCalendar`: «abre/muéstrame el calendario (del) 17 de septiembre» abre la app Calendario en esa fecha (`ACTION_VIEW`, solo lectura: no crea nada). Fechas: día y mes (año opcional), dd/mm, hoy, mañana, pasado y días de la semana (`dateFromText` en `slots.ts`).
    - **E. Respuesta vacía.** Si el texto queda vacío al terminar: «No obtuve respuesta. Prueba otra vez o dímelo de otra forma.» (no burbuja en blanco).
    - **F. Técnico.** `maxTokens` pasa a `StreamOptions` (hoy fijo en 32 en `llama.ts`) y se añade `completeLocal` en el motor, para A3.
  - **Decisiones (aprobadas: 1b, 2a, 3b, 4a):**
    1. Corrección del dictado: **(a) vocabulario y reglas, sin modelo**; **(b) lo anterior y reescritura con el modelo local** (≈ 2–3 s más por frase con LFM3 y ≈ 4–5 s con Nemotron; estimación con las medidas de P13); (c) ninguna.
    2. Fin de la escucha: **(a) 2,5 s de silencio, o doble toque**; (b) 3,5 s de silencio, o doble toque; (c) solo doble toque, sin corte automático.
    3. Automático con lo que propone el modelo: (a) como ahora, se ejecuta solo; **(b) evento, alarma y temporizador piden un toque; notas, tareas y lo que la planilla resuelve y es válido siguen automáticos**; (c) todo lo que propone el modelo pide un toque.
    4. Alarma y temporizador: **(a) se abre el Reloj con los datos para que confirmes con un toque** («Abrí el Reloj con la alarma de las 07:00. Confirma que quedó guardada»); (b) se ponen en silencio, como ahora, sin poder comprobarlo.
  - **Pruebas.** Automáticas: `cleanTranscript`, guardas de A3 (con un `complete` falso), `problemOf`, `dateFromText`, intención de `PyroOpenCalendar`, flujos del asistente (un evento del modelo queda pendiente), JSON de `addEvent`; `sh scripts/sync-build.sh` y bundle Android. En el móvil: dictar con pausas; música de fondo sin «[Música]»; «abre el calendario del 17 de septiembre»; «agenda … mañana a las 10» y comprobarlo en Calendario; «pon una alarma a las 7»; respuesta vacía.
  - **Límites.** Aquí no se pueden probar el micrófono, el calendario ni el Reloj: eso se comprueba en el móvil.
  - **Implementación (2026-11-26) y elecciones propias:** la planilla entiende la frase → no se llama al modelo para corregirla (más rápido y sin inventar); la corrección del modelo solo si hay un modelo del teléfono ya cargado y no hay respuesta en curso; el dictado con menos de tres palabras no se corrige con el modelo; «Oí: …» se guarda con el mensaje (esquema v5, columna `heard`); los eventos y temporizadores que propone el modelo esperan un toque en Automático, y notas, tareas, listas, llamadas, correos y la planilla válida siguen automáticos; con voz se lee también la pregunta de confirmación pendiente; el calendario se elige visible > principal > sincronizado y, si no hay ninguno visible, se usa uno oculto avisando; el tope de ganancia del dictado es 20×.

- **P27. Datos de intenciones en español (MASSIVE, SNIPS, Mycroft, Leon)** — propuesta del 2026-11-26, **sin código**. Verificación completa en `docs/integraciones.md` §2.
  - **Qué se comprobó:**
    - MASSIVE 1.0: es-ES con **16.521** frases (train 11.514 · dev 2.033 · test 2.974); **60 intenciones** y 18 dominios. Datos CC BY 4.0 (atribución obligatoria); código Apache-2.0; descarga de **39,5 MB** desde S3. Las 33 intenciones que citaste existen; el ejemplo del texto omite tres campos (`worker_id`, `slot_method`, `judgments`).
    - SNIPS (CC0): las frases son **en inglés**; no hay traducción al español en esa fuente.
    - Mycroft: 11 de los 62 repositorios de habilidades tienen carpetas `es-*` (Apache-2.0), con ficheros `.voc`, `.dialog` y `.rx`, **no `.intent`**. Mycroft AI cerró en 2023 y el repositorio principal está archivado.
    - Leon (MIT): sus habilidades nativas no tienen español (locales en inglés y francés).
    - Dialogflow: la documentación no enumera agentes en español para domótica, alarmas ni navegación. Es un servicio de Google Cloud.
    - Gemini o GPT con las intenciones en el prompt: técnicamente posible, pero envía el texto a la nube (choca con P25).
  - **Propuesta por fases:**
    - F27-1 (sin tocar la app): descargar MASSIVE en `APK IA/datasets/` (fuera del repo), registrar su huella SHA-256 (como S12) y medir la planilla con el test es-ES: cobertura y falsos positivos por intención. Intenciones que la app ya puede hacer: `alarm_set`, `calendar_set`, `lists_createoradd`, `datetime_query` y, en parte, `email_query`. El resto (música, clima, tráfico, domótica, preguntas) va al modelo o a internet, nunca a una acción.
    - F27-2: completar la planilla con lo que muestra MASSIVE (horas dichas en palabras, como «nueve de la mañana»; sinónimos), con pruebas por cada cambio.
    - F27-3: usar MASSIVE como conjunto de regresión de la planilla, fuera del APK. Si algo derivado entra en la app, atribución CC BY 4.0 en `THIRD_PARTY_NOTICES.md`.
    - F27-4 (opcional): modelo local con las 60 intenciones en el prompt, precargado con `warm`. Medir el prefill antes de decidir.
  - **Decisiones** (la recomendada en negrita; qué cambia y cómo afecta cada opción: `docs/integraciones.md` §9):
    1. Uso de MASSIVE: **(a) solo evaluación interna**; (b) plantillas derivadas dentro del APK, con atribución; (c) ambas, por fases.
    2. SNIPS: **(a) no usar** (inglés); (b) solo como referencia.
    3. Mycroft y Leon: **(a) solo como referencia de formatos**; (b) copiar plantillas de las 11 habilidades `es-*` tras revisar cada repositorio; (c) no usar.
    4. NLU en la nube (Dialogflow, Gemini, GPT): **(a) no, por «sin nube» (P25)**; (b) opcional, con consentimiento explícito por uso.
    5. Descarga de 39,5 MB en `APK IA/datasets/`: **(a) sí, con huella registrada**.
  - **Riesgos:** atribución CC BY; las traducciones de MASSIVE no son habla espontánea; el modelo local inventa datos (P15, P17), así que toda acción se confirma (S19).
  - **Pruebas:** script de evaluación reproducible, fuera de la app, con tabla de resultados. Los criterios de aceptación los fija el usuario.
- **P28. Notas, bloc de notas y agenda: AppFlowy, versión propia y elección desde Ajustes** — propuesta del 2026-11-26, **sin código**. Verificación en `docs/integraciones.md` §3.
  - **Qué se comprobó:**
    - AppFlowy es **AGPL-3.0** (Dart/Flutter), está en Google Play para Android 10 o superior, y su paquete de editor tiene licencia dual **AGPL-3.0 o MPL-2.0**.
    - PyroHorns es **GPL-3.0-only**. Combinar código AGPL exige decidir la licencia del conjunto. ⚠️ El texto de la sección 13 de la GPLv3 no se pudo leer (gnu.org inaccesible).
    - Android define el rol **NOTES** desde la **API 34 (Android 14)**. El teléfono tiene Android 12: ahí no hay forma oficial de hacer predeterminada una app de notas. El rol, cuando existe, lo concede el usuario en un diálogo; no hay forma documentada de forzarlo.
  - **Opciones de integración:**
    - A. AppFlowy como app externa: el usuario la instala y PyroHorns le envía texto o la abre. No mezcla código, pero no queda dentro de la APK.
    - B. **Versión propia en React Native**: notas en bloques o Markdown sobre SQLCipher (S7), agenda local y exportación a Markdown. Inspirada en AppFlowy, Obsidian y Notion, sin copiar código.
    - C. Incrustar el editor Flutter de AppFlowy (add-to-app): motor Flutter dentro del APK y licencia AGPL o MPL. Complejidad alta.
    - D. Copiar código de AppFlowy o de su editor: solo tras revisión legal.
  - **Ajustes propuestos:** por categoría (agenda, notas, tareas), elegir «Sistema» o «PyroHorns». Al elegir PyroHorns, la app avisa qué se reemplaza y ofrece la pantalla de aplicaciones predeterminadas; en Android 14 o superior pide el rol NOTES.
  - **Decisiones** (qué cambia y cómo afecta cada opción: `docs/integraciones.md` §9):
    1. Camino: **(b) versión propia**; (a) como complemento; (c) y (d) no sin revisión legal.
    2. Almacenamiento: **(a) base cifrada SQLCipher (S7) con exportación Markdown**; (b) carpeta Markdown tipo Obsidian, sin cifrar, vía SAF; (c) ambas: cifrada por defecto y bóveda Markdown opcional.
    3. Alcance «como Obsidian o Notion» (interpretación por confirmar): **(a) enlaces entre notas (retroenlaces), bloques y tablas sencillas**; (b) además, tarjetas de estudio; (c) solo texto por ahora.
    4. Predeterminadas: **(a) ajustes, aviso, pantalla del sistema y rol NOTES en Android 14 o superior**; (b) solo ajustes.
    5. Licencia: **(a) mantener GPL-3.0-only y no mezclar AGPL**; (b) revisar la licencia, decisión del titular y con asesoría.
  - **Fases:** F28-1 notas (texto y bloques básicos) sobre SQLCipher; F28-2 agenda propia con opción de sincronizar con el calendario del sistema; F28-3 enlaces y retroenlaces; F28-4 exportación e importación Markdown; F28-5 selector de apps en Ajustes y avisos.
  - **Seguridad:** S7 (base cifrada), S9 (registros sin contenido), S10 (imágenes y enlaces), S11 (lo que llega de otras apps se revisa antes de guardarse), S19 (acciones confirmables).
- **P29. Explorador de archivos y nubes (AnExplorer, Gestor de archivos +, Drive, Dropbox, OneDrive, MEGA)** — propuesta del 2026-11-26, **sin código**. Verificación en `docs/integraciones.md` §4.
  - **Qué se comprobó:**
    - AnExplorer es **Apache-2.0**; su README describe almacenamiento local, SD, USB y FTP, y **no menciona ninguna nube**.
    - Gestor de archivos + es propietario. Sus nubes, según fichas de terceros, son Drive, OneDrive, Dropbox, Box y Yandex (**no Mega**).
    - MEGA SDK es **BSD-2-Clause** (C++, con ejemplo para Android).
    - SAF expone archivos mediante `DocumentsProvider`; que Drive, Dropbox y OneDrive lo hagan está por comprobar en el teléfono.
    - Dropbox recomienda PKCE para apps móviles. OneDrive usa `Files.ReadWrite` con MSAL. Drive tiene alcances restringidos que pueden tardar semanas en revisarse.
  - **Opciones:**
    - A. **SAF primero**: el usuario elige la carpeta o el archivo en el selector del sistema; la app no guarda credenciales (fase 1).
    - B. APIs directas con OAuth (Drive con `drive.file`, Dropbox con PKCE, OneDrive con Graph): fase 2. Tokens en el almacén seguro (S5); registro en Google Cloud (con la huella SHA-1 del firmante), en Dropbox y en Azure.
    - C. WebDAV (Nextcloud y similares): fase 2b, no verificado en esta sesión.
    - D. MEGA con su SDK por JNI: fase 3, la más costosa.
    - E. Código de AnExplorer (Apache-2.0, con su NOTICE) para la navegación local, o reimplementarla usando AnExplorer como referencia.
  - **Decisiones** (qué cambia y cómo afecta cada opción: `docs/integraciones.md` §9):
    1. Fase 1: **(a) SAF**; (b) OAuth directo desde el principio.
    2. Acceso a archivos: **(a) SAF, sin «todo el almacenamiento»**; (b) además, el modo «todo el almacenamiento» que ya existe (S3), solo si se elige en Ajustes.
    3. Código de AnExplorer: **(a) reimplementar, con AnExplorer como referencia**; (b) reutilizar con atribución Apache-2.0.
    4. MEGA: **(a) más adelante (fase 3)**; (b) ahora; (c) no.
    5. Nubes: **(a) lectura por defecto y escritura solo al confirmar**; (b) sincronización automática (más riesgo).
  - **Seguridad:** S3 (modo de acceso), S5 (tokens en el almacén seguro), S10 y S11 (contenido externo), S9 (los registros no incluyen nombres de archivos ni contenido).
  - **Fases:** F29-1 explorador local y SAF (leer, copiar y mover con confirmación); F29-2 Dropbox, OneDrive y Drive por OAuth; F29-3 WebDAV; F29-4 MEGA.
- **P30. Integración con nuestra IA: planilla, notas, agenda y archivos** — propuesta del 2026-11-26, **sin código**. Análisis en `docs/integraciones.md` §5.
  - **Arquitectura propuesta:**
    - La planilla sigue siendo la primera vía: «anota», «agenda», «abre el calendario» o «busca en mis notas» se resuelven sin modelo.
    - Las acciones de notas y agenda escriben en el almacén de P28 o en las apps del sistema, según Ajustes.
    - El modelo local responde o propone, pero no ejecuta: toda acción se confirma o se deshace (S19).
    - Búsqueda: FTS5 sobre las notas (como `messages_fts`), sin modelo; recuperación semántica con embeddings más adelante (F4).
    - Archivos (P29): indexar nombres y metadatos; el texto completo solo de los archivos que el usuario elija, con límite de tamaño. Memoria de referencia: LFM3 ≈ 2,6 GB y Nemotron ≈ 6 GB (P13).
  - **Riesgos y medidas:** el modelo local ha inventado datos (P15, P17). Con 60 intenciones en el prompt el prefill crece (estimación de 1.000 a 1.500 tokens; hay que medirlo). El contenido de notas y archivos se trata como datos, no como instrucciones (S4, S18).
  - **Decisiones** (qué cambia y cómo afecta cada opción: `docs/integraciones.md` §9):
    1. Búsqueda en notas: **(a) FTS5 ahora, sin modelo**; (b) embeddings en F4.
    2. Indexar archivos: **(a) solo nombres y metadatos**; (b) texto completo de los archivos elegidos, con límite; (c) no indexar.
    3. Intenciones fuera de la planilla: **(a) modelo local con la lista de intenciones, cacheada, tras medir**; (b) solo responder, sin acciones; (c) nube con consentimiento por uso.
  - **Evaluación:** MASSIVE (P27-F1) y pruebas propias en el teléfono: cobertura, falsos positivos y latencia.

## 8. Riesgos

| Riesgo | Fase | Respuesta |
|---|---|---|
| ~~La versión de llama.cpp elegida no soporta `lfm3`~~ | F1.5 | Resuelto: el commit de LMPlayground (`dc33e61`, 2026-10-13) ya incluye `LLM_ARCH_LFM3` |
| RAM libre real ≈ 4 GB en tu móvil | F2 | Regla de memoria y contexto adaptable |
| Calidad de CyberSecQwen en español y con herramientas | F3 | Pruebas en F3; plantilla sustituta |
| Algunas órdenes de Termux dependen de su app (`termux-open`, `am`…) | F5 | Reimplementarlas en PyroHorns o documentar que no están |
| Política de F-Droid sobre binarios descargados | F5 | Revisarla antes de F5; alternativa: incluirlos en el APK |
| Olvidar la contraseña de copia | F1.1 | Sin ella la copia no se puede leer; la app ofrece empezar de cero sin borrar el archivo antiguo |
| Rendimiento de los degradados en listas largas | F1.1 | P5 |
| Versiones muy nuevas de Expo/RN frente a heroui-native | Todas | Versiones fijadas y CI |
| Git en `/sdcard` (sin enlaces ni bit de ejecución) | Todas | `core.createObject = rename`; dependencias en la caché de `/workspace` |

## 9. Continuidad entre entornos (2026-11-23)

El usuario cambia de agente cuando se le acaban los créditos (Claude Code ↔ Codex, OpenCode o
Antigravity dentro de and-code). El handoff de and-code solo pasa los últimos ~6000 caracteres de la
conversación, así que el contexto vive en el repo:
- `AGENTS.md`: reglas del usuario y del entorno para cualquier agente (`CLAUDE.md` y `GEMINI.md` lo
  importan). Hay accesos equivalentes en la raíz de `APK IA`.
- `docs/ESTADO.md`: estado, siguiente paso, decisiones pendientes y prompt para retomar.
- Al cerrar cada bloque de trabajo se actualiza `docs/ESTADO.md` y se hace commit y push, así que
  GitHub siempre tiene el último estado.
- Los cambios solo de documentación no recompilan el APK.

## 10. Preguntas abiertas
1. Propuestas P1–P15 (sección 7).
2. Revisión visual de F1 cuando tengas el primer APK.
