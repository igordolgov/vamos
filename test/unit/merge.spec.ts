// ============================================================
// test/unit/merge.spec.ts — монотонное слияние прогресса.
// Гарантия: после синка между устройствами знание слова
// не может «откатиться» (никакого «разучивания»).
// ============================================================
import { describe, expect, it } from 'vitest'
import { mergeProgress } from '../../app/composables/useProgress'
import { emptyProgress, type Progress } from '../../shared/types'

/** Хелпер: прогресс с одной записью слова */
function withWord(id: string, correct: number, wrong: number, knownAt?: number): Progress {
  const p = emptyProgress()
  p.words[id] = { correct, wrong, ...(knownAt !== undefined ? { knownAt } : {}) }
  return p
}

describe('mergeProgress — монотонность знаний', () => {
  it('слово, выученное локально, не разучивается при синке с «сырыми» попытками сервера', () => {
    // Локально: 2 верных подряд (выучено). Сервер: много попыток с ошибками.
    const local = withWord('v-hablar', 2, 0, 1000)
    const remote = withWord('v-hablar', 1, 9, undefined)
    const merged = mergeProgress(local, remote)
    expect(merged.words['v-hablar']!.correct).toBe(2) // знание сохранено
    expect(merged.words['v-hablar']!.wrong).toBe(9) // попытки не потеряны
  })

  it('верные ответы берутся по максимуму с обеих сторон', () => {
    const local = withWord('p-yo', 1, 0)
    const remote = withWord('p-yo', 2, 1, 500)
    const merged = mergeProgress(local, remote)
    expect(merged.words['p-yo']!.correct).toBe(2)
    expect(merged.words['p-yo']!.wrong).toBe(1)
    expect(merged.words['p-yo']!.knownAt).toBe(500)
  })

  it('knownAt — самое раннее время «выучено»', () => {
    const local = withWord('n-casa', 2, 0, 3000)
    const remote = withWord('n-casa', 2, 0, 1000)
    const merged = mergeProgress(local, remote)
    expect(merged.words['n-casa']!.knownAt).toBe(1000)
  })

  it('известные только на одном устройстве слова объединяются', () => {
    const local = withWord('p-yo', 2, 0)
    const remote = withWord('p-tu', 2, 0)
    const merged = mergeProgress(local, remote)
    expect(merged.words['p-yo']!.correct).toBe(2)
    expect(merged.words['p-tu']!.correct).toBe(2)
  })

  it('слияние идемпотентно: merge(x, merge(x, y)) == merge(x, y)', () => {
    const local = withWord('v-ver', 2, 0, 700)
    const remote = withWord('v-ver', 1, 4)
    const remote2 = withWord('n-libro', 3, 2, 200)
    const once = mergeProgress(local, remote)
    // второй прогон с теми же данными ничего не меняет
    const twice = mergeProgress(once, remote)
    expect(twice).toEqual(once)
    // и добавление второго слова не портит первое
    const both = mergeProgress(local, remote2)
    expect(both.words['v-ver']!.correct).toBe(2)
    expect(both.words['n-libro']!.correct).toBe(3)
  })

  it('дни серии объединяются без дублей и сортируются', () => {
    const local = emptyProgress()
    local.streakDates = ['2026-11-23', '2026-11-24']
    const remote = emptyProgress()
    remote.streakDates = ['2026-11-22', '2026-11-24']
    const merged = mergeProgress(local, remote)
    expect(merged.streakDates).toEqual(['2026-11-22', '2026-11-23', '2026-11-24'])
  })

  it('счётчики ответов — максимум, без двойного учёта', () => {
    const local = emptyProgress()
    local.answers = { correct: 30, wrong: 2 }
    const remote = emptyProgress()
    remote.answers = { correct: 12, wrong: 0 }
    const merged = mergeProgress(local, remote)
    expect(merged.answers).toEqual({ correct: 30, wrong: 2 })
  })
})
