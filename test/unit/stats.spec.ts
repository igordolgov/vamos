// ============================================================
// test/unit/stats.spec.ts — статистика, серия дней, достижения.
// ============================================================

import { describe, it, expect } from 'vitest'
import { emptyProgress, isWordKnown, KNOWN_THRESHOLD, type Progress } from '../../shared/types'
import { knownSet, knownWordsCount, progressByPos, progressByLessons, phraseStats, overallProgress, unlockKeys } from '../../shared/stats'
import { touchStreak, currentStreak, bestStreak, todayIso } from '../../shared/streak'
import { evaluateAchievements, achievementContext, ACHIEVEMENTS } from '../../shared/achievements'
import { ALL_WORDS } from '../../shared/data/words'

/** Прогресс с выученными словами */
function withWords(ids: string[]): Progress {
  const p = emptyProgress()
  for (const id of ids) {
    p.words[id] = { correct: KNOWN_THRESHOLD, wrong: 0, knownAt: 1 }
  }
  return p
}

describe('Статистика', () => {
  it('knownSet и knownWordsCount', () => {
    const p = withWords(['v-ser', 'v-estar', 'p-yo'])
    expect(knownWordsCount(p)).toBe(3)
    expect(knownSet(p).has('v-ser')).toBe(true)
    expect(knownSet(p).has('v-tener')).toBe(false)
  })

  it('«Уже выучил» идёт в knownSet: процент урока учитывает отметку', () => {
    // слово с 1 верным ответом, отмеченное «Уже выучил», — выучено
    const p = emptyProgress()
    p.words['v-ser'] = { correct: 1, wrong: 0, star: 1000 }
    expect(knownSet(p).has('v-ser')).toBe(true)
    expect(knownWordsCount(p)).toBe(1)
    const byLessons = progressByLessons(p)
    expect(byLessons[0]!.known).toBe(1)
  })

  it('isWordKnown: порог 2 верных ответа', () => {
    expect(KNOWN_THRESHOLD).toBe(2)
    expect(isWordKnown(undefined)).toBe(false)
    expect(isWordKnown({ correct: 1, wrong: 0 })).toBe(false)
    expect(isWordKnown({ correct: 2, wrong: 0 })).toBe(true)
    // неверные ответы не сбрасывают изученное
    expect(isWordKnown({ correct: 2, wrong: 5 })).toBe(true)
  })

  it('прогресс по частям речи и урокам', () => {
    const p = withWords(['v-ser', 'p-yo'])
    const byPos = progressByPos(p)
    const verbs = byPos.find((x) => x.pos === 'verb')!
    expect(verbs.known).toBe(1)
    expect(verbs.total).toBeGreaterThan(40)
    const byLessons = progressByLessons(p)
    expect(byLessons.length).toBe(32)
    expect(byLessons[0].total).toBe(12) // местоимения + ser/estar/no
  })

  it('phraseStats кешируется', () => {
    const p = withWords(['v-ser', 'p-yo'])
    const a = phraseStats(p)
    const b = phraseStats(p)
    expect(a).toEqual(b)
    expect(a.total).toBeGreaterThan(1_000_000)
  })

  it('overallProgress в диапазоне 0..1', () => {
    expect(overallProgress(emptyProgress())).toBe(0)
    expect(overallProgress(withWords(['v-ser']))).toBeGreaterThan(0)
    expect(overallProgress(withWords(['v-ser']))).toBeLessThan(1)
  })

  it('unlockKeys: с нуля первый ключ — ser (урок 3), он же самый богатый из односложных', () => {
    const keys = unlockKeys(emptyProgress(), 6)
    expect(keys.length).toBeGreaterThan(0)
    expect(keys[0]!.words.map((w) => w.id)).toEqual(['v-ser'])
    expect(keys[0]!.templates).toBe(4)
    expect(keys[0]!.potential).toBeGreaterThan(20_000)
    // достижимые ключи (одно слово) идут раньше многосложных
    const lengths = keys.map((k) => k.words.length)
    expect([...lengths].sort((a, b) => a - b)).toEqual(lengths)
  })

  it('unlockKeys: ключи состоят только из невыученных слов и дают положительный потенциал', () => {
    const demo = withWords(['p-yo', 'p-tu', 'p-el', 'p-ella', 'p-nosotros', 'p-ustedes',
      'v-hablar', 'v-ver', 'v-querer', 'v-estudiar', 'n-casa', 'n-escuela', 'n-libro', 'a-bueno', 'a-nuevo'])
    for (const k of unlockKeys(demo, 10)) {
      expect(k.templates).toBeGreaterThan(0)
      expect(k.potential).toBeGreaterThan(0)
      for (const w of k.words) {
        expect(isWordKnown(demo.words[w.id])).toBe(false)
        expect(w.lesson).toBeGreaterThan(0)
      }
    }
  })

  it('unlockKeys: весь словарь выучен — ключей нет', () => {
    const p = withWords(ALL_WORDS.map((w) => w.id))
    expect(unlockKeys(p)).toEqual([])
  })
})

