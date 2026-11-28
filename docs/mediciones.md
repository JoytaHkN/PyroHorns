# Mediciones en el dispositivo (P13)

> Movido desde `docs/ESTADO.md` el 2026-11-26 (P31, M9). Texto original sin cambios.

   - **Resultados de P13 en el teléfono (HUAWEI LMR-LX9, compilación base armv8-a, preajuste Rápida, 2026-11-24 03:32):**

     | Modelo | mmap | Hilos | Prompt | Carga s | TTFT ms | Prefill tok/s | Gen tok/s | RAM pico MB | Objetivo |
     |---|---|---|---|---|---|---|---|---|---|
     | LFM3 1.7B | sí | 4 | 1024 | 4.4 | 48307 | 21.2 | 13.3 | 1611 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | sí | 4 | 7616 | 4.4 | 449620 | 16.9 | 8.8 | 1623 | gen ✗ |
     | LFM3 1.7B | no | 4 | 1024 | 1.0 | 59188 | 17.3 | 11.2 | 1623 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | no | 4 | 7616 | 1.0 | 448013 | 17.0 | 8.4 | 1623 | gen ✗ |

     **Lectura:** (1) el **prefill es el cuello de botella**: 17–21 tok/s → 48–59 s para un prompt de 1K (objetivo 1,5 s) y ≈ 7,5 min para
     7616 tokens; (2) la **generación cumple a 1K** (13,3 y 11,2 tok/s) pero **no a 7,6K** (8,8 y 8,4); (3) **RAM pico ≈ 1,6 GB**: sin
     problemas de memoria con LFM3 a 8K; (4) **mmap frente a sin mmap**: generación parecida (mmap algo más rápida); la carga (4,4 s frente a
     1,0 s) está **confundida por el orden** (la primera carga es con el archivo «frío» y la segunda con él ya en la caché de Android), así
     que no es concluyente; el 3,0 tok/s del primer mensaje del chat **no se reproduce** (la mediana de 3 repeticiones oculta la primera).
     **CPU del teléfono** (`/proc/cpuinfo`): HiSilicon, 8 núcleos desiguales (4 a 1,6 GHz parte 0xd23, 3 a 2,15 GHz parte 0xd46 y 1 a 2,15 GHz
     parte 0xd05); soporta **asimddp (dotprod), fp16, i8mm, bf16 y sve**. La compilación base no usa dotprod ni fp16: es la causa más probable del
     prefill lento. **Siguiente (decisión f-B, ya aprobada por el usuario):** compilar ggml-cpu con `armv8.2-a+dotprod+fp16`, añadir al informe
     la línea de CPU y de compilación, y comparar. Los datos de la tablet del usuario llegarán después (misma compilación base).
   - **Resultados de P13 en la tablet (HUAWEI TGR-W09, misma compilación base y preajuste Rápida, 2026-11-24 03:40):**

     | Modelo | mmap | Hilos | Prompt | Carga s | TTFT ms | Prefill tok/s | Gen tok/s | RAM pico MB | Objetivo |
     |---|---|---|---|---|---|---|---|---|---|
     | LFM3 1.7B | sí | 4 | 1024 | 6.0 | 49670 | 20.6 | 12.6 | 1550 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | sí | 4 | 7616 | 6.0 | 409055 | 18.6 | 7.8 | 1557 | gen ✗ |
     | LFM3 1.7B | no | 4 | 1024 | 1.1 | 53687 | 19.1 | 11.4 | 1557 | TTFT ✗ gen ✓ |
     | LFM3 1.7B | no | 4 | 7616 | 1.1 | 422740 | 18.0 | 7.7 | 1557 | gen ✗ |

     **Comparación teléfono / tablet:** prácticamente iguales (prefill 17–21 y 18–21 tok/s; generación 13,3/11,2 frente a 12,6/11,4 a 1K y 8,8/8,4 frente
     a 7,8/7,7 a 7,6K; RAM pico ≈ 1,55–1,62 GB). Conclusiones: (1) el resultado es **reproducible**, no ruido de un dispositivo; (2) los dos Huawei rinden igual,
     probablemente con la misma familia de CPU; (3) en los dos, **con mmap la carga es la «fría» (4,4 y 6,0 s) y sin mmap la «caliente» (1,0 y 1,1 s)**: el
     orden de la prueba domina la comparación de carga, y para la generación mmap es 10–15 % más rápido. **Pendiente de saber si la tablet soporta dotprod/fp16**
     (este informe es del APK base y no trae la línea de CPU).
   - **Resultados con dotprod (2026-11-24, informes completos en el chat del usuario; resumen):**
     - **Teléfono LMR-LX9, 10:11 (cargando, 100 %, 20 °C), LFM3 4 hilos:** prefill **56,5 tok/s** (antes 17–21), generación **18,8** a 1K y 12,9 a 7,6K,
       TTFT 18 s con 1K y 154 s con 7,6K; RAM pico **2646 MB** (antes 1,6 GB).
     - **Teléfono 13:32 (sin cargador, 93 % → 10 %, 34 → 46 °C), preajuste completo:** LFM3: prefill 56,5 / 62,9 / 69,8 tok/s con 4 / 6 / 8 hilos (+24 % con 8),
       generación 18–18,6 a 1K y 12,8–13,2 a 7,6K, sin diferencia con o sin mmap. Qwen3: prefill 52–65, generación 13–14 a 1K y **4–5 a 7,6K**, RAM 3,4 GB.
       CyberSecQwen 4B: prefill 20–21, generación **5,2–5,5**, RAM **5,0 GB**; la prueba se cortó al 10 % de batería (7 de 12 filas del 4B). El estado térmico llegó a
       «crítico» desde ≈ 43 °C y **el rendimiento no bajó de forma visible** (las filas en caliente son iguales a las frías). Se gastó ≈ 83 % de batería.
     - **Tablet TGR-W09, APK base (11:00, completo con 4/6/8 hilos):** los hilos no cambian nada (LFM3 prefill 18–20, gen 11–12; Qwen3 gen 9,2–9,5 a 1K y 2,7–3,1 a 7,6K).
     - **Tablet con dotprod (11:32):** su CPU **sí** tiene dotprod, fp16, i8mm y sve (bf16 no): LFM3 4 hilos prefill **42,8** (antes 20), gen **16,3** a 1K y 9,1 a 7,6K, RAM 2615 MB.
       **Ese informe mezcla filas viejas:** las filas con «-» en temperatura y batería (6 y 8 hilos, Qwen3) son resultados guardados de la ejecución anterior con la compilación base,
       porque el almacén conserva los resultados entre ejecuciones y el informe los agrupa por combinación.
     **Lectura:** (1) dotprod da ≈ 2,5× en prefill y +35–45 % en generación, pero **el TTFT con 1K sigue en 15–32 s frente al objetivo de 1,5 s**: ese objetivo exigiría ≈ 700 tok/s de prefill y
     no es alcanzable con esta CPU; un prompt de chat real (≈ 100 tokens) tardaría ≈ 2 s. (2) La generación cumple ≥ 10 tok/s solo con LFM3 (y Qwen3 a 1K); a 7,6K de contexto Qwen3 cae a 4–5 y el 4B rinde 5.
     (3) La RAM pico subió ≈ 1 GB con dotprod (hipótesis: reempaquetado de pesos `GGML_CPU_REPACK`): el 4B llega a 5 GB. (4) Más hilos solo ayudan al prefill del teléfono.
     **Pendiente de decisión:** reformular el objetivo de TTFT (propuesta: < 2 s con un prompt de ≈ 100 tokens y prefill ≥ 50 tok/s) y arreglar el informe para que no mezcle ejecuciones (etiquetar por compilación y ejecución).
   - **Decisiones del usuario (2026-11-24, tras los resultados con dotprod):** (1) el objetivo de TTFT **se mantiene** en < 1,5 s con 1K (≈ 700 tok/s de prefill) «para probar»;
     la propuesta de reformularlo (< 2 s con ≈ 100 tokens) queda para después; (2) el informe **ya no mezcla ejecuciones** (cada «Empezar» tiene un `runId` y el informe resume solo la última);
     (3) **sin control térmico**: solo el aviso del informe. **Modelo nuevo:** `NVIDIA-Nemotron-3.5-Bolt-E4B-Q4_K_M.gguf` (6,18 GB; el GGUF declara arquitectura **gemma4**,
     42 capas, ventana deslizante de 512, 2 cabezas KV; llama.cpp `dc33e61` la soporta) añadido a `LOCAL_MODELS` como opcional (id `nemotron-bolt-e4b`, contexto 4K, KV 172 KB/token = cota
     superior). Se importa con el selector (copia 6,2 GB) o con «Todo el almacenamiento». Sin probar: plantilla de chat y razonamiento (`thinking: false`). **Preajuste nuevo «Resumen»:**
     los 5 modelos, solo con mmap, 4 y 8 hilos, prompts corto y largo, 1 repetición = **20 ejecuciones** (la completa pasa a 180). CI Android en verde (`af00214`); APK: `APK IA/apk/PyroHorns-0.1.0-F1.5-resumen-prueba.apk` (+ `.sha256`). Pendiente: probar en el móvil.
   - **Nemotron 3.5 Bolt E4B (gemma4) medido en el teléfono (2026-11-24 17:13 y 17:28, dotprod, mmap):** **carga sin problemas** (41 s en frío, 32 s después; 6,2 GB); prefill **27 tok/s con 4 hilos y 34 con 8**;
     generación **5,7–5,9 tok/s** a 1K y 4,9–5,7 a 3,7K; TTFT 31–38 s con 1K; RAM pico **5,8–6,2 GB**. No cumple ningún objetivo y rinde como CyberSecQwen 4B (5,4 tok/s). El informe ya no mezcla ejecuciones
     (la primera dice «hay 99 guardadas»). El usuario cerró la prueba «por un error» (pendiente de saber cuál). Sin probar en el chat: plantilla y razonamiento.
   - **Resumen con «máximo rendimiento» desactivado (teléfono, 2026-11-24 18:36, hilos 6 y 8, 20 mediciones, batería 85 % → 59 %):** LFM3 prefill 63 / 70 tok/s y generación 18–19 (a 1K) y 13,6–13,8 (a 7,6K):
     **idéntico a las medidas anteriores**, así que ese ajuste del teléfono no cambió nada. Qwen3: prefill 58 / 68, gen 14,5 (1K) y 5,3–5,9 (7,6K). CyberSecQwen 4B: gen 6,5–6,8 (1K) y 4,0–4,1 (3,7K); con 6 hilos el prefill se hundió a 10,8 tok/s (TTFT 95 s)
     frente a 25 con 8. Phi-3.5: gen 5,2–6,3 (1K) y 2,1–3,9 (3,7K). Nemotron: prefill 30–33, gen 4,7–6,1 (1K) y 2,4–2,7 (3,7K). **Solo LFM3 (y Qwen3 a 1K) cumple ≥ 10 tok/s; ningún modelo cumple el TTFT.** 17 de 20 mediciones en caliente, sin caída visible.
     **La columna de RAM pico no es fiable en esta ejecución** (6395 MB en todos los modelos, 6720 en Nemotron): el proceso ya tenía memoria retenida de cargas anteriores (el asignador no la devuelve) y el pico se reinicia al valor actual.
     Para medir RAM hay que cerrar la app del todo antes de empezar. Propuesta pendiente: guardar la RSS base antes de cada prueba y mostrar el incremento.

## Chat en el teléfono, compilación 97 con variantes de CPU (2026-11-28, LMR-LX9, informe del Diagnóstico)
- Variante elegida en ejecución: `DOTPROD = 1`, `MATMUL_INT8 = 1` (i8mm), `FP16_VA = 1`. Confirma las variantes de ggml.
- **Nemotron 3 Nano 4B** (`nemotron_h`, 8K): carga ≈ 4–5 s (lectura en bloques 1,7–2,2 s); instrucción de sistema (119 tokens)
  en 9,0–11,7 s (≈ 10–13 tok/s de prefill); generación ≈ 4–5 tok/s; RAM del proceso hasta ≈ 3,9 GB (motivos de cierre de Android).
- **Qwen3 1.7B** (8K): carga ≈ 4,4 s; instrucción (124 tokens) en 3,2 s (≈ 38 tok/s).
- Una sola muestra por cifra, desde el chat; no son comparables con la prueba P13.
