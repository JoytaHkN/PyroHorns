"""Genera src/data/cloud-catalog.ts a partir del registro público de modelos (models.dev, el que usa OpenCode).

Uso:  curl -o /tmp/models_dev.json https://models.dev/api.json && python3 -I scripts/build-cloud-catalog.py /tmp/models_dev.json

Cada empresa lleva la ruta de chat que se comprobó con una petición real (401 = existe y pide clave; 200 = sin clave).
Los niveles gratuitos vienen de la documentación pública o de fuentes secundarias: marcados como «verificar» cuando no se comprobaron.
"""
import json, pathlib, sys

SNAPSHOT = sys.argv[1]
reg = json.load(open(SNAPSHOT, encoding='utf-8'))
OUT = pathlib.Path(__file__).resolve().parent.parent / 'src/data/cloud-catalog.ts'

# Modelos verificados en vivo (lista pública sin clave) o en la documentación del proveedor.
EXPLICIT = {
    'nvidia': ['nvidia/nemotron-3-ultra-550b-a55b', 'moonshotai/kimi-k3.1-pro', 'z-ai/glm-5.3-flash',
               'nvidia/nemotron-3.5-super-vl-120b-a12b', 'nvidia/nemotron-3.5-lightning-30b-a3b',
               'nvidia/nemotron-3.5-bolt-e4b', 'deepseek-ai/deepseek-v4.1-flash', 'minimaxai/minimax-m3.1-flash'],
    'openrouter': ['nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3.5-lightning:free',
                   'nvidia/nemotron-3.5-super-vl:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
                   'google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'liquid/lfm-3-1.7b:free',
                   'inclusionai/ling-3.2-flash:free', 'baidu/ernie-5.5-flash-preview:free'],
    'pollinations': ['openai'],
}

