import { parseBlocks, parseInline } from '@/components/markdown-parse';
import { check, done } from './helpers';

const kinds = (s: string) => parseInline(s).map((p) => p.kind).join(',');

const b = parseBlocks('hola **x**\n\n```ts\nconst a = 1;\n```\nfin');
check(b.length === 3 && b[1]!.kind === 'code' && (b[1] as { lang: string }).lang === 'ts', 'bloques: párrafo, código, párrafo');
check(parseBlocks('```py\nprint(1)').length === 1, 'bloque de código sin cerrar (streaming)');

check(kinds('**negrita** y `code`') === 'bold,text,code', 'negrita y código en línea');

const link = parseInline('ver [la web](https://example.com/a?b=1)');
check(link[1]?.kind === 'link' && (link[1] as { url: string }).url === 'https://example.com/a?b=1', 'S10: enlace http(s) abrible');
check(kinds('[correo](mailto:yo@example.com)') === 'link', 'S10: enlace mailto');

const auto = parseInline('visita https://example.com.');
check(
  auto.length === 3 && auto[1]?.kind === 'link' && (auto[1] as { url: string }).url === 'https://example.com' && auto[2]?.kind === 'text',
  'S10: enlace automático sin el punto final',
);

const js = parseInline('[x](javascript:alert(1))');
check(js.every((p) => p.kind === 'text'), 'S10: javascript: se muestra como texto, no como enlace');
check(parseInline('[x](data:text/html,hola)').every((p) => p.kind === 'text'), 'S10: data: se muestra como texto');

const img = parseInline('![gato](https://img.example/gato.png)');
check(img.length === 1 && img[0]?.kind === 'image' && (img[0] as { alt: string }).alt === 'gato', 'S10: imagen remota (se carga al tocarla)');
check(parseInline('![x](data:image/png;base64,AAA)').every((p) => p.kind === 'text'), 'S10: imagen data: como texto');

const html = parseInline('<script>alert(1)</script> <b>hola</b>');
check(html.length === 1 && html[0]?.kind === 'text' && html[0].text.includes('<script>'), 'S10: el HTML se muestra como texto');

done();
