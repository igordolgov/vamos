// ============================================================
// shared/data/words/preps-adverbs-etc.ts
// Предлоги, наречия, вопросительные слова, союзы, числительные,
// конструкции (hay, ir a + инфинитив...).
// ============================================================

import type { Word } from '../../types'
import { adv, conj, cstr, num, prep, qw } from './helpers'

/** Предлоги (уроки 17–18). nounClasses — с чем предлог образует фразы */
export const PREPOSITIONS: Word[] = [
  prep('prep-a', 'a', ['в (куда?)', 'к', 'на'], 17, ['place', 'person', 'family']),
  prep('prep-de', 'de', ['из', 'от', 'с (обозначает принадлежность)'], 17, ['place', 'thing', 'food', 'drink', 'abstract', 'family', 'person']),
  prep('prep-en', 'en', ['в (где?)', 'на'], 17, ['place']),
  prep('prep-con', 'con', ['с', 'со'], 17, ['person', 'family', 'animal', 'thing']),
  prep('prep-para', 'para', ['для', 'чтобы'], 17, ['place', 'person', 'family', 'abstract']),
  prep('prep-por', 'por', ['по', 'через', 'за'], 17, ['place', 'abstract']),
  prep('prep-sin', 'sin', ['без'], 17, ['thing', 'food', 'drink', 'abstract']),
  prep('prep-sobre', 'sobre', ['о', 'на (поверхности)'], 17, ['abstract', 'thing']),
  prep('prep-entre', 'entre', ['между'], 17, ['place']),
  prep('prep-desde', 'desde', ['от', 'с (начало пути)'], 17, ['place']),
  prep('prep-hasta', 'hasta', ['до', 'до (конца пути)'], 17, ['place']),
  prep('prep-antes-de', 'antes de', ['до (чего-то), перед'], 18, ['abstract', 'thing', 'food']),
  prep('prep-despues-de', 'después de', ['после'], 18, ['abstract', 'thing', 'food']),
  prep('prep-cerca-de', 'cerca de', ['около', 'рядом с'], 18, ['place']),
  prep('prep-lejos-de', 'lejos de', ['далеко от'], 18, ['place']),
]

/** Наречия (уроки 19–20) */
export const ADVERBS: Word[] = [
  adv('adv-no', 'no', ['не', 'нет'], 3, { preVerb: true }, {
    ruHint: 'Отрицание ставится ПЕРЕД глаголом: No hablo español',
  }),
  adv('adv-aqui', 'aquí', ['здесь'], 19, { place: true }),
  adv('adv-alli', 'allí', ['там'], 19, { place: true }),
  adv('adv-ahora', 'ahora', ['сейчас'], 19, { preVerb: true }),
  adv('adv-hoy', 'hoy', ['сегодня'], 19, {}),
  adv('adv-manana', 'mañana', ['завтра'], 19, {}),
  adv('adv-ayer', 'ayer', ['вчера'], 19, {}),
  adv('adv-siempre', 'siempre', ['всегда'], 19, { preVerb: true }),
  adv('adv-nunca', 'nunca', ['никогда'], 19, { preVerb: true }, {
    ruHint: 'В испанском двойное отрицание: Nunca hablo ruso',
  }),
  adv('adv-tambien', 'también', ['тоже', 'также'], 19, { preVerb: true }),
  adv('adv-tampoco', 'tampoco', ['тоже не'], 19, { preVerb: true }, {
    ruHint: 'No hablo inglés y tú tampoco — я не говорю по-английски и ты тоже',
  }),
  adv('adv-muy', 'muy', ['очень'], 19, {}),
  adv('adv-bien', 'bien', ['хорошо'], 19, {}),
  adv('adv-mal', 'mal', ['плохо'], 19, {}),
  adv('adv-ya', 'ya', ['уже'], 20, { preVerb: true }),
  adv('adv-todavia', 'todavía', ['ещё', 'всё ещё'], 20, { preVerb: true }),
  adv('adv-casi', 'casi', ['почти'], 20, { preVerb: true }),
  adv('adv-apenas', 'apenas', ['едва', 'чуть-чуть'], 20, { preVerb: true }),
  adv('adv-juntos', 'juntos', ['вместе'], 20, {}),
  adv('adv-despacio', 'despacio', ['медленно'], 20, {}),
  adv('adv-rapido', 'rápido', ['быстро'], 20, {}),
  adv('adv-temprano', 'temprano', ['рано'], 20, {}),
  adv('adv-tarde', 'tarde', ['поздно'], 20, {}),
  adv('adv-mas', 'más', ['больше', 'более'], 20, {}),
]

