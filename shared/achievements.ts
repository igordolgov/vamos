// ============================================================
// shared/achievements.ts — бейджи-достижения.
//
// Каждое достижение — условие над прогрессом. Вычисляется на
// клиенте, полученные сохраняются в progress.achievements.
// ============================================================

import type { Progress } from './types'
import { ALL_WORDS } from './data/words'
import { LESSONS } from './data/lessons'
import { knownSet, phraseStats, progressByLessons } from './stats'
import { currentStreak } from './streak'

/** Описание достижения */
export interface Achievement {
  id: string
  icon: string
  titleRu: string
  titleEs: string
  descRu: string
  /** Проверка: получено ли достижение при данном прогрессе */
  check: (ctx: AchievementContext) => boolean
}

/** Контекст проверки (вычисляется один раз за прогон) */
export interface AchievementContext {
  known: Set<string>
  wordsKnown: number
  phrasesKnown: number
  answersCorrect: number
  streak: number
  lessonsDone: number
  /** Сколько фраз собрано на практике (Σ practiced по всем фразам) */
  phrasesPracticed: number
  /** Есть фраза, собранная без ошибок с первого раза */
  phraseFirstTry: boolean
}

/** Все достижения приложения */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-word',
    icon: '🌱',
    titleRu: 'Первое слово',
    titleEs: 'Primera palabra',
    descRu: 'Выучите первое слово',
    check: (c) => c.wordsKnown >= 1,
  },
  {
    id: 'words-10',
    icon: '🔤',
    titleRu: 'Десятка',
    titleEs: 'Diez palabras',
    descRu: 'Выучите 10 слов',
    check: (c) => c.wordsKnown >= 10,
  },
  {
    id: 'words-50',
    icon: '📚',
    titleRu: 'Полсотни',
    titleEs: 'Cincuenta',
    descRu: 'Выучите 50 слов',
    check: (c) => c.wordsKnown >= 50,
  },
  {
    id: 'words-100',
    icon: '💯',
    titleRu: 'Сотня',
    titleEs: 'Cien palabras',
    descRu: 'Выучите 100 слов',
    check: (c) => c.wordsKnown >= 100,
  },
  {
    id: 'words-200',
    icon: '🎓',
    titleRu: 'Двести!',
    titleEs: 'Doscientas',
    descRu: 'Выучите 200 слов',
    check: (c) => c.wordsKnown >= 200,
  },
  {
    id: 'words-all',
    icon: '👑',
    titleRu: 'Весь словарь',
    titleEs: 'Diccionario completo',
    descRu: 'Выучите весь словарь',
    check: (c) => c.wordsKnown >= ALL_WORDS.length,
  },
  {
    id: 'phrases-100',
    icon: '💬',
    titleRu: '100 фраз',
    titleEs: 'Cien frases',
    descRu: 'Открыть 100 фраз',
    check: (c) => c.phrasesKnown >= 100,
  },
  {
    id: 'phrases-1000',
    icon: '🗣️',
    titleRu: '1000 фраз',
    titleEs: 'Mil frases',
    descRu: 'Открыть 1000 фраз',
    check: (c) => c.phrasesKnown >= 1000,
  },
  {
    id: 'phrases-10000',
    icon: '🌟',
    titleRu: '10 000 фраз',
    titleEs: 'Diez mil frases',
    descRu: 'Открыть 10 000 фраз',
    check: (c) => c.phrasesKnown >= 10000,
  },
  {
    id: 'phrases-100000',
    icon: '🔥',
    titleRu: 'Сотня тысяч',
    titleEs: 'Cien mil frases',
    descRu: 'Открыть 100 000 фраз',
    check: (c) => c.phrasesKnown >= 100000,
  },
  {
    id: 'phrases-said-100',
    icon: '🗣️',
    titleRu: 'Сказал 100 фраз',
    titleEs: 'Cien frases dichas',
    descRu: 'Собрать 100 фраз на практике',
    check: (c) => c.phrasesPracticed >= 100,
  },
  {
    id: 'phrase-first-try',
    icon: '🥇',
    titleRu: 'С первого раза',
    titleEs: 'A la primera',
    descRu: 'Собрать фразу без ошибок с первого раза',
    check: (c) => c.phraseFirstTry,
  },
  {
    id: 'streak-3',
    icon: '⚡',
    titleRu: 'Три дня',
    titleEs: 'Tres días',
    descRu: 'Заниматься 3 дня подряд',
    check: (c) => c.streak >= 3,
  },
  {
    id: 'streak-7',
    icon: '🗓️',
    titleRu: 'Неделя силы',
    titleEs: 'Semana de fuerza',
    descRu: 'Заниматься 7 дней подряд',
    check: (c) => c.streak >= 7,
  },
  {
    id: 'streak-30',
    icon: '🏆',
    titleRu: 'Месяц привычки',
    titleEs: 'Mes de hábito',
    descRu: 'Заниматься 30 дней подряд',
    check: (c) => c.streak >= 30,
  },
  {
    id: 'answers-50',
    icon: '🎯',
    titleRu: '50 ответов',
    titleEs: 'Cincuenta respuestas',
    descRu: 'Дать 50 верных ответов',
    check: (c) => c.answersCorrect >= 50,
  },
  {
    id: 'answers-200',
    icon: '🎖️',
    titleRu: '200 ответов',
    titleEs: 'Doscientas respuestas',
    descRu: 'Дать 200 верных ответов',
    check: (c) => c.answersCorrect >= 200,
  },
  {
    id: 'first-lesson',
    icon: '🚀',
    titleRu: 'Старт',
    titleEs: 'Despegue',
    descRu: 'Завершить первый урок',
    check: (c) => c.lessonsDone >= 1,
  },
  {
    id: 'lessons-10',
    icon: '🧭',
    titleRu: 'Десять уроков',
    titleEs: 'Diez lecciones',
    descRu: 'Завершить 10 уроков',
    check: (c) => c.lessonsDone >= 10,
  },
  {
    id: 'all-pronouns',
    icon: '👤',
    titleRu: 'Все местоимения',
    titleEs: 'Todos los pronombres',
    descRu: 'Выучить все местоимения',
    check: (c) => ALL_WORDS.filter((w) => w.pos === 'pronoun').every((w) => c.known.has(w.id)),
  },
  {
    id: 'all-prepositions',
    icon: '🧭',
    titleRu: 'Мастер предлогов',
    titleEs: 'Maestro de preposiciones',
    descRu: 'Выучить все предлоги — откроются тысячи фраз',
    check: (c) => ALL_WORDS.filter((w) => w.pos === 'preposition').every((w) => c.known.has(w.id)),
  },
  {
    id: 'verbs-25',
    icon: '🏃',
    titleRu: '25 глаголов',
    titleEs: 'Veinticinco verbos',
    descRu: 'Выучить 25 глаголов',
    check: (c) => ALL_WORDS.filter((w) => w.pos === 'verb' && c.known.has(w.id)).length >= 25,
  },
]

