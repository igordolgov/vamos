// ============================================================
// shared/phrases/collocations.ts — белый список сочетаемости.
//
// Генератор фраз собирает слова по шаблонам, и без ограничений
// сочетаемости он порождает абсурд: «уставшая кровать»
// (cansado не описывает неодушевлённое), «пишу кровать»
// (escribir не сочетается с cama), «Они не тоже работают»
// (отрицание не ставится перед всеми наречиями), «Мы читаем
// дешёвую жизнь?» (leer не сочетается с vida), «Она может мочь?»
// (модальный не сочетается с модальным), «No hay la comida»
// (hay — без определённого артикля), «У неё есть три отца»,
// «Una maestra ve a la maestra» (подлежащее = дополнение).
//
// Здесь — ручные белые списки пар:
// 1. ADJ_NOUN_CLASSES + ADJ_NOUN_EXCEPTIONS: какие КЛАССЫ
//    существительных может описывать прилагательное (+ отдельные
//    существительные-исключения). Прилагательные без записи
//    считаются универсальными (хороший/большой/новый сочетаются
//    со всем). Классы, а не отдельные пары — подсчёт фраз
//    остаётся аналитическим и точным.
// 2. VERB_OBJ_ALLOWED: для глагола — разрешённые классы
//    дополнения ПЛЮС отдельные существительные-исключения
//    (escribir → книга, письмо, слово; tener → семья,
//    имущество, время; leer → только книга, письмо…).
//    Запись заменяет собой грубые objClasses из данных глагола.
// 3. TENER_NOUN_IDS / TENER_PLURAL_IDS: существительные,
//    естественно звучащие в конструкциях «У меня есть…»
//    и «У меня есть два/три/четыре…» (padre/madre исключены:
//    у человека не бывает трёх отцов).
// 4. PREVERB_NEG_OK / NEG_BEFORE_ADVERB_RU: допустимость
//    «no + наречие». «No siempre» — корректно; «No también»,
//    «No casi» — нет (для них отрицание строится иначе).
// ============================================================

import type { NounClass, Word } from '../types'

// ============================================================
// 1. Прилагательное × существительное
// ============================================================

/** Классы существительных, которые прилагательное описывает корректно.
 *  Пустой список = только существительные из ADJ_NOUN_EXCEPTIONS. */
export const ADJ_NOUN_CLASSES: Record<string, readonly NounClass[]> = {
  // Состояния человека (estar): только одушевлённые
  'a-cansado': ['person', 'family'],
  'a-contento': ['person', 'family'],
  'a-triste': ['person', 'family'],
  'a-feliz': ['person', 'family'],
  'a-enfermo': ['person', 'family'],
  'a-ocupado': ['person', 'family'],
  'a-libre': ['person', 'family'],
  'a-tranquilo': ['person', 'family', 'place', 'abstract'], // спокойный человек, спокойная ночь

  // Температура: предметы, еда, напитки (не люди)
  'a-caliente': ['food', 'drink', 'thing'],
  'a-frio': ['food', 'drink', 'thing'],

  // Чистота: предметы, места, напитки
  'a-limpio': ['thing', 'place', 'drink'],
  'a-sucio': ['thing', 'place', 'drink'],

  // Возраст: только люди (молодое вино — figurатив, не берём)
  'a-joven': ['person', 'family'],

  // Внешность и размер: люди и осязаемое
  'a-bonito': ['person', 'family', 'thing', 'place'],
  'a-feo': ['person', 'family', 'thing', 'place'],
  'a-alto': ['person', 'family', 'thing', 'place'], // высокий человек, высокий дом
  'a-bajo': ['person', 'family', 'thing', 'place'],

  // Сложность: только задачи, языки и отдельные понятия —
  // «лёгкая кровать», «трудное молоко» — не генерируем
  'a-facil': [],
  'a-dificil': [],

  // Значимость и интерес: понятия, языки, книги, люди
  'a-importante': ['abstract', 'language', 'person'],
  'a-interesante': ['abstract', 'language', 'thing', 'person'],

  // Скорость: люди и транспорт — «быстрая фотография» — не генерируем
  'a-rapido': ['person', 'family'],
  'a-lento': ['person', 'family'],

  // Цена: предметы, еда, места (не абстрактное — «дешёвая любовь» невозможна)
  'a-caro': ['thing', 'food', 'drink', 'place'],
  'a-barato': ['thing', 'food', 'drink', 'place'],

  // Цвета: предметы, еда, напитки, места («белый дом»), не люди
  'a-blanco': ['thing', 'food', 'drink', 'place'],
  'a-negro': ['thing', 'food', 'drink', 'place'],
  'a-rojo': ['thing', 'food', 'drink', 'place'],
  'a-verde': ['thing', 'food', 'drink', 'place'],
  'a-azul': ['thing', 'food', 'drink', 'place'],
  'a-amarillo': ['thing', 'food', 'drink', 'place'],

  // Вкус и богатство: еда/напитки — «вкусный», люди/семья — «богатый»
  'a-rico': ['food', 'drink', 'person', 'family'],
  'a-dulce': ['food', 'drink'],
  'a-delicioso': ['food', 'drink'],

  // Знаменитость и бедность: люди, места, произведения
  'a-famoso': ['person', 'family', 'place', 'thing'],
  'a-pobre': ['person', 'family', 'place'],
}

