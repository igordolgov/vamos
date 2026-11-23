// ============================================================
// shared/data/words/index.ts — сводный словарь приложения.
//
// Экспортирует все слова и быстрые индексы-словари для движка
// фраз, страниц и статистики.
// ============================================================

import type { PartOfSpeech, Word } from '../../types'
import { ADJECTIVES } from './adjectives'
import { CONJUNCTIONS, CONSTRUCTIONS, NUMBERS, ADVERBS, PREPOSITIONS, QUESTIONS } from './preps-adverbs-etc'
import { DETERMINERS, PRONOUNS } from './pronouns-determiners'
import { NOUNS } from './nouns'
import { VERBS } from './verbs'

/** Все слова приложения (~310 штук, 32 урока) */
export const ALL_WORDS: Word[] = [
  ...PRONOUNS,
  ...DETERMINERS,
  ...VERBS,
  ...NOUNS,
  ...ADJECTIVES,
  ...PREPOSITIONS,
  ...ADVERBS,
  ...QUESTIONS,
  ...CONJUNCTIONS,
  ...NUMBERS,
  ...CONSTRUCTIONS,
]

/** Количество слов в словаре (для статистики и дашборда) */
export const WORD_COUNT = ALL_WORDS.length

/** Быстрый поиск слова по идентификатору */
export const WORDS_BY_ID: Readonly<Record<string, Word>> = Object.fromEntries(
  ALL_WORDS.map((w) => [w.id, w]),
)

/** Получить слово по id (с проверкой существования) */
export function getWord(id: string): Word {
  const w = WORDS_BY_ID[id]
  if (!w) throw new Error(`Неизвестный идентификатор слова: ${id}`)
  return w
}

/** Безопасный поиск по id (возвращает undefined, если слова нет) */
export function findWord(id: string): Word | undefined {
  return WORDS_BY_ID[id]
}

/** Слова по частям речи (для страницы «Слова» и статистики) */
export function wordsByPos(pos: PartOfSpeech): Word[] {
  return ALL_WORDS.filter((w) => w.pos === pos)
}

/** Слова конкретного урока в исходном порядке */
export function wordsByLesson(lesson: number): Word[] {
  return ALL_WORDS.filter((w) => w.lesson === lesson)
}

/** Человеческое название части речи (для интерфейса) */
export const POS_LABELS: Record<PartOfSpeech, { ru: string; es: string; emoji: string }> = {
  pronoun: { ru: 'местоимения', es: 'pronombres', emoji: '👤' },
  determiner: { ru: 'артикли', es: 'artículos', emoji: '🅰️' },
  verb: { ru: 'глаголы', es: 'verbos', emoji: '🏃' },
  noun: { ru: 'существительные', es: 'sustantivos', emoji: '📦' },
  adjective: { ru: 'прилагательные', es: 'adjetivos', emoji: '🎨' },
  preposition: { ru: 'предлоги', es: 'preposiciones', emoji: '🧭' },
  adverb: { ru: 'наречия', es: 'adverbios', emoji: '⏱️' },
  question: { ru: 'вопросы', es: 'preguntas', emoji: '❓' },
  conjunction: { ru: 'союзы', es: 'conjunciones', emoji: '🔗' },
  number: { ru: 'числа', es: 'números', emoji: '🔢' },
  construction: { ru: 'конструкции', es: 'construcciones', emoji: '🏗️' },
}
