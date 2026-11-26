# Integraciones: verificación y plan

> Investigación del 2026-11-26. Sirve para retomar cualquiera de estas integraciones sin repetir la búsqueda.
> **Nada de esto está integrado en la app.** Las decisiones pendientes están en `PLAN.md` §7 (P27–P30) y en `docs/ESTADO.md`.

Leyenda: ✅ verificado en una fuente primaria · ⚠️ parcial o pendiente de comprobar · ❌ no se confirma, o la fuente lo contradice.

## 0. Cómo se verificó y qué queda sin verificar

- **GitHub** (`gh api`): licencia (`license`), estado (`archived`, `pushed_at`), árboles de ficheros, READMEs, `LICENSE`/`NOTICE`.
- **Hugging Face** (ficha y `README.md`/`massive.py` en bruto) y **S3** (cabecera HTTP del tar.gz de MASSIVE).
- **Lectura de páginas oficiales** (Dialogflow y Android) y **búsqueda web** para Dropbox, Microsoft y Google.
- **Sin verificar:**
  - **gnu.org** (lista de licencias y GPL-FAQ): no hubo respuesta desde el entorno de trabajo (errores de conexión). La compatibilidad GPL/AGPL queda **pendiente de leer en gnu.org**.
  - **Alcances de Google Drive**: la lectura de la tabla se interrumpió; lo que se dice aquí sale de resúmenes de búsqueda.
  - **Si Google Drive, Dropbox y OneDrive exponen un `DocumentsProvider`** (Storage Access Framework): no confirmado; comprobarlo en el teléfono.

## 1. Licencias: lo que condiciona todo

PyroHorns es **GPL-3.0-only** (`LICENSE` y `package.json` ✅). Cada candidato se revisa contra esa licencia:

| Elemento | Licencia | ¿Cabe en PyroHorns? | Notas |
|---|---|---|---|
| MASSIVE, código | Apache-2.0 ✅ (`LICENSE.txt`) | ✅ con avisos Apache | GitHub no la detecta (`NOASSERTION`) porque el fichero combina textos |
| MASSIVE, datos | CC BY 4.0 ✅ (`NOTICE.md`; ficha HF `cc-by-4.0`) | ✅ con atribución | Atribuir a Amazon; el dataset deriva de SLURP (CC BY 4.0) |
| SNIPS (`sonos/nlu-benchmark`) | CC0-1.0 ✅ | ✅ | En inglés. Los papers piden cita completa |
| Leon (`leon-ai/leon`) | MIT ✅ | ✅ | Activo (último cambio el 2026-11-26) |
| Mycroft: 11 habilidades con `es-*` | Apache-2.0 ✅ (por repositorio) | ✅ revisando cada repo | Una de ellas archivada |
| `MycroftAI/mycroft-skills` (repo principal) | Sin licencia detectada ✅ | ❌ no copiar | Archivado; sin carpetas de idioma |
| AppFlowy (aplicación) | AGPL-3.0 ✅ | ⚠️ requiere decisión y revisión legal | Ver §3.2 |
| AppFlowy-editor (paquete) | AGPL-3.0 **o** MPL-2.0 ✅ (doble licencia) | ⚠️ MPL-2.0 sería la vía menos exigente | Dart/Flutter; no encaja de forma directa en React Native |
| AnExplorer | Apache-2.0 ✅ | ✅ con NOTICE | Activo (último cambio el 2026-06-02) |
| Gestor de archivos + (`com.alphainventor.filemanager`) | Propietaria ✅ (ficha de terceros) | ❌ no hay código que copiar | Solo como referencia de funciones |
| MEGA SDK (`meganz/sdk`) | BSD-2-Clause ✅ | ✅ | C++; se integraría por JNI, como llama.cpp y whisper |

**Consecuencia:** Apache-2.0, MIT, BSD-2, CC0 y CC BY 4.0 son permisivas y se pueden combinar con GPL-3.0; que la FSF lo confirme en su lista de licencias queda ⚠️ pendiente (no accesible ahora). El caso delicado es **AGPL-3.0** (AppFlowy): mezclarla con código GPL-3.0-only exige decidir la licencia del conjunto y, idealmente, una revisión legal. Si el proyecto tiene un único titular, esa decisión es suya; si hubo contribuciones de terceros, hay que revisarlas antes.

## 2. Datasets de intenciones (P27)

### 2.1 Lo que afirmaste frente a lo que dice la fuente

