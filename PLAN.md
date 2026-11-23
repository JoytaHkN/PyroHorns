# PLAN — Agora Fire

> Estado: **aprobado** (2026-11-23). **F1 implementada** (2026-11-23); pendiente tu revisión en dispositivo.
> Código: `/workspace/agora-fire` (en `/sdcard` no se pueden usar symlinks ni `node_modules`).
> Modelos GGUF y mockup: `/sdcard/IA/Proyectos/APK IA/`.

## Contexto rector

| Aspecto | Decisión |
|---|---|
| Stack UI | React Native (Expo SDK 58, expo-router) + **heroui-native 1.1** + Uniwind/Tailwind v4 + patrones de `react-native-reusables` |
| Variantes | Android (APK RN) → PWA (react-native-web, mismo código) → Compose nativa (F6, reutiliza los tokens) |
| Base técnica | **and-code / Agora** (Kotlin: proveedores, proot, agentes) + **LMPlayground** (bindings llama.cpp, workers de descarga y generación) |
| Diseño | Paleta **Plasma** (base grafito; el degradado aparece solo donde "vive" la IA: orbe, borde de respuestas, botón enviar). Iconos de trazo redondeado con degradado sobre baldosa en relieve. Mascota Ibex (cuernos curvos → chispa). Tema oscuro y claro |
| Modelos locales | `LFM3-1.7B`, `Qwen3-1.7B`, `Phi-3.5-mini-instruct`, `CyberSecQwen-4B` (todos Q4_K_M) |

### Tokens Plasma (tomados del mockup aprobado)

| Token | Oscuro | Claro |
|---|---|---|
| page | `#121212` | `#E3E0DC` |
| bg | `#1A1A1A` | `#F1EFEC` |
| surface | `#2D2D2D` | `#FFFFFF` |
| surface2 | `#363636` | `#E9E6E2` |
| raise | `#3F3F3F` | `#FFFFFF` |
| text | `#E6E4E1` | `#1D1C1A` |
| muted | `#9C9893` | `#6B6762` |
| ink (acento) | `#FF9C66` | `#C4133F` |
| line | `rgba(255,255,255,.08)` | `rgba(0,0,0,.09)` |
| plasma | `#FF3366 → #FF9900 (55 %) → #FFCC00`, 120° | igual |
| on-plasma | `#1A0B05` | igual |
| Tipografía | Outfit (UI), JetBrains Mono (código/terminal) | igual |

El **Dorado Plasma** es el degradado `p1→p2→p3`. Los valores son definitivos para F1; se podrán retocar desde Ajustes → Color del tema (los presets del mockup).

---

## Rol de cada modelo (incluye LFM3-1.7B-Q4_K_M)

| Modelo | Tamaño | Rol |
|---|---|---|
| **LFM3-1.7B-Q4_K_M** | 1,1 GB | **Modelo base y de respaldo, siempre disponible.** Es el más ligero y rápido: arranque en frío, chat general corto, títulos de conversación, resúmenes y compactado de contexto, clasificación de intención (el router que decide modo y nivel). Se usa también como respaldo cuando el dispositivo tiene poca RAM o falla la carga del modelo del nivel elegido |
| Phi-3.5-mini-instruct | 2,4 GB | Nivel **Fire Lite** (básico): razonamiento general, explicaciones, redacción |
| Qwen3-1.7B | 1,3 GB | Nivel **Fire Pro** (medio): programación, herramientas, modo pensamiento `/think` |
| CyberSecQwen-4B | 2,5 GB | Nivel **Fire Max** (avanzado): Red/Blue Cyber, análisis de seguridad y depuración profunda |

Reglas: con menos de 4 GB de RAM libre solo se habilitan LFM3 y Qwen3-1.7B. Solo hay un modelo cargado a la vez (salvo LFM3 como router, si cabe en memoria).

---

## F1 — Fundaciones: diseño y chat base (sin IA real)

**Objetivo:** app ejecutable en Android y web con la identidad Plasma completa y un chat funcional con respuestas simuladas.

**Detalle técnico**
- Proyecto Expo SDK 58 + expo-router + TypeScript estricto; `heroui-native`, Uniwind, reanimated 4, gesture-handler, safe-area, svg, expo-linear-gradient, expo-font.
- `global.css`: temas `plasma-dark` / `plasma-light` mapeados a las variables de HeroUI (`--background`, `--surface`, `--accent`, `--muted`, `--border`…).
- `src/theme/tokens.ts`: los mismos tokens para TS (degradados, sombras, Compose más adelante).
- Componentes propios sobre HeroUI: `PlasmaGradient`, `PlasmaIcon` (trazo redondeado + degradado SVG sobre baldosa en relieve), `IconTile`, `Orb` (pulso animado), `MessageBubble` (usuario / IA con borde Plasma / "pensando"), `Composer` (entrada, selector de modelo, micrófono como stub, enviar con degradado), `Drawer`, `ListItem`/`Group`, `ProgressBar`, `Ibex` (mascota SVG).
- Pantallas (rutas): `index` (Hero), `chat`, menú lateral, `projects`, `models` (GGUF), `settings`. Terminal Alpine y Termux aparecen como pantallas de muestra (se activan en F5).
- Estado: Zustand + AsyncStorage (tema, conversaciones, modelo y nivel elegidos).
- `MockProvider` con la interfaz `ChatProvider` (`stream(messages, opts) → AsyncIterable<token>`) que F2 sustituirá por llama.cpp sin tocar la UI.
- Selector de agente (modo) y nivel (Fire Lite / Pro / Max) en el composer.