/** Отдельные существительные, разрешённые поверх классов */
export const ADJ_NOUN_EXCEPTIONS: Record<string, readonly string[]> = {
  // лёгкий/трудный — только задачи, языки и понятия: «лёгкая кровать»,
  // «трудное молоко», «деньги лёгкие» — не генерируем
  'a-facil': ['n-problema', 'n-pregunta', 'n-respuesta', 'n-espanol', 'n-ruso', 'n-ingles', 'n-historia', 'n-palabra', 'n-dia'],
  'a-dificil': ['n-problema', 'n-pregunta', 'n-respuesta', 'n-espanol', 'n-ruso', 'n-ingles', 'n-historia', 'n-palabra', 'n-dia', 'n-tiempo', 'n-vida'],
  // быстрый/медленный — люди, машина, еда (fast food), ответ
  'a-rapido': ['n-carro', 'n-comida', 'n-respuesta'],
  'a-lento': ['n-carro'],
  // дешёвый/дорогой о жизни и музыке: «жизнь здесь дешёвая», «дешёвая музыка»
  'a-caro': ['n-vida', 'n-musica'],
  'a-barato': ['n-vida', 'n-musica'],
  // богатый — о городе: «богатый город»
  'a-rico': ['n-ciudad'],
}

/** Прилагательное семантически сочетается с существительным? */
export function adjSemCompatible(adj: Word, noun: Word): boolean {
  if (ADJ_NOUN_EXCEPTIONS[adj.id]?.includes(noun.id)) return true
  const allowed = ADJ_NOUN_CLASSES[adj.id]
  if (!allowed) return true // универсальное: хороший, большой, новый…
  if (allowed.length === 0) return false // только исключения
  return !!noun.nounClass && allowed.includes(noun.nounClass)
}

/** Прилагательное сочетается с лицом (местоимение-подлежащее):
 *  «Я — молодой» — да, «Я — дешёвый», «Молоко — трудное» — нет */
export function adjPersonCompatible(adj: Word): boolean {
  const allowed = ADJ_NOUN_CLASSES[adj.id]
  if (!allowed) return true
  return allowed.includes('person') || allowed.includes('family')
}

// ============================================================
// 2. Глагол × прямое дополнение
// ============================================================

/** Правило дополнения: классы + отдельные существительные-исключения */
export interface VerbObjRule {
  classes: readonly NounClass[]
  nouns: readonly string[]
}

/** «Иметь»: семья, имущество, время — но не еда («мало курицы»),
 *  не музыка/жизнь/слово («есть музыка») и не абстрактные дни */
export const TENER_NOUN_IDS: readonly string[] = [
  // семья и близкие
  'n-padre', 'n-madre', 'n-hijo', 'n-hija', 'n-hermano', 'n-hermana', 'n-familia', 'n-amigo', 'n-amiga', 'n-nino', 'n-nina',
  // имущество и вещи
  'n-casa', 'n-carro', 'n-telefono', 'n-computadora', 'n-libro', 'n-llave', 'n-reloj', 'n-ropa', 'n-camisa', 'n-zapato',
  'n-bolsa', 'n-pelicula', 'n-foto', 'n-regalo', 'n-carta', 'n-papel', 'n-lapiz', 'n-pluma', 'n-mesa', 'n-silla', 'n-cama', 'n-cosa',
  // время, деньги, работа, мысли
  'n-tiempo', 'n-dinero', 'n-trabajo', 'n-problema', 'n-pregunta', 'n-respuesta', 'n-idea', 'n-historia',
]