/**
 * Вычислить контекст достижений из прогресса.
 */
export function achievementContext(progress: Progress): AchievementContext {
  const known = knownSet(progress)
  const lessons = progressByLessons(progress)
  // Речевые счётчики: сколько фраз собрано и есть ли «без ошибок с первого раза»
  let phrasesPracticed = 0
  let phraseFirstTry = false
  for (const pp of Object.values(progress.phrases)) {
    phrasesPracticed += pp.practiced
    if (pp.practiced === 1 && pp.correct === 1) phraseFirstTry = true
  }
  return {
    known,
    wordsKnown: known.size,
    phrasesKnown: phraseStats(progress).known,
    answersCorrect: progress.answers.correct,
    streak: currentStreak(progress),
    lessonsDone: lessons.filter((l) => l.ratio >= 1).length,
    phrasesPracticed,
    phraseFirstTry,
  }
}

/**
 * Применить достижения: возвращает список НАЧАЛЬНЫХ достижений
 * (для уведомлений) и обновляет progress.achievements.
 */
export function evaluateAchievements(progress: Progress, now: number = Date.now()): Achievement[] {
  const ctx = achievementContext(progress)
  const newly: Achievement[] = []
  for (const a of ACHIEVEMENTS) {
    if (!progress.achievements[a.id] && a.check(ctx)) {
      progress.achievements[a.id] = now
      newly.push(a)
    }
  }
  return newly
}
