# Continuidad entre chats y entornos

> Procedimiento obligatorio para que `AGENTS.md`, `docs/ESTADO.md` y `PLAN.md` estén siempre al día y
> cualquier agente pueda retomar el trabajo sin contexto previo. Vive en el repo (no en la memoria de
> ningún agente): quien abra un chat nuevo debe leerlo igual que los otros tres archivos.

## 1. Al abrir un chat (obligatorio, 2 minutos)

1. Lee `AGENTS.md`, `docs/ESTADO.md`, `PLAN.md` y este archivo.
2. Ejecuta `git log --oneline -10` y `git status`. Puede haber trabajo de otro agente desde el último cierre.
3. Compara la fecha de «Última actualización» de `ESTADO.md` con el último commit. Si hay commits nuevos,
   revisa `git show <sha> -- docs/ESTADO.md`.
4. Verifica el «Siguiente paso» contra el código antes de actuar: puede estar anticuado.
5. Revisa `gh run list --limit 4`. Un bloque marcado ✅ puede estar pendiente de validar en CI o en el móvil.
6. Si el trabajo anterior quedó a medias, `ESTADO.md` debe decir qué está hecho y qué falta. No lo des por
   cerrado; retoma justo ahí.

## 2. Al cerrar cada bloque (checklist)

1. `sh scripts/sync-build.sh` en verde (tipos + pruebas). Si tocaste código nativo, además el bundle
   Android con `--no-bytecode`.
2. Actualiza `docs/ESTADO.md`:
   - «Última actualización» con la fecha y el agente/runtime usado.
   - «Dónde estamos» con lo que quedó cerrado.
   - «Siguiente paso»: marca ✅ lo cerrado; deja el nuevo como pendiente, con lo que falta hacer.
   - «Registro»: una línea por bloque, con el SHA del commit.
3. Si cambias decisiones (D1–D9, S1–S17), fases o riesgos: edita `PLAN.md` **y** su copia idéntica en
   `/sdcard/IA/Proyectos/APK IA/PLAN.md` (`cp PyroHorns/PLAN.md ../PLAN.md`).
4. Si cambias reglas de entorno o procedimiento: edita `AGENTS.md` (`CLAUDE.md` y `GEMINI.md` lo importan).
5. Si vendimizas código de terceros: actualiza `THIRD_PARTY_NOTICES.md`.
6. Si algo queda sin decidir: muévelo a «Pendiente de decisión» en `ESTADO.md` y a la sección 7 de `PLAN.md`.
   Nunca lo presentes como definitivo.
7. `git diff --check` → commit en español → `git push origin main`.
8. Confirma con `gh run list --limit 4` que los workflows están en verde. Si fallan, corrige en un commit nuevo.
9. `git status` limpio.

**Regla de oro:** un bloque no está cerrado hasta que `ESTADO.md` diga qué sigue y el commit esté pusheado.

## 3. Prompt para retomar en and-code (móvil)

> Trabaja en /sdcard/IA/Proyectos/APK IA/PyroHorns. Lee AGENTS.md, docs/ESTADO.md, PLAN.md y
> docs/CONTINUIDAD.md; revisa `git log --oneline -10`, `git status` y `gh run list --limit 4`, y continúa
> con el siguiente paso de docs/ESTADO.md. No des por cerrado lo que esté pendiente de decisión o de
> validar en CI/móvil; al cerrar cada bloque actualiza ESTADO.md (y PLAN.md si cambia el alcance), pasa
> `sh scripts/sync-build.sh`, haz commit en español y push. Responde en español.

## 4. Prompt para retomar desde un PC

> Trabaja en el repositorio PyroHorns clonado en `<RUTA_PC>`. Lee AGENTS.md, docs/ESTADO.md, PLAN.md y
> docs/CONTINUIDAD.md; ejecuta `git log --oneline -10` y `git status`; continúa con el siguiente paso de
> docs/ESTADO.md. En PC usa `npm ci`, `npm run typecheck` y `npm test` directamente (no
> `scripts/sync-build.sh`, que es solo para and-code). Respeta AGENTS.md: planes antes que código,
> actualiza ESTADO.md al cerrar cada bloque, commit en español y push a main. No subas claves ni secretos.
> Responde en español.

## 5. Montar el proyecto en un PC

**Usa el PC directamente, no el modo cloud.** El módulo nativo JNI/CMake necesita Android SDK + NDK
`27.1.12297006` + CMake `3.31.6` y Gradle; el cloud no garantiza eso ni tiene los GGUF (están en el móvil,
no en el repo). El cloud solo sirve para TS/pruebas, y para eso está GitHub Actions.

1. `git clone https://github.com/JoytaHkN/PyroHorns.git` (por ejemplo en `~/Proyectos/PyroHorns`).
2. Instala Node 24, JDK 17 y Android SDK con NDK `27.1.12297006` y CMake `3.31.6`; define
   `ANDROID_SDK_ROOT` y `JAVA_HOME`.
3. Configura el autor: `git config user.name "JoytaHkN"` y
   `git config user.email "JoytaHkN@users.noreply.github.com"`; haz `gh auth login` para poder hacer push.
4. `npm ci` → `npm run typecheck && npm test`.
5. APK: `npx expo prebuild --platform android --no-install` y
   `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` (`gradlew.bat` en Windows).
6. Para probar inferencia, lleva los GGUF al móvil: en Modelos eliges la vía (P14-C). «Carpeta de la app» (por defecto)
   los copia con el selector de archivos a `Paths.document/models`; «Todo el almacenamiento» los abre desde
   `/sdcard/IA/Proyectos/APK IA/` y pide el permiso «Acceso a todos los archivos». Los modelos no están en el repo.
7. Nunca subas `firma-prelanzamiento/` ni claves.
