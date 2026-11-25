import { cleanQuery, needsRewrite, queryMessages } from '@/lib/search-query';
import { check, done } from './helpers';

check(!needsRewrite('golpe de estado en Chile'), 'consulta corta: tal cual');
check(needsRewrite('en base a tu modelo podrías buscar en internet si existe algo como yo'), 'mensaje largo: se resume');
check(needsRewrite('¿y quién gobernó?', 'golpe de Chile') && needsRewrite('alguno de estos sirve', 'x'), 'remite a lo anterior');
check(!needsRewrite('¿y quién gobernó?'), 'sin mensaje anterior no hay a qué remitir');
check(cleanQuery('Búsqueda: "modelos de IA para celular Q4_K_M".') === 'modelos de IA para celular Q4_K_M', 'limpia prefijo y comillas');
check(cleanQuery('<think>\n\n</think>\n\n**Consulta:** Nemotron móvil\nExplicación') === 'Nemotron móvil', 'primera línea, sin razonamiento');
check(cleanQuery('') === null && cleanQuery('palabra '.repeat(30)) === null, 'respuesta inservible: se descarta');
check(queryMessages('hola', 'antes')[1]!.content.includes('Antes preguntó: antes'), 'incluye el contexto anterior');
done();