| Afirmación | Resultado | Fuente |
|---|---|---|
| MASSIVE: más de 16.000 frases en español | ✅ es-ES: **16.521** (train 11.514 · dev 2.033 · test 2.974) | Ficha HF, tabla de MASSIVE (fila es-ES) |
| MASSIVE: 60 intenciones | ✅ 60 intenciones y 18 dominios | Ficha HF; `massive.py` (lista de intenciones) |
| Las 33 intenciones del listado | ✅ las 33 existen en el cargador oficial | `massive.py` |
| MASSIVE «es el estándar de la industria» | ⚠️ Corpus de investigación muy citado; no lo he verificado como estándar | — |
| Ejemplo JSON de `alarm_set` | ⚠️ Formato correcto pero incompleto: cada línea trae también `worker_id`, `slot_method` y `judgments` | README de `alexa/massive` (ejemplo de-DE) |
| Descarga de MASSIVE | ✅ tar.gz oficial de **39.500.415 bytes**; dentro, `1.0/data/<idioma>.jsonl` | README; cabecera HTTP de S3 |
| SNIPS: ~14.000 frases y 7 intenciones | ✅ Conjunto de 2017 con 7 intenciones (tabla de MASSIVE: 14.484 frases), **en inglés** | README de `2017-06-custom-intent-engines`; tabla de MASSIVE |
| SNIPS «built-in intents» con traducciones validadas al español | ❌ La ficha indica `language:en`, 328 frases y 10 clases. La única variante traducida de la tabla es la francesa | Ficha HF `sonos-nlu-benchmark/snips_built_in_intents`; tabla de MASSIVE |
| Mycroft: +50 paquetes con `locale/es-es` y archivos `.intent` | ⚠️ 62 repositorios de la organización coinciden con «skill»; **11** tienen carpetas `es-*`, todas Apache-2.0. Sus ficheros son `.voc`, `.dialog` y `.rx`, no `.intent` (p. ej., `skill-weather`: 11 `.voc`, 25 `.dialog`, 1 `.rx`). El repo principal está archivado | API de GitHub (`git/trees`) |
| Leon: habilidades en español con archivos de intención | ❌ Las habilidades nativas tienen locales en inglés (27) y francés (6); ningún español. Sus ficheros son JSON | Árbol de `leon-ai/leon` |
| Dialogflow: agentes preconstruidos en español para domótica, alarmas y navegación | ❌ La página no enumera agentes ni idiomas, no menciona domótica ni alarmas, y «navegación» aparece solo como caso de uso. Son de región global y importar crea un agente nuevo | `docs.cloud.google.com/dialogflow/es/docs/agents-prebuilt` (leída) |
| Gemini o GPT-4o-mini con las 60 intenciones en el prompt | ⚠️ Técnicamente posible. Es un servicio en la nube: el texto sale del teléfono, lo que choca con P25 («sin nube») | — |
| Mycroft y Leon como «proyectos vivos» | ⚠️ Mycroft AI cerró en 2023; el proyecto sigue como fork comunitario (OpenVoiceOS). Leon está activo (MIT) | Wikipedia; The Register (13-02-2023); community.mycroft.ai |

### 2.2 MASSIVE en detalle

- **Formato** (README): una línea JSON por frase, con `id`, `locale`, `partition` (train/dev/test), `scenario`, `intent`, `utt`, `annot_utt` (`[time : nueve de la mañana]`), `worker_id`, `slot_method` y `judgments`.
- **Dominios e intenciones**: 18 dominios y 60 intenciones. Agrupadas por dominio (el nombre de la intención empieza por el dominio):

```text
alarm:          alarm_set, alarm_remove, alarm_query
audio:          audio_volume_up, audio_volume_down, audio_volume_mute, audio_volume_other
calendar:       calendar_set, calendar_query, calendar_remove
cooking:        cooking_query, cooking_recipe
datetime:       datetime_query, datetime_convert
email:          email_sendemail, email_query, email_querycontact, email_addcontact
general:        general_greet, general_joke, general_quirky
iot:            iot_hue_lighton, iot_hue_lightdim, iot_hue_lightchange, iot_hue_lightoff,
                iot_hue_lightup, iot_wemo_on, iot_wemo_off, iot_cleaning, iot_coffee
lists:          lists_createoradd, lists_query, lists_remove
music:          music_likeness, music_dislikeness, music_query, music_settings
news:           news_query
play:           play_music, play_radio, play_podcasts, play_audiobook, play_game
qa:             qa_factoid, qa_definition, qa_maths, qa_currency, qa_stock
recommendation: recommendation_events, recommendation_locations, recommendation_movies
social:         social_post, social_query
takeaway:       takeaway_order, takeaway_query
transport:      transport_query, transport_traffic, transport_taxi, transport_ticket
weather:        weather_query
```

- **Versión**: el dataset que citan el README y la ficha es **1.0** (51 idiomas). La 1.1 añade catalán (52 idiomas).

### 2.3 Qué cubre ya la planilla

La planilla (`src/lib/assistant/catalog.ts`) resuelve hoy alarmas (poner), calendario (crear y abrir un día), listas (añadir y completar), hora y fecha, temporizadores, llamadas, correo (buscar), notas y tareas. Las intenciones de MASSIVE que **la app no hace** (música, radio, clima, tráfico, domótica, cocina, recomendaciones, preguntas generales) deberían ir al modelo o a internet, nunca a una acción. La cobertura y los falsos positivos se miden con P27-F1, no antes.

## 3. Notas, bloc de notas y agenda (P28)

### 3.1 AppFlowy

- ✅ Repositorio `AppFlowy-IO/AppFlowy`: **AGPL-3.0**, Dart, activo (último cambio el 2026-11-15), unas 79.500 estrellas. Se describe como alternativa de código abierto a Notion.
- ✅ Android: el README indica la aplicación en Google Play (`io.appflowy.appflowy`) para **Android 10 o superior**.
- ✅ Tecnología: Flutter (Dart) con un núcleo en Rust. No es una biblioteca que se incorpore a una app React Native sin un motor Flutter aparte.
- ✅ El editor (`AppFlowy-editor`) tiene **doble licencia AGPL-3.0 o MPL-2.0**.

### 3.2 Licencia

