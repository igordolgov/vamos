// ============================================================
// shared/phrases/collocations.ts — белый список сочетаемости.
//
// Генератор фраз собирает слова по шаблонам, и без ограничений
// сочетаемости он порождает абсурд: «уставшая кровать»
// (cansado не описывает неодушевлённое), «пишу кровать»
// (escribir не сочетается с cama), «Они не тоже работают»
// (отрицание не ставится перед всеми наречиями).
//
// Здесь — ручные белые списки пар:
// 1. ADJ_NOUN_CLASSES: какие КЛАССЫ существительных может
//    описывать прилагательное. Прилагательные без записи в
//    списке считаются универсальными (хороший/большой/новый
//    сочетаются со всем). Классы, а не отдельные пары —
//    подсчёт фраз остаётся аналитическим и точным.
// 2. VERB_OBJ_ALLOWED: для глагола — разрешённые классы
//    дополнения ПЛЮС отдельные существительные-исключения
//    (escribir → книга, письмо, слово; leer → книга…).
//    Запись заменяет собой грубые objClasses из данных глагола.
// 3. PREVERB_NEG_OK / NEG_ONLY: допустимость «no + наречие».
//    «No siempre» — корректно («не всегда»); «No también»,
//    «No casi» — нет (для них отрицание строится иначе:
//    «tampoco», «ya no» — отдельные шаблоны).
// ============================================================

import type { NounClass, Word } from '../types'

// ============================================================
// 1. Прилагательное × существительное
// ============================================================

/** Классы существительных, которые прилагательное описывает корректно */
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

  // Сложность: задачи, языки, предметы
  'a-facil': ['abstract', 'language', 'thing'],
  'a-dificil': ['abstract', 'language', 'thing'],

  // Значимость и интерес: понятия, языки, книги, люди
  'a-importante': ['abstract', 'language', 'person'],
  'a-interesante': ['abstract', 'language', 'thing', 'person'],

  // Скорость: люди, предметы, события
  'a-rapido': ['person', 'family', 'thing', 'abstract'],
  'a-lento': ['person', 'family', 'thing'],

  // Цена: предметы, еда, места, абстрактное («дешёвая музыка»)
  'a-caro': ['thing', 'food', 'drink', 'place', 'abstract'],
  'a-barato': ['thing', 'food', 'drink', 'place', 'abstract'],

  // Цвета: предметы, еда, напитки, места («белый дом»), не люди
  'a-blanco': ['thing', 'food', 'drink', 'place'],
  'a-negro': ['thing', 'food', 'drink', 'place'],
  'a-rojo': ['thing', 'food', 'drink', 'place'],
  'a-verde': ['thing', 'food', 'drink', 'place'],
  'a-azul': ['thing', 'food', 'drink', 'place'],
  'a-amarillo': ['thing', 'food', 'drink', 'place'],

  // Вкус: еда и напитки
  'a-rico': ['food', 'drink'],
  'a-dulce': ['food', 'drink'],
  'a-delicioso': ['food', 'drink'],

  // Знаменитость и бедность: люди, места, произведения
  'a-famoso': ['person', 'family', 'place', 'thing'],
  'a-pobre': ['person', 'family', 'place'],
}

/** Прилагательное семантически сочетается с существительным? */
export function adjSemCompatible(adj: Word, noun: Word): boolean {
  const allowed = ADJ_NOUN_CLASSES[adj.id]
  if (!allowed) return true // универсальное: хороший, большой, новый…
  return !!noun.nounClass && allowed.includes(noun.nounClass)
}

// ============================================================
// 2. Глагол × прямое дополнение
// ============================================================

/** Правило дополнения: классы + отдельные существительные-исключения */
export interface VerbObjRule {
  classes: readonly NounClass[]
  nouns: readonly string[]
}

/** Глаголы, чьи грубые objClasses порождают абсурд — с точным списком */
export const VERB_OBJ_ALLOWED: Record<string, VerbObjRule> = {
  // «пишу кровать», «читаю стол» — писать/читать можно книги, письма,
  // бумагу и абстрактное (слово, имя, ответ, историю)
  'v-leer': { classes: ['abstract'], nouns: ['n-libro', 'n-carta', 'n-papel'] },
  'v-escribir': { classes: ['abstract'], nouns: ['n-libro', 'n-carta', 'n-palabra', 'n-nombre'] },
  // «помню стол» — помнить можно мысли и отдельные факты
  'v-recordar': { classes: ['abstract'], nouns: ['n-nombre', 'n-foto'] },
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
