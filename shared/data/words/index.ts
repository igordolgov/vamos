// ============================================================
// shared/data/words/index.ts — сводный словарь приложения.
//
// Экспортирует все слова и быстрые индексы-словари для движка
// фраз, страниц и статистики.
// ============================================================

import type { PartOfSpeech, Word } from '../../types'
import { LESSON_WORDS } from '../curriculum'
import { ADJECTIVES } from './adjectives'
import { CONJUNCTIONS, CONSTRUCTIONS, NUMBERS, ADVERBS, PREPOSITIONS, QUESTIONS } from './preps-adverbs-etc'
import { DETERMINERS, PRONOUNS } from './pronouns-determiners'
import { NOUNS } from './nouns'
import { VERBS } from './verbs'

/**
 * Все слова приложения (313 штук, 32 урока).
 * Порядок уроков задаёт curriculum.ts (частотность, не части речи):
 * здесь назначаем словам номера уроков по учебному плану и проверяем,
 * что план покрывает словарь целиком — без пропусков и дублей.
 */
function buildAllWords(): Word[] {
  const lessonOf = new Map<string, number>()
  LESSON_WORDS.forEach((ids, i) => {
    for (const id of ids) {
      if (lessonOf.has(id)) throw new Error(`curriculum.ts: слово ${id} в уроках ${lessonOf.get(id)} и ${i + 1}`)
      lessonOf.set(id, i + 1)
    }
  })
  const raw: Word[] = [
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
  return raw.map((w) => {
    const lesson = lessonOf.get(w.id)
    if (!lesson) throw new Error(`curriculum.ts: слово ${w.id} не входит ни в один урок`)
    return lesson !== w.lesson ? { ...w, lesson } : w
  })
}

export const ALL_WORDS: Word[] = buildAllWords()

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