PyroHorns es GPL-3.0-only. Copiar código AGPL o integrarlo obliga a decidir la licencia del conjunto. ⚠️ El texto de la sección 13 de la GPLv3 y de la AGPLv3 (el que regula la combinación) **no se pudo leer** desde el entorno; las fuentes de comentario que aparecieron dicen que la combinación es posible y que el resultado queda bajo AGPL. Recomendación: no copiar código de AppFlowy sin decisión del titular y revisión legal.

### 3.3 Aplicaciones predeterminadas en Android

- ✅ Android define roles de sistema con `RoleManager`: HOME, DIALER, SMS, ASSISTANT y BROWSER (desde API 29), y **NOTES** (`android.app.role.NOTES`, desde **API 34 = Android 14**).
- ✅ Para ocupar NOTES, la app necesita una actividad con el filtro `android.intent.action.CREATE_NOTE` (categoría DEFAULT) y los atributos `showWhenLocked` y `turnScreenOn` (fila NOTES de source.android.com, leída por un agente; verificar).
- ✅ La app pide el rol con `createRequestRoleIntent`; el sistema muestra el diálogo y el usuario concede o no. **No hay una vía documentada para forzarlo.**
- ✅ El teléfono del usuario (HUAWEI LMR-LX9) tiene **Android 12** (memoria del proyecto): el rol NOTES **no existe ahí**.
- ✅ Agenda y alarmas ya usan el calendario y el reloj del sistema (`CalendarContract`, `AlarmClock`).
- **Conclusión:** en Android 12 no hay una forma oficial de hacer «predeterminada» una app de notas. Lo que sí se puede: que la app declare filtros para `ACTION_SEND` (texto) y, en Android 14 o superior, `CREATE_NOTE`, y que el usuario la elija con «Siempre», o llevarle a la pantalla de aplicaciones predeterminadas (acción exacta por verificar).

### 3.4 Interpretación de «estudiar como Obsidian o Notion»

Se entiende como apuntes con **enlaces entre notas** (backlinks), **bloques** y **tablas sencillas**, y opcionalmente **tarjetas de estudio**. Es una interpretación: confirmar con el usuario.

## 4. Archivos y nubes (P29)

### 4.1 AnExplorer

- ✅ `1hakr/AnExplorer`: **Apache-2.0**, Java, activo (último cambio el 2026-06-02), unas 2.060 estrellas.
- ✅ El README describe almacenamiento local, tarjeta SD, USB/OTG y un **servidor FTP** («Network Manager»).
- ❌ **El README no menciona Google Drive, Dropbox, OneDrive, Box ni Mega.** La premisa de que «integra nubes» no se confirma en esta fuente.

### 4.2 Gestor de archivos + (`com.alphainventor.filemanager`)

- ✅ Propietaria y gratuita con compras (ficha de terceros). No hay repositorio público verificado: no hay código que copiar.
- ⚠️ Nubes según fichas de terceros: Google Drive, OneDrive, Dropbox, Box y Yandex; también NAS, FTP y SMB (APKPure).
- ❌ **Mega no aparece** en ninguna de las fichas consultadas.

### 4.3 Storage Access Framework (SAF)

- ✅ La documentación oficial describe los `DocumentsProvider` y `ACTION_OPEN_DOCUMENT` / `ACTION_OPEN_DOCUMENT_TREE`: el usuario elige el archivo o la carpeta en el selector del sistema, sin dar credenciales a la app.
- ⚠️ Que Google Drive, Dropbox y OneDrive expongan un `DocumentsProvider` está sugerido por fuentes secundarias. **Comprobar en el teléfono.**

### 4.4 Proveedores

- **Google Drive**: ⚠️ según el resumen de búsqueda, los alcances se clasifican en no sensibles, sensibles y restringidos; el de acceso completo (`drive`) es restringido. Para empezar, el candidato es `drive.file` (solo archivos que la app crea o que el usuario abre); su clasificación exacta y la recomendación de Google quedan por leer en la tabla de alcances. Una revisión de alcances restringidos puede tardar semanas; la auditoría anual aplica a servicios que almacenan o transmiten datos restringidos en servidores propios, y una app sin servidor probablemente no entra (⚠️ confirmar). En Android hace falta un cliente OAuth con la huella SHA-1 del firmante.
- **Dropbox**: ✅ la guía OAuth recomienda PKCE para apps móviles que no pueden guardar un secreto; hace falta la *app key*. ⚠️ Los detalles de Android (intent-filter `db-<app_key>`) vienen de documentación de terceros.
- **OneDrive (Microsoft Graph)**: ✅ permiso delegado `Files.ReadWrite` para los archivos del propio usuario, con MSAL para Android y registro de la app en Azure. ⚠️ Revisar la versión vigente de MSAL.
- **MEGA**: ✅ SDK en C++ con licencia **BSD-2-Clause**, ejemplo para Android con enlaces Java generados con SWIG. Requiere integración nativa (JNI, como llama.cpp y whisper) y gestión propia de la cuenta.
- **WebDAV** (Nextcloud y similares): ⚠️ estándar abierto (RFC 4918), no verificado en esta sesión.

### 4.5 Acceso a archivos en PyroHorns

Ya existe el acceso a todos los archivos para cargar modelos (P14, `MANAGE_EXTERNAL_STORAGE`, S3). Un explorador tendría que usar ese mismo permiso o, mejor, SAF. Cualquier opción debe respetar S3 (modo de acceso elegido por el usuario).

## 5. Integración con nuestra IA (P30)

