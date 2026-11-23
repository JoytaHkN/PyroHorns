# Agora Fire

Asistente de IA local para Android (React Native + Expo + heroui-native), paleta Plasma.
Plan completo por fases: [PLAN.md](PLAN.md).

## F1 (actual)
Diseño Plasma, chat con respuestas simuladas en streaming, selector de modo/nivel/modelo,
menú lateral con búsqueda, proyectos, catálogo GGUF, ajustes con tema oscuro/claro y
vistas previas de terminal. Todo persiste en el dispositivo.

```bash
npm install
npm run web          # navegador (PWA preliminar)
npm run android      # Expo Go / dev build
npm run typecheck
```

`tests/logic.test.ts`: pruebas del motor de chat y stores (se ejecutan con esbuild + node).

## Estructura
- `src/app` — rutas (hero, chat, projects, models, settings, terminal/[kind])
- `src/components` — iconos Plasma, orbe, burbujas, composer, drawer, selector de agente
- `src/theme` — tokens Plasma (también en `global.css`)
- `src/providers` — interfaz `ChatProvider`; `MockProvider` (F1) → `LlamaProvider` (F2)
- `src/store` — Zustand persistido (conversaciones, proyectos, ajustes)
- `src/data` — modelos GGUF y modos/niveles
