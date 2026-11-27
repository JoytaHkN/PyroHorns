# Estado de PyroHorns

> Documento vivo para retomar el trabajo. **Máximo 120 líneas** (P31, M9): aquí solo lo vigente.
> Historia: `docs/historial/` · Medidas: `docs/mediciones.md` · Pruebas en el móvil: `docs/pruebas-movil.md`.

**Última actualización:** 2026-11-27 · Claude Sonnet 5.5 en and-code

## Dónde estamos
- **F1, F1.1 y F1.5 cerradas.** Acta de F1.5 en `PLAN.md` §5: motor propio (`modules/pyrohorns-llama`, llama.cpp
  `dc33e61`), sin llama.rn.
- **Hito en curso: v0.2 «Asistente local fiable»** (`PLAN.md` §5). Después, v0.3 «Notas y archivos».
- En la app: chat local con 12+ modelos GGUF, memoria de conversación, internet (DuckDuckGo, botón), agente en la
  nube, asistente (notas, tareas, calendario, alarmas), planilla de intenciones y voz sin nube (whisper.cpp).
- **P31 aprobada el 2026-11-26** («todo lo recomendado» y **M8-b**).
- **APK para probar:** `APK IA/apk/PyroHorns-0.1.0-v0.2-p31-prueba.apk` (+ `.sha256`): compilación 97, commit `c397791`,
  firma de prelanzamiento. Pasar desde un APK con firma de depuración exige desinstalar una vez (se borran sus datos).
- Repo https://github.com/JoytaHkN/PyroHorns · PWA https://joytahkn.github.io/PyroHorns/ · pre-release `v0.1.0-alpha.1`.

## Siguiente paso (orden)
1. ✅ **P31, bloque 1** (`c397791`): M9, M10, M4, M5-b y M8-b. CI en verde; APK comprobado y firmado.
2. **Usuario:** instalar ese APK y probarlo con `docs/pruebas-movil.md`.
3. **M7 + Autoprueba (M3-c):** probar la migración de la base desde cada versión y copiarla antes de migrar; pantalla
   «Autoprueba» en Ajustes.
4. **M6, núcleo del motor:** regla de memoria al cargar en el chat, salida restringida (GBNF/JSON), plantillas Jinja de
   llama.cpp, contexto con el tokenizador real y compactado.
5. **M2:** 10–20 pruebas en español por modo; con los resultados se revisa D1.
6. **v0.3:** P28-F1 + P30-1 (diseño en `PLAN.md`, P28), P29-F1 (SAF) y P28-F5.

**Límite de pruebas (M3-c):** como máximo 3 bloques que cambien el APK sin probar en el móvil. El contador empieza
con el APK del bloque 1 (**va 1 de 3**). El atraso anterior (`docs/pruebas-movil.md`) se prueba antes de empezar v0.3.

## Pendiente de decisión del usuario
- **PR de Dependabot abiertos, todos con CI en verde** (no estaban en lo aprobado en M10). Recomendación: fusionar
  #16 (react-native-svg 15.16.1), #17 (keyboard-controller 1.22.9) y #15 (action-gh-release v3: Node 24, MIT);
  #6 (uniwind 1.14, afecta a los estilos y la CI no los ve) después de probar el APK actual.
- **gradle/actions v6:** su caché es propietaria y exige aceptar los términos de Gradle. Se usa la v5.
- **Criterios de aceptación de v0.2** (propuestos en `PLAN.md` §5).
- **F27-2:** mejorar la planilla con lo aprendido de MASSIVE (hoy acierta el 8,7 %). Recomendación: sí.
- **P17 (Método Brasa):** orden de piezas, seguridad de la memoria guardada y si se descarga LFM2.5-8B-A1B.
- Diseño e interacción P1–P12 (`PLAN.md` §7).

## Abierto (sin decisión)
- Qwen3 respondió en portugués con Profundo apagado; LFM3 mezcla a veces su razonamiento en la respuesta.
- Fórmulas `$…$` en crudo; ≈ 11 s de la carga de Nemotron que no son lectura.
- NVIDIA bloqueó el acceso a la API de la cuenta; alternativa: OpenRouter.
- Dory (parche propio) sin probar en el móvil.
- Medir P13 con la compilación de variantes de CPU.

## Entorno y claves
- Verificar: `sh scripts/sync-build.sh`. APK: solo en GitHub Actions.
- APK de prueba en `APK IA/apk/`; modelos GGUF en `APK IA/`; datos en `APK IA/datasets/` (fuera del repo).
- Clave de prelanzamiento en `APK IA/firma-prelanzamiento/` (fuera del repo).

## Prompt para retomar en otro agente
> Trabaja en /sdcard/IA/Proyectos/APK IA/PyroHorns. Lee AGENTS.md, docs/ESTADO.md, PLAN.md y
> docs/CONTINUIDAD.md; revisa `git log --oneline -10`, `git status` y `gh run list --limit 4`, y continúa
> con el siguiente paso de docs/ESTADO.md. No des por cerrado lo que esté pendiente de decisión o de
> validar en CI/móvil; al cerrar cada bloque actualiza ESTADO.md (y PLAN.md si cambia el alcance), pasa
> `sh scripts/sync-build.sh`, haz commit en español y push. Responde en español.
