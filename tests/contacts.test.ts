// P32-2: a quién se llama cuando el nombre se dijo corto o se oyó mal. Nombres inventados.
import { pickContact } from '@/lib/assistant/contacts';
import { check, done } from './helpers';

const c = (name: string) => ({ name, phones: ['1'], emails: [] });
const names = (p: ReturnType<typeof pickContact>) => (p && 'candidates' in p ? p.candidates.map((x) => x.name).join('|') : '');
const one = (p: ReturnType<typeof pickContact>) => (p && 'contact' in p ? p.contact.name : '');

check(one(pickContact('Papa', [c('Papá Fer'), c('Papelería Sol')])) === 'Papá Fer', 'una palabra completa, sin importar la tilde');
check(names(pickContact('Bar', [c('Rosa Barrios')])) === 'Rosa Barrios', 'solo el comienzo de una palabra: se pregunta aunque haya uno');
check(names(pickContact('Ana', [c('Ana Soto'), c('Ana Ruiz'), c('Anaís')])) === 'Ana Soto|Ana Ruiz', 'dos con la palabra completa: se elige entre ellos');
check(one(pickContact('Ana', [c('Ana Soto'), c('ana')])) === 'ana', 'el nombre completo gana');
check(one(pickContact('ana soto', [c('Ana María Soto'), c('Ana Ruiz')])) === 'Ana María Soto', 'todas las palabras dichas, enteras');
check(one(pickContact('Ana Soto', [c('Ana Soto Díaz'), c('Ana Soto')], true)) === 'Ana Soto', 'elegido con un toque: nombre completo');
check(pickContact('Ana', [c('Ana Soto')], true) === null, 'elegido con un toque: nada parecido vale');
check(pickContact('Zoe', []) === null, 'sin resultados');
done();
