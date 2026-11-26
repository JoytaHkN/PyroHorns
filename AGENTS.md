# AGENTS.md — PyroHorns

Instrucciones para cualquier agente de IA (Claude Code, Codex, OpenCode, Antigravity…) que trabaje en
este repositorio. El usuario cambia de agente cuando se le acaban los créditos: **todo el contexto
necesario está en este repo**, no en la memoria de ningún agente.

## Al empezar (obligatorio)
1. Lee `docs/ESTADO.md` (qué está hecho y qué sigue), `PLAN.md` (decisiones D1–D8, seguridad
   S1–S19, fases) y `docs/CONTINUIDAD.md` (checklist de cierre y prompts para móvil y PC).
   Si el trabajo toca datos de intenciones, notas, agenda, archivos o nubes, lee también `docs/integraciones.md`.
2. Ejecuta `git log --oneline -10` y `git status`: puede haber trabajo hecho desde otro agente.
3. Responde siempre en español, con explicaciones claras (el usuario trabaja desde el móvil).

## Reglas del usuario
- **Hitos (P31).** Se trabaja en el hito en curso (`PLAN.md` §5); las ideas nuevas van a la lista de pendientes salvo que
  el usuario decida otra cosa. Máximo 3 bloques que cambien el APK sin probar en el móvil (`docs/pruebas-movil.md`).
- **ESTADO.md, máximo 120 líneas.** La historia va a `docs/historial/` y las medidas a `docs/mediciones.md`; léelos solo si hace falta.
- **Planes antes que código.** Si cambia el alcance o hay una decisión abierta, propón y espera su
  visto bueno. No des por definitivo nada que haya dejado pendiente.
- **Código y datos de terceros.** Antes de copiar, enlazar o empaquetar código o datos ajenos, verifica su licencia (`gh api repos/<dueño>/<repo> --jq .license`, o su fichero LICENSE/NOTICE) y compárala con la de PyroHorns (GPL-3.0-only). Lo que sea AGPL, tenga licencia dudosa o no tenga ninguna no se integra sin decisión del titular. Los datos grandes van fuera del repo (`APK IA/datasets/`), con su huella SHA-256 y, si se usan en la app, su atribución en `THIRD_PARTY_NOTICES.md`.
- **Seguridad: solo lo elegido.** Aplica únicamente las medidas S1–S19 de `PLAN.md` §4. No añadas
  restricciones ni avisos por tu cuenta; si crees que hace falta uno nuevo, preséntalo como opciones
  (de la más libre a la más protegida) y que decida.
- **Todo dentro de APK IA.** El proyecto es `/sdcard/IA/Proyectos/APK IA`; el repo, `APK IA/PyroHorns`.
- **Al cerrar cada bloque de trabajo:** sigue el checklist de `docs/CONTINUIDAD.md` §2: actualiza
  `docs/ESTADO.md` (estado, siguiente paso, registro) y `PLAN.md` si cambia el alcance, comprueba que
  todo está en verde, haz commit y push. El usuario lo pidió el 2026-11-23 para poder continuar desde
  otro entorno. Nunca subas claves ni secretos.
- Commits en español. Autor ya configurado en el repo: `JoytaHkN <JoytaHkN@users.noreply.github.com>`.

## Entorno (and-code en Android, Linux PRoot)
- `/sdcard` es FUSE: sin enlaces simbólicos ni bit de ejecución. Por eso `node_modules` vive en la
  caché `/workspace/pyrohorns-build`, que nunca se edita a mano.
- **Verificar:** `sh scripts/sync-build.sh` (comprobar tipos + pruebas). Para otro comando en la caché:
  `sh scripts/sync-build.sh npx expo export --platform web`.
- El APK **no** se compila en el móvil (hermesc y el Android SDK solo existen para x86-64; Java no
  arranca). Lo compila GitHub Actions al hacer push a `main`.
- git en `/sdcard` ya está configurado (`core.createObject=rename` y `safe.directory`). No muevas
  carpetas con historial git dentro de `/workspace`: PRoot deja enlaces que luego no se pueden borrar.
- En el shell principal no hagas `cd` fuera de `/sdcard/IA/Proyectos/APK IA`; usa rutas absolutas o
  subshells `( cd … )`.
- GitHub: `gh` tiene sesión iniciada como JoytaHkN en este Linux (Alpine, compartido por Claude Code,
  Codex y OpenCode). Repo público: https://github.com/JoytaHkN/PyroHorns · PWA:
  https://joytahkn.github.io/PyroHorns/
- Clave de firma de prelanzamiento: `APK IA/firma-prelanzamiento/` (fuera del repo; ya está en los
  secretos de GitHub). Para la v1 se creará una clave nueva en el PC.
- Modelos GGUF y mockup: en la raíz de `APK IA`, fuera del repo.

## Stack
Expo SDK 58 · React Native 0.88 · heroui-native 1.1 · Uniwind/Tailwind v4 · TypeScript estricto ·
zustand · expo-sqlite con SQLCipher. Estructura de carpetas: `README.md`.

## Antes de cada commit
- `sh scripts/sync-build.sh` en verde (0 errores de tipos, todas las pruebas OK).
- Si tocas código de plataforma o módulos nativos, genera también el bundle de Android:
  `sh scripts/sync-build.sh sh -c 'npx expo export --platform android --no-bytecode --output-dir dist-android'`.
- Cambios solo de documentación no recompilan el APK (paths-ignore en los workflows).
