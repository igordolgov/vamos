// ============================================================
// shared/streak.ts — серия дней занятий (streak).
//
// Дни активности хранятся в прогрессе строками ISO («2026-11-23»).
// Серия = количество дней подряд, заканчивающееся сегодня или вчера.
// ============================================================

import type { Progress } from './types'

/** Сегодняшняя дата в формате ISO (локальная, без времени) */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Дата N дней назад */
function daysAgoIso(n: number, now: Date = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return todayIso(d)
}

/**
 * Отметить активность сегодня (вызывается после любого верного ответа).
 * Возвращает обновлённый массив дат (без дублей, последние 400 дней).
 */
export function touchStreak(progress: Progress, now: Date = new Date()): string[] {
  const today = todayIso(now)
  const dates = new Set(progress.streakDates)
  dates.add(today)
  // Храним только последние 400 дней — данные компактные
  const sorted = [...dates].sort().slice(-400)
  return sorted
}

/** Текущая серия дней (заканчивается сегодня или вчера) */
export function currentStreak(progress: Progress, now: Date = new Date()): number {
  const dates = new Set(progress.streakDates)
  // Если сегодняшнего дня нет и вчерашнего нет — серия прервана
  if (!dates.has(todayIso(now)) && !dates.has(daysAgoIso(1, now))) return 0
  let streak = 0
  // Начинаем с сегодня (или вчера, если сегодня ещё не занимался)
  let offset = dates.has(todayIso(now)) ? 0 : 1
  while (dates.has(daysAgoIso(offset, now))) {
    streak++
    offset++
  }
  return streak
}

/** Лучшая серия за всё время */
export function bestStreak(progress: Progress): number {
  const sorted = [...new Set(progress.streakDates)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev) {
      // Если предыдущий день — вчерашний относительно текущего, серия продолжается
      const prevDate = new Date(prev + 'T12:00:00')
      prevDate.setDate(prevDate.getDate() + 1)
      if (todayIso(prevDate) === d) run++
      else run = 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    prev = d
  }
  return Math.max(best, currentStreak(progress))
}
