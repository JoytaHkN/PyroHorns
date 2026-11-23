# Estado de PyroHorns

> Documento vivo para retomar el trabajo desde cualquier agente o entorno. Se actualiza al cerrar
> cada bloque de trabajo (ver `AGENTS.md`).

**Última actualización:** 2026-11-23 · Claude Code (Opus 5.5) en and-code

## Dónde estamos
- **F1** ✅ y **F1.1** ✅ (commit `66dd555`): PyroHorns, conversaciones cifradas con SQLCipher, contraseña
  de copia, Profundo, modo → modelo, contrato del motor ampliado, CI.
- Repo **público** en https://github.com/JoytaHkN/PyroHorns (antes era privado y la facturación de la
  cuenta bloqueaba Actions).
- **CI** ✅ en GitHub (comprobación de tipos + 83 pruebas). **PWA** ✅ publicada en
  https://joytahkn.github.io/PyroHorns/
- **APK de prueba** ✅ compilado en GitHub Actions (run 45186005721) y copiado a
  `APK IA/apk/PyroHorns-0.1.0-F1.1-prueba.apk` (firma de depuración). Comprobado por dentro: solo
  arm64-v8a, identificador `io.github.joytahkn.pyrohorns`, `libexpo-sqlite.so` con SQLCipher y FTS5.
  - Permisos declarados (ninguno se pide al instalar): INTERNET, VIBRATE, USE_BIOMETRIC/FINGERPRINT,
    READ/WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW y DUMP. Varios vienen de plantillas y librerías y
    aún no se usan.
- Secretos de firma de prelanzamiento ya cargados en el repo.
- Dependabot ajustado: ignora lo que fija Expo SDK 58 y las versiones mayores que rompen heroui-native.
  PR #7 (react) y #9 (tailwind-variants 4) cerrados.

## Siguiente paso
1. El usuario instala `APK IA/apk/PyroHorns-0.1.0-F1.1-prueba.apk` y revisa: diseño (CA2, CA5, CA6),
   conversación cifrada, contraseña de copia y restauración. Recoger sus comentarios.
2. Revisar los PR de Dependabot que quedan: #1–#5 (acciones de GitHub; relanzar su CI, que falló por
   la facturación), #6 uniwind 1.14 (probar en el APK), #8 y #10 (esperar al siguiente Expo SDK).
3. **F1.5**: módulo llama.cpp propio basado en LMPlayground, LFM3 respondiendo en el móvil y medición
   de tiempo hasta el primer token, tok/s y RAM (plan B: llama.rn).

## Pendiente de decisión del usuario
- Propuestas de diseño e interacción P1–P12 (`PLAN.md` §7).
- Confirmar la interpretación de S10: los enlaces `javascript:` y `data:` se muestran como texto.
- Propuesta: quitar con `android.blockedPermissions` los permisos que aún no se usan
  (SYSTEM_ALERT_WINDOW, READ/WRITE_EXTERNAL_STORAGE, DUMP) hasta la fase que los necesite.
- Propuesta: publicar una versión de prueba firmada (tag `v0.1.0-alpha.1` → `release.yml`), para que las
  siguientes versiones de prueba se instalen encima sin desinstalar. El APK actual tiene la firma de
  depuración, así que habrá que desinstalarlo antes de pasar a las versiones firmadas.

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
