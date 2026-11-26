# Pruebas en el móvil

> Una casilla por comprobación, con el resultado esperado. Contesta al agente con los números que fallen
> («falla 3 y 7») y, si la app se cierra, con el informe de Ajustes → Diagnóstico del motor.
> Todo está incluido en el APK más reciente de `APK IA/apk/` (los bloques se acumulan).

## Voz y acciones (P25, P26)
1. [ ] Doble toque y dictar una frase con una pausa de 1–2 s → no corta; corta a los 2,5 s de silencio o con doble toque.
2. [ ] Dictar con música de fondo → no se envía «[Música]»; si no hay voz, avisa «No te escuché».
3. [ ] Dictar un nombre de tus contactos → sale bien; si se corrigió, debajo aparece «Oí: …».
4. [ ] «agenda dentista mañana a las 10» → «Evento guardado en «…»» y se ve en la app Calendario.
5. [ ] «pon una alarma a las 7» → abre el Reloj con la hora para confirmar.
6. [ ] «abre el calendario del 17 de septiembre» → abre el Calendario en esa fecha y no crea nada.
7. [ ] En Automático, un evento propuesto por el modelo → espera tu toque.
8. [ ] «Responder en voz alta» → lee en español.

## Asistente y planilla (P20, P24)
9. [ ] «anota comprar pan» → aparece en Ajustes → Notas y tareas.
10. [ ] «llama a <contacto>» → abre el marcador, sin llamar sola.
11. [ ] Escribir «@» → sale el menú de comandos.

## Chat e internet (P15–P18)
12. [ ] Segundo mensaje con el mismo modelo → empieza sin volver a cargarlo.
13. [ ] Respuesta con títulos y *cursiva* → se ven con formato.
14. [ ] Globo + pregunta larga → «Se buscó en DuckDuckGo: «…»» y fuentes; el turno siguiente no cierra la app (LFM3 y Nemotron).
15. [ ] Bloque de código → «Copiar código» funciona.

## Modelos y nube (P19, P23)
16. [ ] Nemotron 3 Nano 4B → carga y responde.
17. [ ] Dory → carga y responde (anota si no).
18. [ ] Selector de agente → agrupa por empresa; sin clave, avisa y lleva a Ajustes.

## Versión instalada (P31, M4)
19. [ ] Ajustes, al final → muestra el número de compilación y el commit del APK.
