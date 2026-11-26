// ============================================================
// shared/stats.ts — статистика изучения.
//
// Считает: известные слова, доступные фразы (по всем шаблонам),
// прогресс по частям речи и урокам, проекции «выучишь X → +Y фраз».
// ============================================================

import type { PartOfSpeech, Progress, Word } from './types'
import { isWordKnown, KNOWN_THRESHOLD } from './types'
import { ALL_WORDS, WORD_COUNT, POS_LABELS, wordsByLesson, getWord } from './data/words'
import { LESSONS } from './data/lessons'
import { allTemplates } from './phrases/templates'
import { countTemplate, gainsTemplate, templateReady } from './phrases/engine'

/**
 * Множество известных слов из прогресса. Слово считается известным,
 * когда набран порог верных ответов — или когда пользователь отметил
 * «Уже знал» (слово считается выученным: идёт в процент уроков,
 * статистику и включается во фразы, как пройденное в уроках).
 */
export function knownSet(progress: Progress): Set<string> {
  const set = new Set<string>()
  for (const [id, wp] of Object.entries(progress.words)) {
    if (isWordKnown(wp)) set.add(id)
  }
  return set
}

/** Количество известных слов */
export function knownWordsCount(progress: Progress): number {
  return knownSet(progress).size
}

/** Слова в процессе изучения (есть верные ответы, но ещё не выучено) */
export function inProgressWords(progress: Progress): string[] {
  return Object.entries(progress.words)
    .filter(([id, wp]) => !isWordKnown(wp) && wp.correct > 0)
    .map(([id]) => id)
}

// ============================================================
// Подсчёт фраз (с кешированием по составу известных слов)
// ============================================================

const countCache = new Map<string, { known: number; total: number }>()

/** Кеш-ключ множества (отсортированные id) */
function setKey(set: Set<string>): string {
  return [...set].sort().join(',')
}

export interface PhraseStats {
  /** Доступных фраз из известных слов */
  known: number
  /** Всего возможных фраз (все слова) */
  total: number
}

/** Статистика фраз: доступно сейчас / всего возможно */
export function phraseStats(progress: Progress): PhraseStats {
  const known = knownSet(progress)
  const key = setKey(known)
  const cached = countCache.get(key)
  if (cached) return cached

  const templates = allTemplates()
  let knownPhrases = 0
  let totalPhrases = 0
  for (const t of templates) {
    knownPhrases += countTemplate(t, known)
    totalPhrases += countTemplate(t, new Set(ALL_WORDS.map((w) => w.id)))
  }
  const result = { known: knownPhrases, total: totalPhrases }
  // Ограничиваем кеш, чтобы не рос бесконечно
  if (countCache.size > 50) countCache.clear()
  countCache.set(key, result)
  return result
}

/** Сколько фраз доступно для произвольного множества слов */
export function phrasesForWords(wordIds: Set<string>): number {
  let total = 0
  for (const t of allTemplates()) total += countTemplate(t, wordIds)
  return total
}

/** Общий размер фразового корпуса (все слова во всех шаблонах).
 *  Кешируется на уровне модуля: SSR считает один раз за жизнь процесса. */
let totalCache: number | null = null
export function totalPhrases(): number {
  if (totalCache === null) {
    totalCache = phrasesForWords(new Set(ALL_WORDS.map((w) => w.id)))
  }
  return totalCache
}

// ============================================================
// Проекции «выучишь X → будешь знать Y»
// ============================================================

export interface Opportunity {
  /** Слово, которое стоит выучить */
  word: Word
  /** Сколько НОВЫХ фраз откроется */
  newPhrases: number
  /** Сколько фраз будет всего после изучения */
  totalAfter: number
}

/**
 * Лучшие возможности: неизученные слова, отсортированные по тому,
 * сколько новых фраз они открывают. Основа страницы «Возможности».
 */
export function opportunities(progress: Progress, limit = 30): Opportunity[] {
  const known = knownSet(progress)
  const templates = allTemplates()
  const totals = new Map<string, number>()

  for (const t of templates) {
    if (!templateReady(t, known)) continue
    const gains = gainsTemplate(t, known)
    for (const [wordId, gain] of gains) {
      totals.set(wordId, (totals.get(wordId) ?? 0) + gain)
    }
  }

  const list: Opportunity[] = []
  const current = phraseStats(progress).known
  for (const [wordId, gain] of totals) {
    const word = ALL_WORDS.find((w) => w.id === wordId)
    if (word && gain > 0 && !known.has(wordId)) {
      list.push({ word, newPhrases: gain, totalAfter: current + gain })
    }
  }
  list.sort((a, b) => b.newPhrases - a.newPhrases)
  return list.slice(0, limit)
}

