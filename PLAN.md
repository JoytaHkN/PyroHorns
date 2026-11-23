# PLAN — PyroHorns

> **Versión 2.2** · 2026-11-23
> Estado: F1 implementada (commit `c8234c0`). Todas las decisiones cerradas (D1–D8, S1–S17 y las dos dudas de seguridad). **F1.1 implementada, verificada en el móvil** (tipos, 83 pruebas, bundles web y Android) **y con commit**. Pendiente: subirla a `github.com/JoytaHkN/PyroHorns` para que Actions compile el primer APK, probarlo en el móvil y las propuestas de diseño (sección 7).
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
| S10 | **B** | Imágenes remotas solo al tocarlas; enlaces directos; el HTML se muestra como texto | F1.1 |
| S11 | **B** | Lo que llega desde otras apps o por enlaces `pyrohorns://` aparece en el cuadro de texto y tú pulsas enviar | F3 |
| S12 | **B** modelos · **C** Linux y CLIs | Modelos: se comprueba su huella y, si no coincide, se cargan con la etiqueta "no verificado". Linux, Termux y CLIs: huellas fijadas en un archivo de bloqueo; lo que no coincida no se instala | F2 / F5 |
| S13 | **B** | Aceptación de uso responsable la primera vez que se abre un modo Red Cyber | F3 |
| S14 | **Termux integrado** | Termux forma parte del código de PyroHorns: no hace falta la app Termux ni permisos extra (detalle en F5) | F5 |
| S15 | **B** | Los botones de aprobación ignoran los toques cuando otra app los tapa | F3 |
| S16 | **A → B** | Clave de firma en los secretos de GitHub; compilación reproducible antes de entrar en F-Droid. Las versiones de prueba se firman con una clave de prelanzamiento generada en el móvil (`APK IA/firma-prelanzamiento/`, fuera del repo). La **v1** usará una clave nueva creada en el PC: habrá que desinstalar la versión de prueba antes de instalarla | F1.1 / antes de F-Droid |
| S17 | **B** | Dependabot propone actualizaciones (npm, Gradle, Actions) y se revisan | F1.1 |

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
Pendiente: tu revisión visual (CA2, CA5, CA6), que podrás hacer con el primer APK de F1.1.

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
- Interpretación de S10 que conviene que confirmes: los enlaces `javascript:` y `data:` se muestran como texto, no como enlaces (forma parte de "el HTML se muestra como texto").
- Sin verificar todavía (necesita el APK): SQLCipher en el dispositivo, restaurar una copia con la contraseña de copia, la primera ejecución de los workflows y la revisión visual.

### F1.5 — Prueba de inferencia en el móvil
Objetivo: comprobar lo más arriesgado antes de construir F2.
- Módulo nativo propio (Expo Modules + JNI) basado en LMPlayground, con llama.cpp fijado en una versión que soporte las arquitecturas `lfm3` y `qwen3`.
- Cargar LFM3 y mostrar sus tokens en el chat real.
- Comparar abrir el GGUF desde `/sdcard` con copiarlo al almacenamiento de la app.
- Medir en tu móvil el tiempo hasta el primer token, los tok/s y el pico de RAM, con 1K y 8K de contexto.
- Plan B si el módulo propio se atasca: llama.rn (MIT).
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

Arquitectura:
- P12. Sustituir la "variante Compose completa" por piezas nativas solo donde React Native no llega (ventana flotante, terminal).

## 8. Riesgos

| Riesgo | Fase | Respuesta |
|---|---|---|
| La versión de llama.cpp elegida no soporta `lfm3` | F1.5 | Fijar una versión reciente; plan B llama.rn |
| RAM libre real ≈ 4 GB en tu móvil | F2 | Regla de memoria y contexto adaptable |
| Calidad de CyberSecQwen en español y con herramientas | F3 | Pruebas en F3; plantilla sustituta |
| Algunas órdenes de Termux dependen de su app (`termux-open`, `am`…) | F5 | Reimplementarlas en PyroHorns o documentar que no están |
| Política de F-Droid sobre binarios descargados | F5 | Revisarla antes de F5; alternativa: incluirlos en el APK |
| Olvidar la contraseña de copia | F1.1 | Sin ella la copia no se puede leer; la app ofrece empezar de cero sin borrar el archivo antiguo |
| Rendimiento de los degradados en listas largas | F1.1 | P5 |
| Versiones muy nuevas de Expo/RN frente a heroui-native | Todas | Versiones fijadas y CI |
| Git en `/sdcard` (sin enlaces ni bit de ejecución) | Todas | `core.createObject = rename`; dependencias en la caché de `/workspace` |

## 9. Preguntas abiertas
1. Propuestas P1–P12 (sección 7).
2. Revisión visual de F1 cuando tengas el primer APK.
