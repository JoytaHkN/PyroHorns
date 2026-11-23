export type Block = { kind: 'code'; lang: string; text: string } | { kind: 'para'; text: string };

export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  const re = /```(\w*)\n?([\s\S]*?)(```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushParas = (s: string) =>
    s
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((text) => out.push({ kind: 'para', text }));
  while ((m = re.exec(src))) {
    pushParas(src.slice(last, m.index));
    out.push({ kind: 'code', lang: m[1] ?? '', text: (m[2] ?? '').replace(/\n$/, '') });
    last = re.lastIndex;
    if (m[0].length === 0) break;
  }
  pushParas(src.slice(last));
  return out;
}