describe('Серия дней', () => {
  it('todayIso даёт формат ISO', () => {
    expect(todayIso(new Date(2026, 10, 23))).toBe('2026-11-23')
  })

  it('touchStreak не дублирует день', () => {
    const p = emptyProgress()
    const now = new Date(2026, 10, 23, 10, 0)
    const d1 = touchStreak(p, now)
    expect(d1).toEqual(['2026-11-23'])
    const d2 = touchStreak({ ...p, streakDates: d1 }, now)
    expect(d2).toEqual(['2026-11-23'])
  })

  it('currentStreak: сегодня → 1, вчера + сегодня → 2, разрыв → 0', () => {
    const now = new Date(2026, 10, 23, 10, 0)
    expect(currentStreak({ ...emptyProgress(), streakDates: ['2026-11-23'] }, now)).toBe(1)
    expect(currentStreak({ ...emptyProgress(), streakDates: ['2026-11-22', '2026-11-23'] }, now)).toBe(2)
    // занимался только вчера — серия ещё жива
    expect(currentStreak({ ...emptyProgress(), streakDates: ['2026-11-22'] }, now)).toBe(1)
    // позавчера — серия прервана
    expect(currentStreak({ ...emptyProgress(), streakDates: ['2026-11-21'] }, now)).toBe(0)
    // пять дней подряд
    expect(currentStreak({
      ...emptyProgress(),
      streakDates: ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'],
    }, now)).toBe(5)
  })

  it('bestStreak больше либо равен текущей', () => {
    const now = new Date(2026, 10, 23, 10, 0)
    const p = { ...emptyProgress(), streakDates: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-11-23'] }
    expect(bestStreak(p)).toBe(3)
    expect(bestStreak(p)).toBeGreaterThanOrEqual(currentStreak(p, now))
  })
})

describe('Достижения', () => {
  it('пороговые достижения открываются по числу слов', () => {
    const p1 = withWords(['v-ser'])
    const fresh1 = emptyProgress()
    fresh1.words = p1.words
    const new1 = evaluateAchievements(fresh1)
    expect(new1.some((a) => a.id === 'first-word')).toBe(true)
    expect(new1.some((a) => a.id === 'words-10')).toBe(false)

    const ids = ALL_WORDS.slice(0, 10).map((w) => w.id)
    const fresh10 = emptyProgress()
    for (const id of ids) fresh10.words[id] = { correct: 2, wrong: 0 }
    const new10 = evaluateAchievements(fresh10)
    expect(new10.some((a) => a.id === 'words-10')).toBe(true)
  })

  it('достижение по фразам открывается при большом словаре', () => {
    const p = withWords(ALL_WORDS.map((w) => w.id))
    const fresh = emptyProgress()
    fresh.words = p.words
    const news = evaluateAchievements(fresh)
    expect(news.some((a) => a.id === 'phrases-100000')).toBe(true)
    // повторный вызов не даёт новых достижений
    const again = evaluateAchievements(fresh)
    expect(again.length).toBe(0)
  })

  it('достижение по серии дней', () => {
    // Даты относительно «сегодня»: серия считается от текущей даты
    // (захардкоженные даты ломаются с течением времени)
    const isoDaysAgo = (n: number): string => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return todayIso(d)
    }
    const p = { ...emptyProgress(), streakDates: [isoDaysAgo(2), isoDaysAgo(1), isoDaysAgo(0)] }
    const ctx = achievementContext({ ...p })
    // 3 дня подряд, заканчивающиеся сегодня
    expect(ctx.streak).toBe(3)
    const achieved = ACHIEVEMENTS.find((a) => a.id === 'streak-3')!
    expect(achieved.check(ctx)).toBe(true)
  })

  it('все достижения имеют уникальные id и описания', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of ACHIEVEMENTS) {
      expect(a.icon).toBeTruthy()
      expect(a.titleRu).toBeTruthy()
      expect(a.descRu).toBeTruthy()
    }
  })
})