/** Вопросительные слова (урок 21) */
export const QUESTIONS: Word[] = [
  qw('qw-que', 'qué', ['что', 'какой'], 21),
  qw('qw-quien', 'quién', ['кто'], 21, { esAlt: ['quiénes'] }),
  qw('qw-donde', 'dónde', ['где', 'куда'], 21),
  qw('qw-como', 'cómo', ['как'], 21),
  qw('qw-cuando', 'cuándo', ['когда'], 21),
  qw('qw-por-que', 'por qué', ['почему'], 21),
  qw('qw-cuanto', 'cuánto', ['сколько'], 21, {
    adj: { m: 'cuánto', f: 'cuánta', mp: 'cuántos', fp: 'cuántas' },
  }),
  qw('qw-cual', 'cuál', ['который', 'какой (из)'], 21, { esAlt: ['cuáles'] }),
]

/** Союзы (урок 22) */
export const CONJUNCTIONS: Word[] = [
  conj('c-y', 'y', ['и'], 22, { esAlt: ['e'], ruHint: 'Перед словами на i-/hi- меняется на «e»: español e inglés' }),
  conj('c-o', 'o', ['или'], 22, { esAlt: ['u'], ruHint: 'Перед словами на o-/ho- меняется на «u»' }),
  conj('c-pero', 'pero', ['но'], 22),
  conj('c-porque', 'porque', ['потому что'], 22),
  conj('c-si', 'si', ['если'], 22),
  conj('c-cuando', 'cuando', ['когда (союз)'], 22),
  conj('c-que', 'que', ['что (союз)', 'чтобы'], 22),
  conj('c-aunque', 'aunque', ['хотя'], 22),
  conj('c-entonces', 'entonces', ['тогда'], 22),
]

/** Числительные (урок 23: 0–10; урок 34: 11–100) */
export const NUMBERS: Word[] = [
  num('num-cero', 'cero', ['ноль'], 23),
  num('num-uno', 'uno', ['один'], 23, { ruHint: 'Перед сущ. м.р.: un libro; перед ж.р.: una casa' }),
  num('num-dos', 'dos', ['два'], 23),
  num('num-tres', 'tres', ['три'], 23),
  num('num-cuatro', 'cuatro', ['четыре'], 23),
  num('num-cinco', 'cinco', ['пять'], 23),
  num('num-seis', 'seis', ['шесть'], 23),
  num('num-siete', 'siete', ['семь'], 23),
  num('num-ocho', 'ocho', ['восемь'], 23),
  num('num-nueve', 'nueve', ['девять'], 23),
  num('num-diez', 'diez', ['десять'], 23),
  // --- Урок 34: 11–100. До 29 — одно слово; дальше десятки + y + единица:
  // treinta y cinco (35), cuarenta y dos (42) — «y» = «и»
  num('num-once', 'once', ['одиннадцать'], 34),
  num('num-doce', 'doce', ['двенадцать'], 34),
  num('num-trece', 'trece', ['тринадцать'], 34),
  num('num-catorce', 'catorce', ['четырнадцать'], 34),
  num('num-quince', 'quince', ['пятнадцать'], 34),
  num('num-dieciseis', 'dieciséis', ['шестнадцать'], 34),
  num('num-diecisiete', 'diecisiete', ['семнадцать'], 34),
  num('num-dieciocho', 'dieciocho', ['восемнадцать'], 34),
  num('num-diecinueve', 'diecinueve', ['девятнадцать'], 34),
  num('num-veinte', 'veinte', ['двадцать'], 34),
  num('num-veintiuno', 'veintiuno', ['двадцать один'], 34, {
    ruHint: 'Перед сущ.: veintiún libro (м.р.), veintiuna casas (ж.р.)',
  }),
  num('num-veintidos', 'veintidós', ['двадцать два'], 34),
  num('num-veintitres', 'veintitrés', ['двадцать три'], 34),
  num('num-veinticuatro', 'veinticuatro', ['двадцать четыре'], 34),
  num('num-veinticinco', 'veinticinco', ['двадцать пять'], 34),
  num('num-veintiseis', 'veintiséis', ['двадцать шесть'], 34),
  num('num-veintisiete', 'veintisiete', ['двадцать семь'], 34),
  num('num-veintiocho', 'veintiocho', ['двадцать восемь'], 34),
  num('num-veintinueve', 'veintinueve', ['двадцать девять'], 34),
  num('num-treinta', 'treinta', ['тридцать'], 34, {
    ruHint: '36 = treinta y seis — десяток + «y» + единица',
  }),
  num('num-cuarenta', 'cuarenta', ['сорок'], 34),
  num('num-cincuenta', 'cincuenta', ['пятьдесят'], 34),
  num('num-sesenta', 'sesenta', ['шестьдесят'], 34),
  num('num-setenta', 'setenta', ['семьдесят'], 34),
  num('num-ochenta', 'ochenta', ['восемьдесят'], 34),
  num('num-noventa', 'noventa', ['девяносто'], 34),
  num('num-cien', 'cien', ['сто'], 34, { ruHint: 'cien libros — сто книг; 100+ — cientos (не в A1)' }),
]