- **Estado** (verificado en `docs/ESTADO.md`, `PLAN.md` y el esquema de base de datos): planilla de intenciones (16 intenciones); modelo local (LFM3 ≈ 2,6 GB de RAM en el pico, Nemotron ≈ 6 GB; P13); búsqueda de texto completo FTS5 sobre los mensajes (`messages_fts`); el modelo local ha inventado datos (P15, P17).
- **Coste del prompt**: si se pasan las 60 intenciones de MASSIVE en el prompt, el prefill sube. ⚠️ Estimación: ~1.000–1.500 tokens, que con el prefill medido (~60 tok/s con dotprod) son unos 15–25 s sin caché y pocos segundos con la instrucción precargada (`warm`). Hay que medirlo.
- **Propuesta**: la planilla sigue siendo la primera vía; las acciones de notas, agenda y archivos pasan por el almacén elegido (P28) o por las apps del sistema; el modelo local solo responde o propone, y toda acción se confirma (S19).

## 6. Preguntas abiertas (espejo de `PLAN.md` §7)

1. **MASSIVE**: ¿solo evaluación interna fuera del APK, o plantillas derivadas dentro del APK con atribución?
2. **SNIPS y Mycroft/Leon**: ¿referencia de formatos, o copiar plantillas de las 11 habilidades `es-*` (Apache-2.0) tras revisar cada repo?
3. **Nube para NLU** (Dialogflow, Gemini, GPT): ¿descartado por «sin nube» (P25), o opcional con consentimiento por uso?
4. **AppFlowy**: ¿app externa, versión propia inspirada en ella, o integración de código (solo tras revisión legal)?
5. **Licencia**: ¿mantener GPL-3.0-only y no mezclar AGPL?
6. **Almacenamiento de notas**: ¿base cifrada (S7), carpeta Markdown tipo Obsidian sin cifrar, o ambas?
7. **Predeterminadas**: ¿ajustes y aviso (Android 12 no tiene rol NOTES), o también el rol NOTES en Android 14+?
8. **Nubes**: ¿primero SAF, o OAuth directo para Drive, Dropbox y OneDrive? ¿Mega, sí o no?
9. **Permisos de archivos**: ¿SAF solamente, o también «todo el almacenamiento» (S3)?

## 7. Fuentes

- Repositorios (vía `gh api`): `alexa/massive`, `sonos/nlu-benchmark`, `MycroftAI/mycroft-skills`, `leon-ai/leon`, `AppFlowy-IO/AppFlowy`, `AppFlowy-IO/appflowy-editor`, `1hakr/AnExplorer`, `meganz/sdk`, y los 11 repositorios de Mycroft con carpetas `es-*` (p. ej., `skill-weather` y `mycroft-timer`).
- Hugging Face: `AmazonScience/massive` (ficha, `README.md`, `massive.py`); `sonos-nlu-benchmark/snips_built_in_intents` (ficha).
- S3: `https://amazon-massive-nlu-dataset.s3.amazonaws.com/amazon-massive-dataset-1.0.tar.gz` (cabecera).
- Dialogflow: `https://docs.cloud.google.com/dialogflow/es/docs/agents-prebuilt?hl=es-419` (leída).
- Android: `https://developer.android.com/reference/android/app/role/RoleManager` (leída); `https://source.android.com/docs/core/config/android-roles` (leída); `https://developer.android.com/guide/topics/providers/document-provider` (búsqueda).
- Mycroft (cierre): `https://en.wikipedia.org/wiki/Mycroft_(software)`; `https://www.theregister.com/2023/02/13/linux_ai_assistant_killed_off/`; `https://community.mycroft.ai/t/mycroft-winding-down-operations/13350` (búsqueda).
- Gestor de archivos +: `https://alternativeto.net/software/file-manager-/about` (ficha de terceros).
- Google Drive: `https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification` (búsqueda); tabla de alcances en `https://developers.google.com/workspace/drive/api/guides/api-specific-auth` (sin leer).
- Dropbox: `https://developers.dropbox.com/oauth-guide` (búsqueda).
- OneDrive: `https://learn.microsoft.com/en-us/onedrive/developer/rest-api/getting-started/graph-oauth` (búsqueda).
- No accesibles en esta sesión: `https://www.gnu.org/licenses/license-list.html`, `https://www.gnu.org/licenses/gpl-faq.html`, `https://www.gnu.org/licenses/gpl-3.0.html` (sección 13).

## 8. Comandos para repetir la verificación

```bash
# Licencia y estado de un repositorio
gh api repos/alexa/massive --jq '{license: .license.spdx_id, archived, pushed_at}'
# Licencia de los datos de MASSIVE
gh api repos/alexa/massive/contents/NOTICE.md --jq .content | base64 -d
# Ficha de MASSIVE: tamaños por partición y lista de intenciones
curl -s https://huggingface.co/datasets/AmazonScience/massive/raw/main/README.md
curl -s https://huggingface.co/datasets/AmazonScience/massive/raw/main/massive.py
# Tamaño del tar.gz oficial (solo cabeceras)
curl -sI https://amazon-massive-nlu-dataset.s3.amazonaws.com/amazon-massive-dataset-1.0.tar.gz | grep -i content-length
# Árbol de un repositorio y búsqueda de carpetas de idioma
gh api "repos/MycroftAI/skill-weather/git/trees/HEAD?recursive=1" --jq '[.tree[].path | select(test("(^|/)locale/es[^/]*/"))] | length'
# Repositorios de la organización Mycroft con «skill»
gh api "search/repositories?q=org:MycroftAI+skill&per_page=100" --jq '.items[].name'
```