**Criterios de aceptación**
- CA1: la web (`expo start --web`) y el bundle Android compilan sin errores; `tsc --noEmit` limpio.
- CA2: tema oscuro/claro conmutables y persistentes.
- CA3: enviar un mensaje produce una respuesta simulada en streaming con indicador "pensando".
- CA4: las conversaciones persisten y se listan en el menú lateral; se pueden crear y borrar.
- CA5: navegación entre todas las pantallas del mockup.
- CA6: iconos, orbe y mascota coinciden con el mockup.

**Estado F1:** CA1 ✅ (tsc limpio, bundles web y Android OK) · CA3/CA4 ✅ (13 pruebas de lógica) · CA2/CA5/CA6 implementados, falta revisión visual tuya. Nota: el APK no se puede compilar en el teléfono (hermesc y Android SDK son x86-64); se genera con EAS Build o en un PC.

**Entregables:** E1 código del proyecto · E2 tokens · E3 librería de componentes · E4 pantallas · E5 build web (PWA preliminar).
**Riesgos:** R1 versiones muy nuevas de RN/Expo frente a heroui-native · R2 sin Android SDK en el dispositivo, el APK se genera con EAS o en un PC · R3 rendimiento de los degradados en gama baja · R4 fuentes sin conexión.

## F2 — Runtime local y modelos

- Módulo nativo Expo (`modules/llama`) en Kotlin + JNI sobre **llama.cpp** (reutiliza `LMPlayground/android` y `core`): `loadModel`, `unloadModel`, `generate` con eventos de token, `stop`, `tokenize`, estado de KV.
- Gestor GGUF: importar desde `/sdcard` (SAF), descargar desde Hugging Face con reanudación (WorkManager), verificar con checksum, leer metadatos GGUF (arquitectura, contexto, plantilla de chat).
- Plantillas de chat por modelo (ChatML para Qwen, Phi-3 y LFM). Sampler: temperatura, top-p, top-k, min-p, penalización de repetición.
- Capacidad del dispositivo: RAM total y libre, núcleos, ABI → recomienda nivel y tamaño de contexto.
- `LlamaProvider` implementa `ChatProvider` → la UI de F1 funciona sin cambios.
- Asignación de modelos según la tabla de arriba, con LFM3 como respaldo.

## F3 — Agente con modos y niveles

- Modos: planificación, construcción, programación, depuración, investigación, diversión, automatización, Red Team y Blue Team (Cyber).
- Niveles Fire Lite / Pro / Max: prompt de sistema, herramientas permitidas, límites de tokens, temperatura y modelo para cada uno.
- Skills por modo (formato SKILL.md, compatible con and-code). Bucle de herramientas con llamadas JSON, validación y confirmación para acciones peligrosas.
- Router de intención con LFM3. Historial con instantánea de agente y configuración por conversación. Ramas de mensajes.

## F4 — RAG, voz y multimodal

- RAG local: extracción (PDF, DOCX, EPUB, HTML, TXT y MD), troceado, embeddings con un modelo GGUF pequeño, almacén vectorial SQLite, constructor de prompt con citas.
- Voz: STT con whisper.cpp y TTS con el motor del sistema o Piper, todo sin conexión. Botón de micrófono del composer.
- Multimodal: adjuntar imágenes y PDF (OCR con ML Kit y visión si el modelo la admite).

## F5 — Terminal: Alpine, Termux, ventana flotante

- Terminal Alpine embebida con el runtime proot de and-code (`build-proot.sh`) y emulador de terminal (`termux-app/terminal-view`).
- Puente con Termux: `RUN_COMMAND` intent, sesiones `proot-distro`.
- Ventana flotante (servicio con overlay y ComposeView, permiso `SYSTEM_ALERT_WINDOW`).
- "Enviar código a la terminal" desde los bloques de código del chat.

## F6 — Online, automatización, GitHub, PWA y Compose

- Proveedores online (BYOK) y agentes OpenCode, Claude Code, Codex y Antigravity con el patrón de and-code.
- Automatización: tareas programadas y disparadores.
- Clonar repositorios de GitHub en el espacio de trabajo.
- PWA final (service worker, manifiesto, instalación) y variante Compose nativa con los mismos tokens.