/**
 * Проекция для конкретного слова: «выучишь «para» → +34 фразы».
 * Используется на страницах слов и уроках.
 */
export function opportunityFor(progress: Progress, wordId: string): Opportunity | null {
  const known = knownSet(progress)
  if (known.has(wordId)) return null
  const templates = allTemplates()
  let gain = 0
  for (const t of templates) {
    if (!templateReady(t, known)) continue
    gain += gainsTemplate(t, known).get(wordId) ?? 0
  }
  if (gain === 0) return null
  const current = phraseStats(progress).known
  return { word: ALL_WORDS.find((w) => w.id === wordId)!, newPhrases: gain, totalAfter: current + gain }
}

/**
 * Групповая проекция: «выучишь все предлоги → +N фраз».
 * Считает дельту от изучения всей группы слов разом.
 */
export function groupOpportunity(progress: Progress, words: Word[]): number {
  const known = knownSet(progress)
  const extended = new Set(known)
  for (const w of words) extended.add(w.id)
  const before = phrasesForWords(known)
  const after = phrasesForWords(extended)
  return after - before
}

// ============================================================
// «Ключи» к запертым шаблонам
// ============================================================

/** Один «ключ»: набор нехватаемых слов, открывающий группу шаблонов */
export interface UnlockKey {
  /** Слова, которых не хватает (нужно выучить все) */
  words: Word[]
  /** Сколько шаблонов откроется */
  templates: number
  /** Сколько фраз суммарно дадут эти шаблоны */
  potential: number
}

/**
 * Ключи к неактивным шаблонам: группирует их по набору нехватаемых
 * обязательных слов. Сначала — самые достижимые ключи (одно слово),
 * среди них — самые «богатые» по числу фраз. Подсказка вида
 * «выучите ser → откроется 4 шаблона, +22 000 фраз».
 */
export function unlockKeys(progress: Progress, limit = 4): UnlockKey[] {
  const known = knownSet(progress)
  const groups = new Map<string, { ids: string[]; templates: number; potential: number }>()
  for (const t of allTemplates()) {
    const missing = t.requires.filter((id) => !known.has(id))
    if (missing.length === 0) continue
    const key = [...missing].sort().join('+')
    const g = groups.get(key) ?? { ids: missing, templates: 0, potential: 0 }
    g.templates += 1
    g.potential += countTemplate(t, new Set(ALL_WORDS.map((w) => w.id)))
    groups.set(key, g)
  }
  return [...groups.values()]
    .sort((a, b) => a.ids.length - b.ids.length || b.potential - a.potential)
    .slice(0, limit)
    .map((g) => ({ words: g.ids.map((id) => getWord(id)), templates: g.templates, potential: g.potential }))
}

// ============================================================
// Прогресс по частям речи и урокам
// ============================================================

export interface PosProgress {
  pos: PartOfSpeech
  label: { ru: string; es: string; emoji: string }
  known: number
  total: number
}

/** Прогресс по частям речи (для колец на дашборде) */
export function progressByPos(progress: Progress): PosProgress[] {
  const known = knownSet(progress)
  const result: PosProgress[] = []
  for (const pos of Object.keys(POS_LABELS) as PartOfSpeech[]) {
    const words = ALL_WORDS.filter((w) => w.pos === pos)
    result.push({
      pos,
      label: POS_LABELS[pos],
      known: words.filter((w) => known.has(w.id)).length,
      total: words.length,
    })
  }
  return result
}

export interface LessonProgress {
  number: number
  titleRu: string
  titleEs: string
  hintRu: string
  known: number
  total: number
  /** Доля выученных слов, 0..1 */
  ratio: number
}

/** Прогресс по урокам (для страницы «Уроки») */
export function progressByLessons(progress: Progress): LessonProgress[] {
  const known = knownSet(progress)
  return LESSONS.map((lesson) => {
    const words = wordsByLesson(lesson.number)
    const k = words.filter((w) => known.has(w.id)).length
    return {
      number: lesson.number,
      titleRu: lesson.titleRu,
      titleEs: lesson.titleEs,
      hintRu: lesson.hintRu,
      known: k,
      total: words.length,
      ratio: words.length ? k / words.length : 0,
    }
  })
}

/** Общий прогресс словаря, 0..1 */
export function overallProgress(progress: Progress): number {
  return knownWordsCount(progress) / WORD_COUNT
}

/** Сколько верных ответов осталось до «выучено» */
export function answersToKnown(progress: Progress, wordId: string): number {
  const wp = progress.words[wordId]
  if (!wp) return KNOWN_THRESHOLD
  return Math.max(0, KNOWN_THRESHOLD - wp.correct)
}
