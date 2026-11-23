# PyroHorns

Asistente de IA local para Android (React Native + Expo + heroui-native) con la paleta Plasma y la
mascota Ibex. Modelos GGUF en el propio móvil; visor web online como complemento.

- Plan completo por fases: [PLAN.md](PLAN.md)
- Licencia: [GPL-3.0](LICENSE) · Avisos de terceros: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- Repositorio: https://github.com/JoytaHkN/PyroHorns

## Estado

**F1.1 — cierre de F1.** Chat con respuestas simuladas en streaming (el modelo real llega en F1.5),
modos que eligen el modelo, interruptor Profundo con razonamiento plegable, conversaciones en
SQLite cifrado (SQLCipher) con búsqueda de texto completo, contraseña de copia para restaurar
copias de seguridad, proyectos, catálogo GGUF y ajustes.

## Desarrollo en el móvil (and-code)

El código vive en `/sdcard/IA/Proyectos/APK IA/PyroHorns`. `node_modules` no puede estar en
`/sdcard` (no admite enlaces simbólicos), así que las dependencias viven en una caché:

```sh
sh scripts/sync-build.sh                                   # comprobar tipos + pruebas
sh scripts/sync-build.sh npx expo export --platform web    # cualquier otro comando en la caché
```

El APK no se puede compilar en el móvil (hermesc y el Android SDK solo existen para x86-64):
lo compila GitHub Actions.

## Pruebas

`npm test` empaqueta cada `tests/*.test.ts` con esbuild y lo ejecuta con node. Las consultas SQL
se prueban de verdad con `node:sqlite` (Node 22.13 o superior), con el mismo esquema que usa la app.

## GitHub Actions

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `ci.yml` | cada push y PR | tipos + pruebas |
| `android.yml` | push a `main` o manual | APK arm64-v8a (firma de depuración) como artefacto |
| `release.yml` | tag `v*` | APK firmado con la clave de los secretos y publicado en Releases |
| `pages.yml` | push a `main` o manual | PWA (visor online) en GitHub Pages |

Secretos para `release.yml`: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Estructura

- `src/app`: rutas (hero, chat, proyectos, modelos, ajustes, terminal/[kind])
- `src/components`: iconos Plasma, orbe, burbujas, composer, menú lateral, selector de agente, pantalla de restauración
- `src/data`: modelos GGUF y modos
- `src/db`: SQLite cifrado (Android) y almacenamiento del visor web, esquema, copia de seguridad
- `src/lib`: motor de chat, política de contexto, registros
- `src/providers`: contrato `ChatProvider`; `MockProvider` (hasta F1.5)
- `src/store`: estado (conversaciones, ajustes, arranque)
- `tests`: pruebas de lógica