/** Существительные, естественно звучащие во мн.ч. с числом:
 *  «два брата», «три книги» — но не «три отца», «трое денег» */
export const TENER_PLURAL_IDS: readonly string[] = [
  'n-hijo', 'n-hija', 'n-hermano', 'n-hermana', 'n-amigo', 'n-amiga', 'n-nino', 'n-nina',
  'n-casa', 'n-carro', 'n-telefono', 'n-computadora', 'n-libro', 'n-llave', 'n-reloj', 'n-camisa', 'n-zapato',
  'n-bolsa', 'n-pelicula', 'n-foto', 'n-regalo', 'n-carta', 'n-lapiz', 'n-pluma', 'n-mesa', 'n-silla', 'n-cama', 'n-cosa',
  'n-problema', 'n-pregunta', 'n-respuesta', 'n-idea', 'n-historia', 'n-trabajo',
]

/** Еда и напитки (для «дать/платить/делать» — ручные списки) */
const FOOD_DRINK: readonly string[] = [
  'n-agua', 'n-comida', 'n-pan', 'n-leche', 'n-queso', 'n-huevo', 'n-carne', 'n-pollo', 'n-pescado',
  'n-arroz', 'n-fruta', 'n-manzana', 'n-platano', 'n-tomate', 'n-cafe', 'n-cerveza', 'n-jugo', 'n-vino',
  'n-azucar', 'n-sal',
]