Nota: el tar.gz de MASSIVE (≈ 39,5 MB) no se ha descargado. Se guardará fuera del repositorio, en `APK IA/datasets/`, con su huella SHA-256 registrada (como S12), cuando se apruebe P27-F1.

## 9. Guía de decisiones: recomendación e impacto

Para cada decisión de P27–P30: la opción recomendada, **qué cambia** en el código y **cómo afecta** (seguridad, licencias, tamaño, distribución, esfuerzo y si se puede deshacer). El esfuerzo es relativo entre opciones (pequeño, medio, grande); no es una estimación de horas.

**Datos verificados para esta guía (2026-11-26):**
- ✅ `expo-file-system` 58.0.14, ya instalado, abre el selector de archivos del sistema (`File.pickFileAsync`, usado al importar GGUF en `src/lib/model-import.ts`), y su código Android incluye el selector de carpetas (`ACTION_OPEN_DOCUMENT_TREE`) con permiso persistente. Falta confirmar la función JavaScript que lo expone.
- ✅ Bibliotecas libres de inicio de sesión: AppAuth-Android (Apache-2.0), MSAL para Android (MIT), SDK de Dropbox para Java (MIT). Para extraer texto de PDF: PdfBox-Android (Apache-2.0; último cambio en marzo de 2024).
- ⚠️ La política de inclusión de F-Droid prohíbe bibliotecas propietarias como Google Play Services, y marca con «antifunciones» (sin excluir la app) ciertos usos. La etiqueta que correspondería por usar nubes no libres está por confirmar en `f-droid.org/en/docs/Inclusion_Policy`. Consecuencia: Google Drive por OAuth tendría que ir con AppAuth, no con el inicio de sesión de Google.
- ✅ `app.json` ya usa un plugin de configuración propio (`plugins/with-legacy-packaging.js`): es la vía para añadir filtros de intent al manifiesto.

### P27 · Datos de intenciones

**P27-1 · Uso de MASSIVE.** Recomendado: **(a) solo evaluación interna.**
- (a) Evaluación interna. **Qué cambia:** un script, fuera del APK, lee `es-ES.jsonl` y pasa cada frase por `parseRoute`, como hacen las pruebas; los resultados se anotan aquí. **Cómo afecta:** la app no cambia y no hay atribución dentro de ella. Esfuerzo pequeño. Se puede deshacer.
- (b) Plantillas derivadas dentro del APK. **Qué cambia:** frases y sinónimos nuevos en `catalog.ts`, `rules.ts` y `slots.ts`, con sus pruebas, y atribución CC BY 4.0 en `THIRD_PARTY_NOTICES.md`. **Cómo afecta:** se resuelven más órdenes sin modelo, pero sube el riesgo de que la planilla capture preguntas que hoy van al modelo; sin la medición de (a), ese riesgo no se controla. Esfuerzo medio. Se deshace quitando las plantillas.
- (c) Ambas: (a) primero y, con sus cifras, (b).
- Ten en cuenta: MASSIVE es español de España traducido del inglés; pueden faltar expresiones de Latinoamérica.

**P27-2 · SNIPS.** Recomendado: **(a) no usar.** Con (a) no cambia nada; con (b) solo cambia la documentación, y no aporta español.

**P27-3 · Mycroft y Leon.** Recomendado: **(a) solo referencia de formatos.**
- (a) Referencia. La app no cambia; sus vocabularios `.voc` sirven como ideas de sinónimos.
- (b) Copiar las 11 habilidades `es-*`. **Qué cambia:** convertir `.voc`, `.rx` y `.dialog` a la sintaxis de `template.ts` (no son compatibles) y añadir los avisos Apache-2.0. **Cómo afecta:** cubren sobre todo clima, reproducción, hora, fecha, temporizador e IP; la app no ejecuta clima ni reproducción, y hora, fecha y temporizador ya están en la planilla. Esfuerzo medio para poco beneficio. Se puede deshacer.
- (c) No usar. Nada cambia.

**P27-4 · NLU en la nube (Dialogflow, Gemini, GPT).** Recomendado: **(a) no.**
- (a) No. Se mantiene P25 (voz sin nube) y el uso sin conexión.
- (b) Opcional con consentimiento. **Qué cambia:** un ajuste nuevo («entender órdenes con la nube») que reutiliza `src/providers/cloud.ts` y las claves del almacén seguro (S5). **Cómo afecta:** cada orden enviaría el texto (y los nombres de contactos, si se incluyen) a un tercero; necesita conexión, añade latencia y puede tener coste; en F-Droid podría llevar una antifunción. Esfuerzo medio. Se deshace apagando el ajuste.

**P27-5 · Descargar MASSIVE (39,5 MB).** Recomendado: **(a) sí.**
- (a) Sí. El archivo queda en `APK IA/datasets/massive-1.0/`, fuera del repo y del APK, con su huella SHA-256 anotada aquí. La app no cambia.
- (b) No. Sin los datos no se puede medir la planilla: P27-F1 queda bloqueada.

### P28 · Notas, bloc de notas y agenda

