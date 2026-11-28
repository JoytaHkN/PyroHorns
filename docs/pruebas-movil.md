# Pruebas en el móvil

> Una casilla por comprobación, con el resultado esperado. Contesta al agente con los números que fallen
> («falla 3 y 7») y, si la app se cierra, con el informe de Ajustes → Diagnóstico del motor.
> Todo está incluido en `APK IA/apk/PyroHorns-0.1.0-v0.2-p31-prueba.apk` (los bloques se acumulan).

## Antes de instalar (una sola vez, P31-M8)
El APK nuevo lleva otra firma: **hay que desinstalar la app**, y se borra todo lo que guarda dentro: conversaciones,
notas y tareas, ajustes, claves de la nube, modelos importados a la carpeta de la app y el modelo de voz.
Copia antes lo que quieras conservar. Los GGUF de `APK IA/` no se tocan. Quien tenga `v0.1.0-alpha.1` no necesita desinstalar.

## Voz y acciones (P25, P26)
1. [ ] Doble toque y dictar una frase con una pausa de 1–2 s → no corta; corta a los 2,5 s de silencio o con doble toque.
2. [ ] Dictar con música de fondo → no se envía «[Música]»; si no hay voz, avisa «No te escuché».
3. [✗] Dictar un nombre de tus contactos → sale bien; si se corrigió, debajo aparece «Oí: …».
    - 2026-11-28: nombres cortos mal oídos (posiblemente «papá»); no apareció «Oí: …» (P32-3).
4. [~] «agenda dentista mañana a las 10» → «Evento guardado en «…»» y se ve en la app Calendario.
    - 2026-11-28: guardado en «Phone» y visible en Calendario, pero el título llevaba coma final (P32-4, arreglado: casilla 24).
5. [✓] «pon una alarma a las 7» → abre el Reloj con la hora para confirmar.
6. [ ] «abre el calendario del 17 de septiembre» → abre el Calendario en esa fecha y no crea nada.
7. [ ] En Automático, un evento propuesto por el modelo → espera tu toque.
8. [ ] «Responder en voz alta» → lee en español.

## Asistente y planilla (P20, P24)
9. [ ] «anota comprar pan» → aparece en Ajustes → Notas y tareas.
    - 2026-11-28: salió la tarjeta «Nota guardada»; falta mirar la lista en Notas y tareas.
10. [~] «llama a <contacto>» → abre el marcador, sin llamar sola.
    - 2026-11-28: abre el marcador sin llamar; con nombres de 1–3 letras elige un contacto equivocado (P32-2).
11. [✓] Escribir «@» → sale el menú de comandos.

## Chat e internet (P15–P18)
12. [✓] Segundo mensaje con el mismo modelo → empieza sin volver a cargarlo.
    - 2026-11-28: el rastro muestra tokens «ya en memoria».
13. [ ] Respuesta con títulos y *cursiva* → se ven con formato.
14. [~] Globo + pregunta larga → «Se buscó en DuckDuckGo: «…»» y fuentes; el turno siguiente no cierra la app (LFM3 y Nemotron).
    - 2026-11-28: busca, pero LFM3 copia la lista de resultados en vez de responder (P32-6).
15. [ ] Bloque de código → «Copiar código» funciona.

## Modelos y nube (P19, P23)
16. [✗] Nemotron 3 Nano 4B → carga y responde.
    - 2026-11-28: carga, pero respondió con el ejemplo de la instrucción de sistema (P32-1).
17. [ ] Dory → carga y responde (anota si no).
18. [ ] Selector de agente → agrupa por empresa; sin clave, avisa y lleva a Ajustes.
    - 2026-11-28: agrupa por empresa; falta comprobar el aviso sin clave.

## Versión instalada (P31, M4)
19. [✓] Ajustes, al final → «PyroHorns 0.1.0 (compilación 97 · c397791 · 2026-11-27) · GPL-3.0».
20. [✓] El APK se instala y abre; tras instalarlo, volver a importar un modelo y descargar el modelo de voz funciona.
    - 2026-11-28: instalado; modelos y dictado funcionan.

## Arreglos de P32 (APK posterior a la compilación 97)
Antes de la 23, marca como favorito en Contactos a quien vayas a nombrar.

21. [ ] Nemotron 3 Nano 4B: pídele un script → responde con texto, no con «Primera respuesta».
22. [ ] «llama a» y una sola letra → pregunta a quién; un nombre a medias → ofrece contactos para tocar; nombre completo → abre el marcador.
23. [ ] Dictar el nombre de un favorito → sale bien (compáralo con la casilla 3).
24. [ ] Dictar «agenda dentista mañana a las 10» → el título es «Dentista», sin coma.
25. [ ] Las acciones y opciones salen sin burbuja vacía; si genera sin texto visible, dice «Generando…».
26. [ ] Globo con LFM3 → responde con sus palabras y cita [n], sin copiar la lista.
27. [ ] Cerrar la app a mitad de una respuesta y volver → Diagnóstico no lo llama fallo del motor y las horas son las tuyas.
28. [ ] Ajustes → Agente en la nube → ya no aparece la frase sobre tu cuenta.
29. [ ] Chat nuevo con el teclado abierto → la mascota no tapa la barra superior.

## Pedido del 2026-11-28 (P33)
30. [ ] Selector de agente → la nube sale plegada («sin clave» y «con clave»); al tocar, empresas plegadas y al tocar una, sus modelos.
31. [ ] Ajustes → Agente en la nube → cada proveedor es una línea que se abre al tocar.
32. [ ] Menú lateral → «Notas», debajo de Termux, abre Notas y tareas.
33. [ ] Dictando, doble toque en la conversación → pone «Transcribiendo…» al instante (di si tarda en ponerlo).
34. [ ] El botón del micrófono empieza el dictado y otro toque lo termina; tocar el aviso «Escuchando…» también lo termina.

## Otros fallos vistos el 2026-11-28 (compilación 97)
- Burbuja vacía encima de las tarjetas de acción y de las opciones (P32-5).
- Diagnóstico: llama «cierre del motor» a un cierre hecho por ti a mitad de respuesta, y muestra las horas en UTC (P32-7).
- Agente en la nube: un texto fijo habla del acceso de una cuenta concreta (P32-8).
- Pantalla de inicio con el teclado abierto: la mascota se monta sobre la barra superior (P32-9).

Leyenda: ✓ pasa · ✗ falla · ~ pasa con defectos · vacío: sin probar.