/** Глаголы, чьи грубые objClasses порождают абсурд — с точным списком */
export const VERB_OBJ_ALLOWED: Record<string, VerbObjRule> = {
  // ---------- чтение/письмо/память/речь: «читаю жизнь», «верю историю» — нет ----------
  'v-leer': { classes: [], nouns: ['n-libro', 'n-carta', 'n-papel', 'n-palabra', 'n-historia'] },
  'v-escribir': { classes: [], nouns: ['n-libro', 'n-carta', 'n-palabra', 'n-nombre', 'n-historia'] },
  'v-recordar': { classes: [], nouns: ['n-nombre', 'n-foto', 'n-idea', 'n-historia', 'n-respuesta'] },
  'v-decir': { classes: [], nouns: ['n-palabra', 'n-verdad', 'n-nombre'] },
  'v-creer': { classes: [], nouns: [] }, // creer — только с людьми и в наречных шаблонах

  // ---------- иметь/хотеть/нуждаться/ждать/искать ----------
  'v-tener': { classes: [], nouns: TENER_NOUN_IDS },
  'v-querer': { classes: ['thing', 'food', 'drink'], nouns: ['n-tiempo', 'n-dinero'] },
  'v-necesitar': { classes: ['thing'], nouns: ['n-tiempo', 'n-dinero', 'n-trabajo', 'n-respuesta'] },
  'v-esperar': { classes: [], nouns: ['n-respuesta'] }, // лица — в шаблоне с личным «a»
  'v-buscar': { classes: [], nouns: ['n-telefono', 'n-computadora', 'n-llave', 'n-libro', 'n-carro', 'n-bolsa', 'n-ropa', 'n-camisa', 'n-zapato', 'n-reloj', 'n-pluma', 'n-lapiz', 'n-dinero', 'n-trabajo', 'n-casa'] },

  // ---------- давать/делать/платить/класть: «даю стол», «плачу деньги» — нет ----------
  'v-dar': { classes: [], nouns: ['n-regalo', 'n-libro', 'n-foto', 'n-carta', 'n-papel', 'n-lapiz', 'n-pluma', 'n-llave', 'n-bolsa', 'n-dinero', 'n-telefono', 'n-computadora', 'n-ropa', 'n-camisa', 'n-zapato', 'n-reloj', 'n-palabra', ...FOOD_DRINK] },
  'v-hacer': { classes: [], nouns: ['n-comida', 'n-pan', 'n-cafe', 'n-jugo', 'n-vino', 'n-cerveza', 'n-carne', 'n-pollo', 'n-pescado', 'n-arroz', 'n-huevo', 'n-queso', 'n-fruta', 'n-manzana', 'n-platano', 'n-tomate', 'n-foto', 'n-trabajo', 'n-musica'] },
  'v-pagar': { classes: [], nouns: [...FOOD_DRINK, 'n-carro', 'n-telefono', 'n-computadora', 'n-libro', 'n-ropa', 'n-camisa', 'n-zapato'] },
  'v-poner': { classes: [], nouns: ['n-mesa', 'n-libro', 'n-ropa', 'n-pluma', 'n-lapiz', 'n-llave', 'n-bolsa', 'n-telefono', 'n-dinero', 'n-comida', 'n-pan', 'n-carne', 'n-pollo', 'n-pescado', 'n-arroz', 'n-huevo', 'n-queso', 'n-fruta', 'n-manzana', 'n-platano', 'n-tomate', 'n-sal', 'n-azucar'] },

  // ---------- пользоваться/носить/оставлять/открывать: «использую кровать» — нет ----------
  'v-usar': { classes: [], nouns: ['n-telefono', 'n-computadora', 'n-lapiz', 'n-pluma', 'n-papel', 'n-llave', 'n-carro', 'n-mesa', 'n-silla', 'n-bolsa', 'n-ropa', 'n-camisa', 'n-zapato', 'n-reloj', 'n-libro'] },
  'v-llevar': { classes: [], nouns: ['n-ropa', 'n-camisa', 'n-zapato', 'n-bolsa', 'n-llave', 'n-telefono', 'n-dinero', 'n-reloj', 'n-libro', 'n-pluma', 'n-lapiz', 'n-computadora', 'n-regalo', 'n-carta'] },
  'v-dejar': { classes: [], nouns: ['n-libro', 'n-llave', 'n-bolsa', 'n-carta', 'n-regalo', 'n-papel', 'n-dinero', 'n-telefono', 'n-lapiz', 'n-pluma', 'n-comida'] },
  'v-abrir': { classes: [], nouns: ['n-puerta', 'n-ventana', 'n-libro', 'n-bolsa', 'n-carta'] },
  'v-cerrar': { classes: [], nouns: ['n-puerta', 'n-ventana', 'n-libro', 'n-bolsa', 'n-carta'] },

  // ---------- начинать/заканчивать/изучать/есть: «ем воду», «начинаю жизнь» — нет ----------
  'v-comer': { classes: ['food'], nouns: [] }, // напитки — только beber
  'v-empezar': { classes: [], nouns: ['n-libro', 'n-trabajo', 'n-historia', 'n-pelicula'] },
  'v-terminar': { classes: [], nouns: ['n-libro', 'n-trabajo', 'n-historia', 'n-pelicula'] },
  'v-estudiar': { classes: ['language'], nouns: ['n-palabra', 'n-historia'] },
  'v-aprender': { classes: ['language'], nouns: ['n-palabra', 'n-historia'] },
}

/** Существительные, допустимые в роли дополнения глагола */
export function verbObjAllowedNouns(verb: Word, nouns: Word[]): Word[] {
  const rule = VERB_OBJ_ALLOWED[verb.id]
  if (!rule) {
    const cls = verb.verb?.objClasses
    if (!cls || cls.length === 0) return []
    return nouns.filter((n) => cls.includes(n.nounClass as never))
  }
  return nouns.filter(
    (n) => rule.classes.includes(n.nounClass as never) || rule.nouns.includes(n.id),
  )
}

/** Глагол сочетается с существительным-дополнением? */
export function verbObjCompatible(verb: Word, noun: Word): boolean {
  return verbObjAllowedNouns(verb, [noun]).length > 0
}

// ============================================================
// 3. Наречие × отрицание
// ============================================================

/** Наречия, корректно звучащие после «no» («No siempre trabajo») */
export const PREVERB_NEG_OK: readonly string[] = ['adv-siempre']

/** Наречия с особым отрицанием «adv + no» («Ya no trabajo») */
export const NEG_BEFORE_ADVERB: readonly string[] = ['adv-ya', 'adv-todavia']

/** Русские формы для «adv + no»: ya → «уже не», todavía → «ещё не» */
export const NEG_BEFORE_ADVERB_RU: Record<string, string> = {
  'adv-ya': 'уже не',
  'adv-todavia': 'ещё не',
}