**P28-1 · Camino.** Recomendado: **(b) versión propia**, con (a) como complemento.
- (b) Versión propia. **Qué cambia:** pantallas nuevas (lista, editor, agenda) en `src/app/`, tablas nuevas en la base cifrada (migración v6) para notas y enlaces, y la vista Markdown reutiliza `src/components/markdown.tsx`. **Cómo afecta:** la planilla y la IA escriben y buscan directamente en las notas (P30); licencia limpia (GPL); el APK casi no crece. Esfuerzo grande, por fases.
- (a) AppFlowy como app externa. **Qué cambia:** un botón «Abrir en AppFlowy» o «Enviar a AppFlowy» (intent al paquete `io.appflowy.appflowy`; que acepte texto compartido está por comprobar). **Cómo afecta:** esas notas viven en AppFlowy, fuera de PyroHorns; la planilla no escribe en ellas y la IA no puede buscarlas. Esfuerzo pequeño.
- (c) Editor de AppFlowy incrustado (Flutter). **Qué cambia:** el motor de Flutter dentro del APK y dos sistemas de interfaz en la misma app. **Cómo afecta:** APK mucho mayor (por medir), CI más lento, licencia AGPL o MPL. Esfuerzo muy grande. No recomendado.
- (d) Copiar código de AppFlowy. Está en Dart y Rust: no se reutiliza en React Native sin reescribirlo, y es AGPL. No recomendado.

**P28-2 · Almacenamiento.** Recomendado: **(a) base cifrada con exportación a Markdown.**
- (a) SQLCipher y exportación. **Cómo afecta:** cumple S7 (cifrado) y S8 (copias con contraseña); la búsqueda FTS5 es inmediata (P30-1); exportar a una carpeta elegida sirve para Obsidian o para subir a la nube. No permite editar a la vez desde Obsidian. Esfuerzo medio. Se deshace exportando.
- (b) Carpeta Markdown sin cifrar (bóveda tipo Obsidian). **Cómo afecta:** las notas quedan en texto plano, fuera de S7 (es una decisión de seguridad); compatible con Obsidian; si la carpeta está en Drive, Dropbox u OneDrive, la sincroniza su app (si el proveedor permite elegir carpetas: comprobar); más lento por SAF y con conflictos si otra app edita a la vez; buscar exige indexar los archivos. Esfuerzo medio-grande. **Difícil de deshacer** sin una importación.
- (c) Ambas. Cifrada por defecto y bóveda opcional: dos almacenes y su sincronización, el doble de código. Solo después de (a).

**P28-3 · Alcance «como Obsidian o Notion».** Recomendado: **(a) enlaces, bloques y tablas.**
- (a) **Qué cambia:** sintaxis `[[nota]]` con retroenlaces (tabla de enlaces), bloques (títulos, listas, casillas, citas, código) y tablas Markdown sencillas, con una barra de formato en el editor. Esfuerzo medio-grande.
- (b) Lo anterior más tarjetas de estudio: tarjetas de pregunta y respuesta sacadas de las notas, repaso espaciado (tipo SM-2), pantalla de repaso y recordatorios. Esfuerzo grande; es la opción más útil para estudiar.
- (c) Solo texto: ampliar la pantalla actual «Notas y tareas». Lo más rápido, sin enlaces.

**P28-4 · Aplicaciones predeterminadas.** Recomendado: **(a) ajustes, aviso, pantalla del sistema y rol NOTES en Android 14+.**
- (a) **Qué cambia:** filtros de intent en el manifiesto (`ACTION_SEND` de texto; `CREATE_NOTE`, con `showWhenLocked` y `turnScreenOn`, para el rol NOTES) mediante un plugin de configuración; petición del rol con `RoleManager` solo en API 34 o superior; selector por categoría en Ajustes con el aviso de qué se reemplaza. **Cómo afecta:** exige recompilar el APK en CI; en tu Android 12 solo funciona «Siempre» en el selector del sistema; lo que llegue compartido se muestra para revisarlo antes de guardarlo (S11).
- (b) Solo ajustes. Sin tocar el manifiesto: la app decide dónde guardar (sistema o propia) y nada cambia fuera de ella.

**P28-5 · Licencia del proyecto.** Recomendado: **(a) mantener GPL-3.0-only.**
- (a) Se puede incorporar código Apache-2.0, MIT, BSD-2 y MPL-2.0 (este último por archivo), con sus avisos. AppFlowy, solo como referencia o como app externa.
- (b) Revisar la licencia (por ejemplo, pasar a AGPL-3.0 para incorporar AppFlowy). Las obligaciones AGPL alcanzarían a todo el conjunto; hace falta el acuerdo de todos los titulares del código y asesoría. **Prácticamente irreversible** una vez publicado.

### P29 · Archivos y nubes

**P29-1 · Primera fase.** Recomendado: **(a) SAF.**
- (a) SAF. **Qué cambia:** se reutiliza `expo-file-system` (archivos ya; carpetas con permiso persistente en su código Android). **Cómo afecta:** la app no guarda cuentas ni tokens; aparecen Drive, Dropbox u OneDrive si sus apps exponen un `DocumentsProvider` (comprobar en el teléfono; algunos no permiten elegir carpetas); el usuario elige cada archivo o carpeta y no hay un listado general de la nube. Esfuerzo pequeño-medio.
- (b) OAuth desde el principio. **Qué cambia:** registros en Google Cloud (cliente Android con la huella SHA-1 de la firma; si F-Droid firmara con otra clave, habría que registrar las dos), en Dropbox y en Azure; bibliotecas AppAuth, MSAL y SDK de Dropbox (libres), no el inicio de sesión de Google (Play Services); tokens en el almacén seguro (S5). **Cómo afecta:** Google revisa los alcances sensibles o restringidos (puede tardar semanas) y el APK crece. Esfuerzo grande. Se deshace retirando las cuentas y revocando los registros.

