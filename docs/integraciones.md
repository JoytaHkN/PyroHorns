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
