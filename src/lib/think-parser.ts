/**
 * Separa el razonamiento `<think>…</think>` del texto de la respuesta cuando llega en trozos (streaming).
 * Una etiqueta puede llegar partida entre dos trozos («<thi» + «nk>»): se retiene el posible comienzo hasta saberlo.
 */
export interface ThinkPart {
  kind: 'thinking' | 'text';
  text: string;
}

const OPEN = '<think>';
const CLOSE = '</think>';

/** Longitud del sufijo de `s` que es un comienzo propio de `tag` (el resto de la etiqueta aún no ha llegado). */
function partialTagLength(s: string, tag: string): number {
  for (let n = Math.min(tag.length - 1, s.length); n > 0; n--) {
    if (tag.startsWith(s.slice(s.length - n))) return n;
  }
  return 0;
}

export class ThinkSplitter {
  private inThink = false;
  private buf = '';
  /** Tras una etiqueta se descartan los saltos de línea iniciales (`<think>\n…`, `</think>\n\n…`). */
  private trimNext = false;

  push(chunk: string): ThinkPart[] {
    this.buf += chunk;
    const out: ThinkPart[] = [];
    for (;;) {
      const tag = this.inThink ? CLOSE : OPEN;
      const at = this.buf.indexOf(tag);
      if (at >= 0) {
        this.emit(out, this.buf.slice(0, at));
        this.buf = this.buf.slice(at + tag.length);
        this.inThink = !this.inThink;
        this.trimNext = true;
        continue;
      }
      const keep = partialTagLength(this.buf, tag);
      this.emit(out, this.buf.slice(0, this.buf.length - keep));
      this.buf = this.buf.slice(this.buf.length - keep);
      return out;
    }
  }

  /** Al terminar la generación: lo retenido ya no es una etiqueta. */
  flush(): ThinkPart[] {
    const out: ThinkPart[] = [];
    this.emit(out, this.buf);
    this.buf = '';
    return out;
  }

  private emit(out: ThinkPart[], raw: string) {
    let text = raw;
    if (this.trimNext) {
      text = text.replace(/^\s+/, '');
      if (text.length > 0) this.trimNext = false;
    }
    if (text.length > 0) out.push({ kind: this.inThink ? 'thinking' : 'text', text });
  }
}