# Empresas con ruta comprobada. free: texto para el usuario.
COMPANIES = [
    dict(id='pollinations', name='Pollinations', keyless=True, reg=None,
         chat='https://text.pollinations.ai/openai/chat/completions', page='https://enter.pollinations.ai',
         free='Sin clave: 1 respuesta cada 45 s por IP (límite del servicio). Con clave gratuita, más.'),
    dict(id='opencode', name='OpenCode Zen', keyless=False, reg='opencode',
         chat='https://opencode.ai/zen/v1/chat/completions', page='https://opencode.ai/auth',
         free='Modelos «-free» con cuenta de OpenCode; sin cuenta responde 429.', only_free=True),
    dict(id='nvidia', name='NVIDIA', keyless=False, reg='nvidia',
         chat='https://integrate.api.nvidia.com/v1/chat/completions', page='https://build.nvidia.com',
         free='Prototipado con cuenta verificada (NVIDIA Developer Program). Tu cuenta aún no tiene acceso.'),
    dict(id='openrouter', name='OpenRouter', keyless=False, reg='openrouter',
         chat='https://openrouter.ai/api/v1/chat/completions', page='https://openrouter.ai/keys',
         free='Modelos «:free» con cuenta gratis y sin tarjeta: 50 al día (1000 si compraste 10 USD de créditos).'),
    dict(id='google', name='Google (Gemini)', keyless=False, reg='google',
         chat='https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', page='https://aistudio.google.com/apikey',
         free='Nivel gratuito en AI Studio para algunos modelos (verificar límites). Puede usar lo que envías para mejorar productos fuera de la UE.'),
    dict(id='groq', name='Groq', keyless=False, reg='groq', chat='https://api.groq.com/openai/v1/chat/completions',
         page='https://console.groq.com/keys', free='Nivel gratuito con límites por modelo (verificar).'),
    dict(id='cerebras', name='Cerebras', keyless=False, reg='cerebras', chat='https://api.cerebras.ai/v1/chat/completions',
         page='https://cloud.cerebras.ai', free='Prueba con créditos; las fuentes no coinciden (verificar).'),
    dict(id='mistral', name='Mistral', keyless=False, reg='mistral', chat='https://api.mistral.ai/v1/chat/completions',
         page='https://console.mistral.ai/api-keys', free='Nivel gratuito según el plan (verificar).'),
    dict(id='cohere', name='Cohere', keyless=False, reg='cohere', chat='https://api.cohere.ai/compatibility/v1/chat/completions',
         page='https://dashboard.cohere.com/api-keys', free='Clave de prueba gratuita con límites (verificar).'),
    dict(id='huggingface', name='Hugging Face', keyless=False, reg='huggingface', chat='https://router.huggingface.co/v1/chat/completions',
         page='https://huggingface.co/settings/tokens', free='Token gratis con créditos de inferencia (verificar).'),
    dict(id='openai', name='OpenAI', keyless=False, reg='openai', chat='https://api.openai.com/v1/chat/completions',
         page='https://platform.openai.com/api-keys', free='De pago (sin nivel gratuito de API según las fuentes).'),
    dict(id='anthropic', name='Anthropic (Claude)', keyless=False, reg='anthropic', chat='https://api.anthropic.com/v1/chat/completions',
         page='https://console.anthropic.com/settings/keys', free='De pago (créditos). Ruta de compatibilidad con OpenAI: verificar al usarla.'),
    dict(id='xai', name='xAI (Grok)', keyless=False, reg='xai', chat='https://api.x.ai/v1/chat/completions',
         page='https://console.x.ai', free='De pago (sin nivel gratuito continuo según las fuentes).'),
    dict(id='meta', name='Meta', keyless=False, reg='meta', chat='https://api.meta.ai/v1/chat/completions',
         page='https://developers.facebook.com', free='Según acceso de Meta (verificar).'),
    dict(id='deepseek', name='DeepSeek', keyless=False, reg='deepseek', chat='https://api.deepseek.com/chat/completions',
         page='https://platform.deepseek.com/api_keys', free='De pago, con precio bajo.'),
    dict(id='perplexity', name='Perplexity', keyless=False, reg='perplexity', chat='https://api.perplexity.ai/chat/completions',
         page='https://www.perplexity.ai/settings/api', free='De pago.'),
    dict(id='moonshot', name='Moonshot (Kimi)', keyless=False, reg='moonshotai', chat='https://api.moonshot.ai/v1/chat/completions',
         page='https://platform.moonshot.ai', free='Créditos al registrarse (verificar).'),
    dict(id='alibaba', name='Alibaba (Qwen)', keyless=False, reg='alibaba', chat='https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
         page='https://modelstudio.console.alibabacloud.com', free='Cuota gratuita por modelo al registrarse (verificar).'),
    dict(id='zhipu', name='Zhipu (GLM)', keyless=False, reg='zhipuai', chat='https://api.z.ai/api/paas/v4/chat/completions',
         page='https://z.ai/manage-apikey/apikey-list', free='Modelos «Flash» con cuota gratuita (verificar).'),
    dict(id='minimax', name='MiniMax', keyless=False, reg='minimax', chat='https://api.minimax.io/v1/chat/completions',
         page='https://platform.minimax.io', free='De pago o con créditos (verificar).'),
    dict(id='stepfun', name='StepFun', keyless=False, reg='stepfun', chat='https://api.stepfun.com/v1/chat/completions',
         page='https://platform.stepfun.com', free='De pago o con créditos (verificar).'),
    dict(id='fireworks', name='Fireworks AI', keyless=False, reg='fireworks-ai', chat='https://api.fireworks.ai/inference/v1/chat/completions',
         page='https://fireworks.ai/account/api-keys', free='Créditos de prueba (verificar).'),
    dict(id='together', name='Together AI', keyless=False, reg='togetherai', chat='https://api.together.xyz/v1/chat/completions',
         page='https://api.together.ai/settings/api-keys', free='Créditos de prueba (verificar).'),
    dict(id='deepinfra', name='DeepInfra', keyless=False, reg='deepinfra', chat='https://api.deepinfra.com/v1/openai/chat/completions',
         page='https://deepinfra.com/dash/api_keys', free='De pago o con créditos (verificar).'),
    dict(id='novita', name='Novita AI', keyless=False, reg='novita-ai', chat='https://api.novita.ai/openai/chat/completions',
         page='https://novita.ai/settings/key-management', free='Créditos de prueba (verificar).'),
    dict(id='siliconflow', name='SiliconFlow', keyless=False, reg='siliconflow', chat='https://api.siliconflow.com/v1/chat/completions',
         page='https://cloud.siliconflow.com/account/ak', free='Créditos de prueba (verificar).'),
    dict(id='nebius', name='Nebius', keyless=False, reg='nebius', chat='https://api.tokenfactory.nebius.com/v1/chat/completions',
         page='https://tokenfactory.nebius.com', free='Créditos de prueba (verificar).'),
    dict(id='scaleway', name='Scaleway', keyless=False, reg='scaleway', chat='https://api.scaleway.ai/v1/chat/completions',
         page='https://console.scaleway.com', free='De pago (verificar).'),
    dict(id='ovhcloud', name='OVHcloud', keyless=False, reg='ovhcloud', chat='https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions',
         page='https://endpoints.ai.cloud.ovh.net', free='De pago (verificar).'),
]