**P29-2 · Acceso a archivos.** Recomendado: **(a) SAF, sin «todo el almacenamiento».**
- (a) Mínimo privilegio. `MANAGE_EXTERNAL_STORAGE` sigue declarado para los modelos (D9), pero el explorador no lo usa.
- (b) Además «todo el almacenamiento» (S3 ya lo permite si lo eliges): navegación por rutas como un gestor clásico (memoria interna, SD, USB), más rápida; la app puede leer todo.

**P29-3 · Código de AnExplorer.** Recomendado: **(a) reimplementar.**
- (a) Interfaz en React Native coherente con la app; lógica en `expo-file-system` y, si hace falta, en el módulo nativo; código propio.
- (b) Reutilizar su Java (Apache-2.0). Hay que conservar sus avisos en `THIRD_PARTY_NOTICES.md`; su interfaz son Activities y Fragments, no React Native, así que habría que adaptarla mucho o integrarla como pantallas nativas aparte. Interesa sobre todo para USB-OTG y su servidor FTP.

**P29-4 · MEGA.** Recomendado: **(a) más adelante.**
- (a) Nada ahora. Si la app de MEGA aparece en el selector del sistema, se podría usar por SAF sin SDK (comprobar).
- (b) Ahora. SDK en C++ (BSD-2) con enlaces Java vía SWIG: otro proyecto CMake (como `whisper_ext`), CI más largo, APK mayor (por medir) e inicio de sesión de MEGA, con 2FA, dentro de la app (S5). Esfuerzo grande.
- (c) No. Nada cambia.

**P29-5 · Escritura en la nube.** Recomendado: **(a) leer por defecto y escribir al confirmar.**
- (a) Cada subida, borrado o sobrescritura pide confirmación (como S19); no hay trabajo en segundo plano.
- (b) Sincronización automática: servicio en segundo plano (WorkManager), resolución de conflictos, más batería y datos, y riesgo de perder cambios en un conflicto. Mucho más código y pruebas.

### P30 · Integración con la IA

**P30-1 · Búsqueda en notas.** Recomendado: **(a) FTS5 ahora.**
- (a) Tabla virtual `notes_fts` con disparadores, como `messages_fts` (migración nueva), e intención «busca en mis notas …» en la planilla; responde sin modelo y sin conexión. Esfuerzo pequeño-medio. Depende de P28-2 (a).
- (b) Embeddings (F4): un modelo GGUF de embeddings (por elegir; cientos de MB) que corre con llama.cpp en el teléfono, más almacenamiento de vectores y cálculo al guardar. Entiende preguntas por su significado. Esfuerzo grande; más batería y espacio.

**P30-2 · Indexar archivos.** Recomendado: **(a) nombres y metadatos.**
- (a) Una tabla (URI, nombre, tipo, tamaño, fecha) en la base cifrada; «busca el archivo …» desde la planilla. Esfuerzo pequeño.
- (b) Texto completo de los archivos elegidos, con límite. Extraer el texto: TXT y Markdown directamente; PDF necesita una biblioteca (por ejemplo PdfBox-Android, Apache-2.0, poco activa desde 2024). El texto queda en la base cifrada (S7) y lo que llegue al modelo se trata como datos (S4, S18). Esfuerzo medio-grande; más espacio.
- (c) No indexar: la IA no ve los archivos.

**P30-3 · Intenciones fuera de la planilla.** Recomendado: **(a), con un ajuste.**
- (a) Modelo local con la lista de intenciones, tras medir. Ajuste recomendado: listar solo las intenciones que la app ejecuta (unas 15), no las 60 de MASSIVE. Hay dos formas: en el prompt de sistema (se procesa una vez al cargar, con `warm`, pero ocupa contexto en todas las conversaciones) o junto al mensaje cuando parece una orden (como hoy `assistContext`; se paga en cada mensaje). La app sigue validando (`problemOf`) y confirmando (S19).
- (b) Solo responder. Hoy el modelo ya puede proponer acciones con bloques (P20), y desde P26 el evento, la alarma y el temporizador esperan un toque. Con (b) se quitaría esa vía para lo que la planilla no entienda: más seguro, menos útil.
- (c) Nube con consentimiento: comprende mejor, pero el texto sale del teléfono; reutiliza los proveedores de nube (P19, P23) y S5. Choca con P25 en la voz salvo excepción.

### Dependencias y orden recomendado

- P27-F1 solo depende de P27-5 (la descarga).
- P28-1 (b) con P28-2 (a) hacen posible P30-1. Con P28-1 (a), P30 no alcanza esas notas.
- P29-1 (a) sirve para la exportación de P28-2 y para el índice de P30-2.
- P28-5 decide si P28-1 (c) o (d) son posibles.
- P29-1 (b) condiciona F-Droid: AppAuth, no Play Services.
- **Orden sugerido:** 1) P27-F1, medir la planilla; 2) P28-F1 y P30-1, notas cifradas con búsqueda; 3) P29-F1, explorador con SAF; 4) P28-F5, Ajustes y predeterminadas; 5) P29-F2, OAuth, si lo quieres; 6) MEGA.
- **Difíciles de deshacer:** P28-2 (dónde viven las notas), P28-5 (licencia), P29-1 (b) (registros y revisión de Google) y P27-1 (b) (la atribución se queda).

