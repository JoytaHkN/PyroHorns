export type Block =
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; text: string };

export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  const re = /```(\w*)\n?([\s\S]*?)(```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  /** Párrafos separados por líneas en blanco; las líneas «# Título» van aparte. */
  const pushParas = (s: string) => {
    for (const chunk of s.split(/\n{2,}/)) {
      let lines: string[] = [];
      const flush = () => {
        const text = lines.join('\n').trim();
        if (text) out.push({ kind: 'para', text });
        lines = [];
      };
      for (const line of chunk.split('\n')) {
        const h = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (!h) {
          lines.push(line);
          continue;
        }
        flush();
        out.push({ kind: 'heading', level: h[1]!.length, text: h[2]! });
      }
      flush();
    }
  };
  while ((m = re.exec(src))) {
    pushParas(src.slice(last, m.index));
    out.push({ kind: 'code', lang: m[1] ?? '', text: (m[2] ?? '').replace(/\n$/, '') });
    last = re.lastIndex;
    if (m[0].length === 0) break;
  }
  pushParas(src.slice(last));
  return out;
}

/**
 * Elementos en línea (S10-B): negrita, código, enlaces e imágenes.
 * - Los enlaces http(s), mailto y tel se abren directamente.
 * - Las imágenes remotas (http/https) solo se cargan al tocarlas.
 * - Todo lo demás —incluido el HTML y esquemas como `javascript:`— se muestra como texto.
 */
export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string }
  | { kind: 'image'; alt: string; url: string };

const LINK_SCHEMES = /^(https?:\/\/|mailto:|tel:)/i;
const IMAGE_SCHEMES = /^https?:\/\//i;

export const isOpenableUrl = (url: string) => LINK_SCHEMES.test(url.trim());
export const isLoadableImage = (url: string) => IMAGE_SCHEMES.test(url.trim());

const TOKEN = /(!\[[^\]\n]*\]\([^)\s]+\)|\[[^\]\n]+\]\([^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pushText = (t: string) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev?.kind === 'text') prev.text += t;
    else out.push({ kind: 'text', text: t });
  };
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const tok = m[0];
    const at = m.index ?? 0;
    pushText(text.slice(last, at));
    last = at + tok.length;
    let mm: RegExpMatchArray | null;
    if ((mm = tok.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      const [, alt = '', url = ''] = mm;
      if (isLoadableImage(url)) out.push({ kind: 'image', alt, url });
      else pushText(tok);
    } else if ((mm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/))) {
      const [, label = '', url = ''] = mm;
      if (isOpenableUrl(url)) out.push({ kind: 'link', text: label, url });
      else pushText(tok);
    } else if (tok.startsWith('**')) out.push({ kind: 'bold', text: tok.slice(2, -2) });
    else if (tok.startsWith('`')) out.push({ kind: 'code', text: tok.slice(1, -1) });
    else out.push({ kind: 'link', text: tok, url: tok });
  }
  pushText(text.slice(last));
  return out;
}