def text_models(p):
    out = []
    for mid, v in (p.get('models') or {}).items():
        if 'text' not in ((v.get('modalities') or {}).get('output') or ['text']):
            continue
        out.append((v.get('release_date') or '', mid, v.get('name') or mid))
    out.sort(reverse=True)
    return out

def ts(s):
    return json.dumps(s, ensure_ascii=False)

lines = ['// GENERADO por scripts/build-cloud-catalog.py. No editar a mano.',
         f'// Registro de modelos: {len(reg)} proveedores; comprobaciones de ruta el 2026-11-25.',
         '', 'export interface CloudModelEntry {', '  apiModel: string;', '  name: string;', '}', '',
         'export interface CloudCompany {', '  id: string;', '  name: string;', '  /** true: no necesita clave (solo Pollinations). */',
         '  keyless: boolean;', '  chatUrl: string;', '  keyPage: string;', '  /** Qué se sabe del nivel gratuito. */', '  free: string;',
         '  models: CloudModelEntry[];', '}', '', 'export const CLOUD_COMPANIES: CloudCompany[] = [']
count_models = 0
for c in COMPANIES:
    if c['id'] in EXPLICIT:
        models = [(m, m) for m in EXPLICIT[c['id']]]
        names = {m: m for m in EXPLICIT[c['id']]}
        if c['reg'] and c['reg'] in reg:
            names = {mid: (v.get('name') or mid) for mid, v in (reg[c['reg']].get('models') or {}).items()}
            models = [(m, names.get(m, m)) for m in EXPLICIT[c['id']]]
    else:
        p = reg.get(c['reg']) or {}
        tm = text_models(p)
        if c.get('only_free'):
            tm = [t for t in tm if t[1].endswith('-free') or t[1] == 'big-pickle']
        else:
            tm = tm[:5]
        models = [(mid, name) for _, mid, name in tm]
    count_models += len(models)
    lines.append('  {')
    lines.append(f'    id: {ts(c["id"])}, name: {ts(c["name"])}, keyless: {"true" if c["keyless"] else "false"},')
    lines.append(f'    chatUrl: {ts(c["chat"])}, keyPage: {ts(c["page"])},')
    lines.append(f'    free: {ts(c["free"])},')
    lines.append('    models: [' + ', '.join(f'{{ apiModel: {ts(m)}, name: {ts(n)} }}' for m, n in models) + '],')
    lines.append('  },')
lines.append('];')
OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('empresas:', len(COMPANIES), '| modelos:', count_models, '| escrito:', OUT)
