// GENERADO por scripts/build-cloud-catalog.py. No editar a mano.
// Registro de modelos: 326 proveedores; comprobaciones de ruta el 2026-11-25.

export interface CloudModelEntry {
  apiModel: string;
  name: string;
}

export interface CloudCompany {
  id: string;
  name: string;
  /** true: no necesita clave (solo Pollinations). */
  keyless: boolean;
  chatUrl: string;
  keyPage: string;
  /** Qué se sabe del nivel gratuito. */
  free: string;
  models: CloudModelEntry[];
}

export const CLOUD_COMPANIES: CloudCompany[] = [
  {
    id: "pollinations", name: "Pollinations", keyless: true,
    chatUrl: "https://text.pollinations.ai/openai/chat/completions", keyPage: "https://enter.pollinations.ai",
    free: "Sin clave: 1 respuesta cada 45 s por IP (límite del servicio). Con clave gratuita, más.",
    models: [{ apiModel: "openai", name: "openai" }],
  },
  {
    id: "opencode", name: "OpenCode Zen", keyless: false,
    chatUrl: "https://opencode.ai/zen/v1/chat/completions", keyPage: "https://opencode.ai/auth",
    free: "Modelos «-free» con cuenta de OpenCode; sin cuenta responde 429.",
    models: [{ apiModel: "tidepool-alpha-free", name: "Tidepool Alpha Free" }, { apiModel: "qwen4-max-free", name: "Qwen4 Max Free" }, { apiModel: "hy4-flash-free", name: "Hy4 flash Free" }, { apiModel: "iceman-free", name: "Iceman Free" }, { apiModel: "inkling-2-small-free", name: "Inkling 2 Small Free" }, { apiModel: "crouton-alpha-free", name: "Crouton Alpha Free" }, { apiModel: "pulse-alpha-free", name: "Pulse Alpha Free" }, { apiModel: "longcat-2.5-free", name: "LongCat 2.5 Free" }, { apiModel: "flint-40b-free", name: "Flint 40B Free" }, { apiModel: "minimax-m3.1-flash-free", name: "MiniMax M3.1 Flash Free" }, { apiModel: "deepseek-v4.1-flash-free", name: "DeepSeek V4.1 Flash Free" }, { apiModel: "nemotron-3.5-super-vl-free", name: "Nemotron 3.5 Super VL Free" }, { apiModel: "ll-alpha-free", name: "LL Alpha Free" }, { apiModel: "cat-jam-free", name: "Cat Jam Free" }, { apiModel: "exo-free", name: "Exo Free" }, { apiModel: "beam-free", name: "Beam Free" }, { apiModel: "fledge-alpha-free", name: "Fledge Alpha Free" }, { apiModel: "ling-3.1-flash-free", name: "Ling 3.1 Flash Free" }, { apiModel: "longcat-2.5-preview-free", name: "LongCat 2.5 Preview Free" }, { apiModel: "space-bunny-free", name: "Space Bunny Free" }, { apiModel: "mimo-v2.6-flash-free", name: "MiMo-V2.6-Flash Free" }, { apiModel: "step-5-preview-free", name: "Step 5 Preview Free" }, { apiModel: "muse-spark-1.3-contributor-free", name: "Muse Spark 1.3 Free" }, { apiModel: "ling-3.0-flash-fin-free", name: "Ling 3.0 Flash Fin Free" }, { apiModel: "glm-5.3-flash-free", name: "GLM-5.3-Flash Free" }, { apiModel: "x-preview-f-free", name: "Ox Alpha Free (Unlimited)" }, { apiModel: "nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning Free" }, { apiModel: "ling-3.0-tiny-free", name: "Ling-3.0-tiny Free" }, { apiModel: "muse-spark-1.2-contributor-free", name: "Muse Spark 1.2 Free" }, { apiModel: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free" }, { apiModel: "ling-3.0-flash-free", name: "Ling-3.0-flash Free" }, { apiModel: "laguna-s-2.1-free", name: "Laguna S 2.1 Free" }, { apiModel: "hy3-free", name: "Hy3 Free" }, { apiModel: "longcat-2.0-free", name: "LongCat-2.0 Free" }, { apiModel: "north-mini-code-free", name: "North Mini Code Free" }, { apiModel: "nemotron-3-ultra-free", name: "Nemotron 3 Ultra Free" }, { apiModel: "minimax-m3-free", name: "MiniMax-M3 Free" }, { apiModel: "ring-2.6-1t-free", name: "Ring 2.6 1T Free" }, { apiModel: "mimo-v2.5-free", name: "MiMo V2.5 Free" }, { apiModel: "ling-2.6-flash-free", name: "Ling 2.6 Flash Free" }, { apiModel: "hy3-preview-free", name: "Hy3 preview Free" }, { apiModel: "qwen3.6-plus-free", name: "Qwen3.6 Plus Free" }, { apiModel: "mimo-v2-pro-free", name: "MiMo V2 Pro Free" }, { apiModel: "mimo-v2-omni-free", name: "MiMo V2 Omni Free" }, { apiModel: "nemotron-3-super-free", name: "Nemotron 3 Super Free" }, { apiModel: "minimax-m2.5-free", name: "MiniMax-M2.5 Free" }, { apiModel: "glm-5-free", name: "GLM-5 Free" }, { apiModel: "trinity-large-preview-free", name: "Trinity Large Preview" }, { apiModel: "kimi-k2.5-free", name: "Kimi K2.5 Free" }, { apiModel: "minimax-m2.1-free", name: "MiniMax-M2.1 Free" }, { apiModel: "glm-4.7-free", name: "GLM-4.7 Free" }, { apiModel: "mimo-v2-flash-free", name: "MiMo V2 Flash Free" }, { apiModel: "big-pickle", name: "Big Pickle" }],
  },
  {
    id: "nvidia", name: "NVIDIA", keyless: false,
    chatUrl: "https://integrate.api.nvidia.com/v1/chat/completions", keyPage: "https://build.nvidia.com",
    free: "Prototipado con cuenta verificada (NVIDIA Developer Program). Tu cuenta aún no tiene acceso.",
    models: [{ apiModel: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B A55B" }, { apiModel: "moonshotai/kimi-k3.1-pro", name: "moonshotai/kimi-k3.1-pro" }, { apiModel: "z-ai/glm-5.3-flash", name: "GLM-5.3-Flash" }, { apiModel: "nvidia/nemotron-3.5-super-vl-120b-a12b", name: "Nemotron 3.5 Super VL 120B A12B" }, { apiModel: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning 30B A3B" }, { apiModel: "nvidia/nemotron-3.5-bolt-e4b", name: "nvidia/nemotron-3.5-bolt-e4b" }, { apiModel: "deepseek-ai/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" }, { apiModel: "minimaxai/minimax-m3.1-flash", name: "MiniMax-M3.1-Flash" }],
  },
  {
    id: "openrouter", name: "OpenRouter", keyless: false,
    chatUrl: "https://openrouter.ai/api/v1/chat/completions", keyPage: "https://openrouter.ai/keys",
    free: "Modelos «:free» con cuenta gratis y sin tarjeta: 50 al día (1000 si compraste 10 USD de créditos).",
    models: [{ apiModel: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra (free)" }, { apiModel: "nvidia/nemotron-3.5-lightning:free", name: "Nemotron 3.5 Lightning (free)" }, { apiModel: "nvidia/nemotron-3.5-super-vl:free", name: "Nemotron 3.5 Super VL (free)" }, { apiModel: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "Nemotron 3 Nano Omni (free)" }, { apiModel: "google/gemma-4-31b-it:free", name: "Gemma 4 31B (free)" }, { apiModel: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B A4B  (free)" }, { apiModel: "liquid/lfm-3-1.7b:free", name: "LFM3-1.7B (free)" }, { apiModel: "inclusionai/ling-3.2-flash:free", name: "Ling 3.2 Flash (free)" }, { apiModel: "baidu/ernie-5.5-flash-preview:free", name: "ERNIE-5.5-Flash-Preview (free)" }],
  },
  {
    id: "google", name: "Google (Gemini)", keyless: false,
    chatUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyPage: "https://aistudio.google.com/apikey",
    free: "Nivel gratuito en AI Studio para algunos modelos (verificar límites). Puede usar lo que envías para mejorar productos fuera de la UE.",
    models: [{ apiModel: "gemini-4-neon", name: "Gemini 4 Neon" }, { apiModel: "gemini-4-hydrogen", name: "Gemini 4 Hydrogen" }, { apiModel: "gemini-4-carbon", name: "Gemini 4 Carbon" }, { apiModel: "gemini-4-argon", name: "Gemini 4 Argon" }, { apiModel: "gemini-flash-latest", name: "Gemini Flash Latest" }],
  },
  {
    id: "groq", name: "Groq", keyless: false,
    chatUrl: "https://api.groq.com/openai/v1/chat/completions", keyPage: "https://console.groq.com/keys",
    free: "Nivel gratuito con límites por modelo (verificar).",
    models: [{ apiModel: "qwen/qwen3.8-27b", name: "Qwen3.8 27B" }, { apiModel: "qwen/qwen3.6-27b", name: "Qwen3.6 27B" }, { apiModel: "openai/gpt-oss-safeguard-20b", name: "Safety GPT OSS 20B" }, { apiModel: "openai/gpt-oss-20b", name: "GPT OSS 20B" }, { apiModel: "openai/gpt-oss-120b", name: "GPT OSS 120B" }],
  },
  {
    id: "cerebras", name: "Cerebras", keyless: false,
    chatUrl: "https://api.cerebras.ai/v1/chat/completions", keyPage: "https://cloud.cerebras.ai",
    free: "Prueba con créditos; las fuentes no coinciden (verificar).",
    models: [{ apiModel: "qwen-3.8-27b", name: "Qwen3.8 27B" }, { apiModel: "gpt-oss-120b", name: "GPT OSS 120B" }],
  },
  {
    id: "mistral", name: "Mistral", keyless: false,
    chatUrl: "https://api.mistral.ai/v1/chat/completions", keyPage: "https://console.mistral.ai/api-keys",
    free: "Nivel gratuito según el plan (verificar).",
    models: [{ apiModel: "deepseek-v4-1-flash-1017", name: "DeepSeek V4.1 Flash 1017" }, { apiModel: "mistral-large-latest", name: "Mistral Large (latest)" }, { apiModel: "mistral-large-4", name: "Mistral Large 4" }, { apiModel: "zai-glm-5-3-flash", name: "GLM-5.3-Flash" }, { apiModel: "zai-glm-5-3", name: "GLM-5.3" }],
  },
  {
    id: "cohere", name: "Cohere", keyless: false,
    chatUrl: "https://api.cohere.ai/compatibility/v1/chat/completions", keyPage: "https://dashboard.cohere.com/api-keys",
    free: "Clave de prueba gratuita con límites (verificar).",
    models: [{ apiModel: "north-small-translate-1.0", name: "North Small Translate" }, { apiModel: "north-small-translate-09-2026", name: "North Small Translate" }, { apiModel: "north-mini-code-1.0", name: "North Mini Code" }, { apiModel: "north-mini-code-1-0", name: "North Mini Code" }, { apiModel: "command-a-plus-05-2026", name: "Command A Plus" }],
  },
  {
    id: "huggingface", name: "Hugging Face", keyless: false,
    chatUrl: "https://router.huggingface.co/v1/chat/completions", keyPage: "https://huggingface.co/settings/tokens",
    free: "Token gratis con créditos de inferencia (verificar).",
    models: [{ apiModel: "thinkingmachines/Inkling-2-Mini", name: "Inkling 2 Mini" }, { apiModel: "tencent/Hy4-flash", name: "Hy4 flash" }, { apiModel: "thinkingmachines/Inkling-2-Small", name: "Inkling 2 Small" }, { apiModel: "tencent/Hy4", name: "Hy4" }, { apiModel: "moonshotai/Kimi-K3.1-Pro", name: "Kimi K3.1 Pro" }],
  },
  {
    id: "openai", name: "OpenAI", keyless: false,
    chatUrl: "https://api.openai.com/v1/chat/completions", keyPage: "https://platform.openai.com/api-keys",
    free: "De pago (sin nivel gratuito de API según las fuentes).",
    models: [{ apiModel: "gpt-6.2-sol-healthcare", name: "GPT-6.2 Sol Healthcare" }, { apiModel: "gpt-6.2-astra-healthcare", name: "GPT-6.2 Astra Healthcare" }, { apiModel: "gpt-6.1-sol-healthcare", name: "GPT-6.1 Sol Healthcare" }, { apiModel: "gpt-6-astra-healthcare", name: "GPT-6 Astra Healthcare" }, { apiModel: "gpt-6.2-sol", name: "GPT-6.2 Sol" }],
  },
  {
    id: "anthropic", name: "Anthropic (Claude)", keyless: false,
    chatUrl: "https://api.anthropic.com/v1/chat/completions", keyPage: "https://console.anthropic.com/settings/keys",
    free: "De pago (créditos). Ruta de compatibilidad con OpenAI: verificar al usarla.",
    models: [{ apiModel: "claude-fable-5-2", name: "Claude Fable 5.2" }, { apiModel: "claude-haiku-5-5", name: "Claude Haiku 5.5" }, { apiModel: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" }, { apiModel: "claude-opus-5-5", name: "Claude Opus 5.5" }, { apiModel: "claude-fable-5-1", name: "Claude Fable 5.1" }],
  },
  {
    id: "xai", name: "xAI (Grok)", keyless: false,
    chatUrl: "https://api.x.ai/v1/chat/completions", keyPage: "https://console.x.ai",
    free: "De pago (sin nivel gratuito continuo según las fuentes).",
    models: [{ apiModel: "grok-4.7", name: "Grok 4.7" }, { apiModel: "grok-4.6", name: "Grok 4.6" }, { apiModel: "grok-4.5", name: "Grok 4.5" }, { apiModel: "grok-4.3", name: "Grok 4.3" }, { apiModel: "grok-4.20-multi-agent-0309", name: "Grok 4.20 Multi-Agent" }],
  },
  {
    id: "meta", name: "Meta", keyless: false,
    chatUrl: "https://api.meta.ai/v1/chat/completions", keyPage: "https://developers.facebook.com",
    free: "Según acceso de Meta (verificar).",
    models: [{ apiModel: "muse-ember-1.0", name: "Muse Ember" }, { apiModel: "muse-wonder-1.0", name: "Muse Wonder" }, { apiModel: "muse-spark-1.3-contributor", name: "Muse Spark 1.3 Contributor" }, { apiModel: "muse-spark-1.3", name: "Muse Spark 1.3" }, { apiModel: "muse-spark-1.2-contributor", name: "Muse Spark 1.2 Contributor" }],
  },
  {
    id: "deepseek", name: "DeepSeek", keyless: false,
    chatUrl: "https://api.deepseek.com/chat/completions", keyPage: "https://platform.deepseek.com/api_keys",
    free: "De pago, con precio bajo.",
    models: [{ apiModel: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision Exp" }, { apiModel: "deepseek-v4-flash", name: "DeepSeek V4 Flash" }, { apiModel: "deepseek-flash", name: "DeepSeek V4.1 Flash 1017" }, { apiModel: "deepseek-v4-pro", name: "DeepSeek V4 Pro" }],
  },
  {
    id: "perplexity", name: "Perplexity", keyless: false,
    chatUrl: "https://api.perplexity.ai/chat/completions", keyPage: "https://www.perplexity.ai/settings/api",
    free: "De pago.",
    models: [{ apiModel: "sonar-deep-research", name: "Perplexity Sonar Deep Research" }, { apiModel: "sonar-reasoning-pro", name: "Sonar Reasoning Pro" }, { apiModel: "sonar-pro", name: "Sonar Pro" }, { apiModel: "sonar", name: "Sonar" }],
  },
  {
    id: "moonshot", name: "Moonshot (Kimi)", keyless: false,
    chatUrl: "https://api.moonshot.ai/v1/chat/completions", keyPage: "https://platform.moonshot.ai",
    free: "Créditos al registrarse (verificar).",
    models: [{ apiModel: "kimi-k3.1-pro-highspeed", name: "Kimi K3.1 Pro Highspeed" }, { apiModel: "kimi-k3.1-pro", name: "Kimi K3.1 Pro" }, { apiModel: "kimi-k3", name: "Kimi K3" }, { apiModel: "kimi-k2.7-code-highspeed", name: "Kimi K2.7 Code HighSpeed" }, { apiModel: "kimi-k2.7-code", name: "Kimi K2.7 Code" }],
  },
  {
    id: "alibaba", name: "Alibaba (Qwen)", keyless: false,
    chatUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", keyPage: "https://modelstudio.console.alibabacloud.com",
    free: "Cuota gratuita por modelo al registrarse (verificar).",
    models: [{ apiModel: "qwen4-max", name: "Qwen4 Max" }, { apiModel: "kimi-k3.1-pro-prime", name: "Kimi K3.1 Pro Prime" }, { apiModel: "kimi-k3.1-pro", name: "Kimi K3.1 Pro" }, { apiModel: "qwen3.8-omni-flash", name: "Qwen3.8 Omni Flash" }, { apiModel: "qwen3.8-flash", name: "Qwen3.8 Flash" }],
  },
  {
    id: "zhipu", name: "Zhipu (GLM)", keyless: false,
    chatUrl: "https://api.z.ai/api/paas/v4/chat/completions", keyPage: "https://z.ai/manage-apikey/apikey-list",
    free: "Modelos «Flash» con cuota gratuita (verificar).",
    models: [{ apiModel: "glm-5.3-flashx-legal", name: "GLM-5.3-FlashX-Legal" }, { apiModel: "glm-5.3-flashx", name: "GLM-5.3-FlashX" }, { apiModel: "glm-5.3-flash", name: "GLM-5.3-Flash" }, { apiModel: "glm-5.3", name: "GLM-5.3" }, { apiModel: "glm-5.2", name: "GLM-5.2" }],
  },
  {
    id: "minimax", name: "MiniMax", keyless: false,
    chatUrl: "https://api.minimax.io/v1/chat/completions", keyPage: "https://platform.minimax.io",
    free: "De pago o con créditos (verificar).",
    models: [{ apiModel: "MiniMax-M3.1-Flash", name: "MiniMax-M3.1-Flash" }, { apiModel: "MiniMax-M3", name: "MiniMax-M3" }, { apiModel: "MiniMax-M2.7-highspeed", name: "MiniMax-M2.7-highspeed" }, { apiModel: "MiniMax-M2.7", name: "MiniMax-M2.7" }, { apiModel: "MiniMax-M2.5-highspeed", name: "MiniMax-M2.5-highspeed" }],
  },
  {
    id: "stepfun", name: "StepFun", keyless: false,
    chatUrl: "https://api.stepfun.com/v1/chat/completions", keyPage: "https://platform.stepfun.com",
    free: "De pago o con créditos (verificar).",
    models: [{ apiModel: "step-5-preview", name: "Step 5 Preview" }, { apiModel: "step-3.7-flash", name: "Step 3.7 Flash" }, { apiModel: "stepaudio-2.5-chat", name: "StepAudio 2.5 Chat" }, { apiModel: "stepaudio-2.5-asr", name: "StepAudio 2.5 ASR" }, { apiModel: "step-3.5-flash-2603", name: "Step 3.5 Flash 2603" }],
  },
  {
    id: "fireworks", name: "Fireworks AI", keyless: false,
    chatUrl: "https://api.fireworks.ai/inference/v1/chat/completions", keyPage: "https://fireworks.ai/account/api-keys",
    free: "Créditos de prueba (verificar).",
    models: [{ apiModel: "accounts/fireworks/models/qwen4-max", name: "Qwen4 Max" }, { apiModel: "accounts/fireworks/models/hy4-flash", name: "Hy4 flash" }, { apiModel: "accounts/fireworks/models/ultramarine-1-flash-us", name: "Ultramarine 1 Flash" }, { apiModel: "accounts/fireworks/routers/kimi-latest", name: "Kimi Latest (Kimi K3.1 Pro)" }, { apiModel: "accounts/fireworks/routers/kimi-k3p1-pro-us", name: "Kimi K3.1 Pro (US)" }],
  },
  {
    id: "together", name: "Together AI", keyless: false,
    chatUrl: "https://api.together.xyz/v1/chat/completions", keyPage: "https://api.together.ai/settings/api-keys",
    free: "Créditos de prueba (verificar).",
    models: [{ apiModel: "Qwen/Qwen4-Max", name: "Qwen4 Max" }, { apiModel: "thinkingmachines/Inkling-2-Small", name: "Inkling 2 Small" }, { apiModel: "tencent/Hy4", name: "Hy4" }, { apiModel: "ricursive-ai/Ripple-65B-Preview", name: "Ripple 65B Preview" }, { apiModel: "moonshotai/Kimi-K3.1-Pro", name: "Kimi K3.1 Pro" }],
  },
  {
    id: "deepinfra", name: "DeepInfra", keyless: false,
    chatUrl: "https://api.deepinfra.com/v1/openai/chat/completions", keyPage: "https://deepinfra.com/dash/api_keys",
    free: "De pago o con créditos (verificar).",
    models: [{ apiModel: "thinkingmachines/Inkling-2-Mini", name: "Inkling 2 Mini" }, { apiModel: "tencent/Hy4-flash", name: "Hy4 flash" }, { apiModel: "Qwen/Qwen4-Max", name: "Qwen4 Max" }, { apiModel: "thinkingmachines/Inkling-2-Small", name: "Inkling 2 Small" }, { apiModel: "tencent/Hy4", name: "Hy4" }],
  },
  {
    id: "novita", name: "Novita AI", keyless: false,
    chatUrl: "https://api.novita.ai/openai/chat/completions", keyPage: "https://novita.ai/settings/key-management",
    free: "Créditos de prueba (verificar).",
    models: [{ apiModel: "openai/gpt-6.2-sol", name: "GPT-6.2 Sol" }, { apiModel: "openai/gpt-6.2-astra", name: "GPT-6.2 Astra" }, { apiModel: "tencent/hy4-flash", name: "Hy4 flash" }, { apiModel: "qwen/qwen4-max", name: "Qwen4 Max" }, { apiModel: "tencent/hy4", name: "Hy4" }],
  },
  {
    id: "siliconflow", name: "SiliconFlow", keyless: false,
    chatUrl: "https://api.siliconflow.com/v1/chat/completions", keyPage: "https://cloud.siliconflow.com/account/ak",
    free: "Créditos de prueba (verificar).",
    models: [{ apiModel: "zai-org/GLM-5.3-Flash", name: "GLM-5.3-Flash" }, { apiModel: "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp", name: "DeepSeek V4 Flash Vision Exp" }, { apiModel: "zai-org/GLM-5.3", name: "GLM-5.3" }, { apiModel: "deepseek-ai/DeepSeek-V4-Pro-0813", name: "DeepSeek V4 Pro 0813" }, { apiModel: "Qwen/Qwen3.8-2.4T-A95B", name: "Qwen3.8 2.4T A95B" }],
  },
  {
    id: "nebius", name: "Nebius", keyless: false,
    chatUrl: "https://api.tokenfactory.nebius.com/v1/chat/completions", keyPage: "https://tokenfactory.nebius.com",
    free: "Créditos de prueba (verificar).",
    models: [{ apiModel: "thinkingmachines/Inkling-2-Small", name: "Inkling 2 Small" }, { apiModel: "moonshotai/Kimi-K3.1-Pro", name: "Kimi K3.1 Pro" }, { apiModel: "MiniMaxAI/MiniMax-M3.1-Flash", name: "MiniMax-M3.1-Flash" }, { apiModel: "deepseek-ai/DeepSeek-V4.1-Flash-1017-fast", name: "DeepSeek V4.1 Flash 1017 (fast)" }, { apiModel: "deepseek-ai/DeepSeek-V4.1-Flash-1017", name: "DeepSeek V4.1 Flash 1017" }],
  },
  {
    id: "scaleway", name: "Scaleway", keyless: false,
    chatUrl: "https://api.scaleway.ai/v1/chat/completions", keyPage: "https://console.scaleway.com",
    free: "De pago (verificar).",
    models: [{ apiModel: "deepseek-v4.1-flash-1017", name: "DeepSeek V4.1 Flash 1017" }, { apiModel: "lightonocr-3-0.8b", name: "LightOnOCR-3 0.8B" }, { apiModel: "qwen3.8-27b", name: "Qwen3.8 27B" }, { apiModel: "glm-5.3", name: "GLM-5.3" }, { apiModel: "deepseek-v4-flash-0731", name: "DeepSeek V4 Flash 0731" }],
  },
  {
    id: "ovhcloud", name: "OVHcloud", keyless: false,
    chatUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", keyPage: "https://endpoints.ai.cloud.ovh.net",
    free: "De pago (verificar).",
    models: [{ apiModel: "olala-v1.0-translate", name: "Olala-v1.0-translate" }, { apiModel: "qwen3-vl-30b-a3b", name: "qwen3-vl-30b-a3b" }, { apiModel: "deepseek-v4.1-flash-1017", name: "DeepSeek-V4.1-Flash-1017" }, { apiModel: "qwen3.8-27b", name: "Qwen3.8-27B" }, { apiModel: "laguna-xs-2.1", name: "laguna-xs-2.1" }],
  },
];
