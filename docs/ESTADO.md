# Estado de PyroHorns

> Documento vivo para retomar el trabajo desde cualquier agente o entorno. Se actualiza al cerrar
> cada bloque de trabajo (ver `AGENTS.md`).

**Última actualización:** 2026-11-23 · Claude Code (Opus 5.5) en and-code

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
- **Dato para F1.5:** el llama.cpp que fija LMPlayground (commit `dc33e61`, 2026-11-14) ya soporta
  `LLM_ARCH_LFM3`.

## Siguiente paso
1. **F1.5 — prueba de inferencia en el móvil** (`PLAN.md` §5), EN CURSO (visto bueno del usuario, 2026-11-23):
   - Paso 1 ✅: `LlamaProvider` en TypeScript (`src/providers/llama.ts`) con fallback a
     `MockProvider` cuando el módulo nativo no esté disponible; integración en `src/lib/engine.ts`.
   - Paso 2 (pendiente): módulo nativo propio (Expo Modules + JNI) basado en LMPlayground
     (`dc33e61`, vendizado en el repo, compilado con CMake/NDK en CI).
   - Paso 3 (pendiente): comparar abrir el GGUF desde /sdcard con copiarlo al almacenamiento de la app;
     elegir la más rápida.
   - Paso 4 (pendiente): medir TTFT, tok/s y RAM con 1K y 8K de contexto.
   - Sin plan B: directo con el módulo nativo (decisión del usuario).
2. Revisar los PR de Dependabot que quedan: #1–#5 (acciones de GitHub; relanzar su CI, que falló por
   la facturación), #6 uniwind 1.14, y #8 y #10 (esperar al siguiente Expo SDK).

## Pendiente de decisión del usuario
- Propuestas de diseño e interacción P1–P12 (`PLAN.md` §7).

## Prompt para retomar en otro agente
Si cambias de agente (and-code → menú del chat → *Continuar en otro runtime*) o abres un chat nuevo,
envía esto primero:

> Trabaja en /sdcard/IA/Proyectos/APK IA/PyroHorns. Lee AGENTS.md, docs/ESTADO.md y PLAN.md, revisa
> `git log --oneline -10` y continúa con el siguiente paso de docs/ESTADO.md. Responde en español.

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