## 10. Resultados de P27-F1: la planilla frente a MASSIVE (2026-11-26)

**Datos** (fuera del repo, en `APK IA/datasets/massive-1.0/`; huellas en `SHA256SUMS`):
- `amazon-massive-dataset-1.0.tar.gz`: 39.500.415 bytes, SHA-256 `7df623fd2d300a4d235d6ee5bd396c9a28258d3a0ccb29abdb054506eba153f8`. Solo se extrajeron `1.0/data/es-ES.jsonl` (SHA-256 `310462a79fa181ff83c643a8d356c7b8155fd37a25e80a77ba3ca9b29305c4a5`) y `1.0/LICENSE` (CC BY 4.0). Sin rutas sospechosas en el archivo.
- Comprobado en el propio archivo: 16.521 frases (test 2.974 · train 11.514 · dev 2.033), 60 intenciones y 18 dominios.

**Método:** `scripts/eval-massive.ts` (función pura) y `scripts/eval-massive.mjs` (lectura y escritura). Se ejecuta en la caché:

```bash
sh scripts/sync-build.sh node scripts/eval-massive.mjs \
  "/sdcard/IA/Proyectos/APK IA/datasets/massive-1.0/1.0/data/es-ES.jsonl" \
  "/sdcard/IA/Proyectos/APK IA/datasets/massive-1.0/informe-planilla-test.md" test
```

Cada frase pasa por `parseRoute` con una fecha fija (2026-11-26 10:00). Se cuenta como **acierto**, en las intenciones que la app hace: `alarm_set` → alarma, temporizador o pregunta; `calendar_set` → evento o pregunta; `datetime_query` → respuesta; `lists_createoradd` → tarea, nota o pregunta; `lists_query` → listar; `lists_remove` → completar; `email_querycontact` → correo o pregunta. En las demás, lo correcto es **dejarla pasar al modelo**; en `calendar_query`, abrir el calendario también se acepta. El informe con frases de ejemplo queda en local (`informe-planilla-test.md`) y no se sube: MASSIVE es CC BY 4.0 y aquí solo van cifras.

**Resultados (partición test, 2.974 frases, 59 intenciones presentes):**

- **La app las hace** (7 intenciones, 506 frases): acierta 44 (**8,7 %**), no las entiende y van al modelo 459 (90,7 %), acción equivocada 3 (0,6 %).
- **La app no las hace** (52 intenciones, 2.468 frases): pasan al modelo 2.460 (99,7 %); la planilla intercepta **8 (0,3 %)**.

| Intención que la app hace | Frases | Acierto | Al modelo | Salidas |
|---|---|---|---|---|
| calendar_set | 209 | 1,9 % | 96,7 % | ninguna 202 · pregunta 4 · llamada 2 · temporizador 1 |
| datetime_query | 88 | 9,1 % | 90,9 % | ninguna 80 · respuesta 8 |
| lists_remove | 52 | 1,9 % | 98,1 % | ninguna 51 · completar 1 |
| lists_query | 51 | 0,0 % | 100,0 % | ninguna 51 |
| alarm_set | 41 | 39,0 % | 61,0 % | ninguna 25 · pregunta 16 |
| lists_createoradd | 39 | 35,9 % | 64,1 % | ninguna 25 · tarea 14 |
| email_querycontact | 26 | 3,8 % | 96,2 % | ninguna 25 · correo 1 |

| Intención que la app no hace (interceptadas) | Frases | Interceptadas | Salida |
|---|---|---|---|
| transport_taxi | 23 | 4 (17,4 %) | llamada |
| music_likeness | 36 | 1 (2,8 %) | tarea |
| takeaway_order | 22 | 1 (4,5 %) | llamada |
| calendar_query | 126 | 1 (0,8 %) | respuesta |
| email_query | 119 | 1 (0,8 %) | correo |

**Lectura:**
- La planilla es **prudente**: casi nunca se queda con lo que no le toca (0,3 %).
- Pero **entiende pocas formas de decir las cosas** (8,7 %). En alarmas, los 16 aciertos son preguntas («¿a qué hora?»): no completó ninguna alarma, porque no lee horas dichas en palabras.
- Patrones de fallo, descritos sin copiar frases del dataset:
  - horas en palabras («a las siete de la mañana», «seis y media», «cinco p. m.»);
  - verbos que no conoce («recuérdame», «añade un recordatorio», «pon una reunión», «enciende la alarma»);
  - formas de preguntar («cuál es la hora actual», «cuál es la fecha») y la hora de otra ciudad;
  - consultar una lista, o borrar o vaciar sus elementos;
  - pedir el teléfono o la dirección de correo de un contacto, o buscarlo en los contactos.
- **Intercepciones que hay que corregir:** «llama a un taxi» o «a un uber» se toma como llamada a un contacto (4), y «marcar … como …» también (1, dentro de `calendar_set`).
- **Siguiente (F27-2):** mejorar la planilla con estas formas. Cambia la app (`rules.ts`, `slots.ts`, `catalog.ts`), así que P27-1 tendría que pasar de (a) a (c). Pendiente de decisión del usuario.