/** Конструкции (урок 26) — «кирпичи» для фраз */
export const CONSTRUCTIONS: Word[] = [
  cstr('cstr-hay', 'hay', ['есть (имеется)'], 26, {
    pattern: 'noun',
    ru: 'hay + сущ.: Hay una mesa — Есть стол (безличная форма haber)',
  }),
  cstr('cstr-hay-que', 'hay que', ['надо', 'нужно'], 26, {
    pattern: 'inf',
    ru: 'hay que + инфинитив: Hay que trabajar — Надо работать',
  }),
  cstr('cstr-ir-a', 'ir a', ['собираться (сделать)'], 26, {
    pattern: 'inf',
    ru: 'ir a + инфинитив — будущее действие: Voy a comer — Я поем',
  }),
  cstr('cstr-tener-que', 'tener que', ['быть должным'], 26, {
    pattern: 'inf',
    ru: 'tener que + инфинитив: Tengo que trabajar — Я должен работать',
  }),
  cstr('cstr-acabar-de', 'acabar de', ['только что (сделать)'], 26, {
    pattern: 'inf',
    ru: 'acabar de + инфинитив: Acabo de comer — Я только что поел',
  }),
  cstr('cstr-hace-tiempo', 'hace', ['тому назад'], 26, {
    pattern: 'number-noun',
    ru: 'hace + количество времени: Hace dos años — Два года назад',
  }),
  cstr('cstr-estar-gerundio', 'estar + герундий', ['быть в процессе'], 26, {
    pattern: 'gerund',
    ru: 'estar + герундий: Estoy comiendo — Я (сейчас) ем',
  }),
  // --- Спасательные фразы (готовые «скажите так», без грамматических терминов) ---
  cstr('cstr-dame', 'dame', ['дай'], 33, {
    pattern: 'fixed',
    ru: 'Попроси нужное: Dame el teléfono — Дай телефон',
    fixedEs: 'Dame el teléfono, por favor',
    fixedRu: 'Дай телефон, пожалуйста',
  }),
  cstr('cstr-dime', 'dime', ['скажи'], 33, {
    pattern: 'fixed',
    ru: 'Попроси сказать: Dime la verdad — Скажи правду',
    fixedEs: 'Dime la verdad',
    fixedRu: 'Скажи правду',
  }),
  cstr('cstr-mira', 'mira', ['посмотри'], 33, {
    pattern: 'fixed',
    ru: 'Направь внимание: Mira la ventana — Посмотри в окно',
    fixedEs: 'Mira la ventana',
    fixedRu: 'Посмотри в окно',
  }),
  cstr('cstr-oye', 'oye', ['послушай'], 33, {
    pattern: 'fixed',
    ru: 'Начни разговор: Oye, ¿qué pasa? — Послушай, что происходит?',
    fixedEs: 'Oye, ¿qué pasa?',
    fixedRu: 'Послушай, что происходит?',
  }),
  cstr('cstr-espera', 'espera', ['подожди'], 33, {
    pattern: 'fixed',
    ru: 'Останови момент: Espera aquí — Подожди здесь',
    fixedEs: 'Espera aquí',
    fixedRu: 'Подожди здесь',
  }),
]
