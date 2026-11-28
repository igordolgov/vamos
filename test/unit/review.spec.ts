// ============================================================
// test/unit/review.spec.ts — «Повторение»: интервальное
// повторение (флешки-SRS), слабые слова и практика по пулу.
// ============================================================

import { describe, expect, it } from 'vitest'
import { emptyProgress, type Progress, type SrsCard } from '../../shared/types'
import { mergeProgress } from '../../app/composables/useProgress'
import {
  srsIntervalDays,
  srsNext,
  srsReviewWord,
  srsQueue,
  srsDueCount,
  SRS_MAX_BOX,
  SRS_SESSION_LIMIT,
} from '../../shared/srs'
import { weakWords } from '../../shared/stats'
import { makeExercise } from '../../shared/practice'
import { getWord, wordsByLesson } from '../../shared/data/words'

const DAY = 86_400_000
const NOW = 1_700_000_000_000

/** Прогресс с выученными словами (порог «выучено» набран) */
function withKnown(ids: string[]): Progress {
  const p = emptyProgress()
  for (const id of ids) p.words[id] = { correct: 2, wrong: 0 }
  return p
}

describe('SRS — расписание Лейтнера', () => {
  it('верные ответы поднимают карточку: 1 → 2 → 4 → 8 → 16 дней', () => {
    let card: SrsCard = { box: 0, due: NOW }
    const days = [1, 2, 4, 8, 16]
    for (let i = 0; i < 5; i++) {
      card = srsNext(card, true, NOW)
      expect(card.box).toBe(i + 1)
      expect(card.due - NOW).toBe(days[i]! * DAY)
    }
    expect(srsIntervalDays(card.box)).toBe(16)
  })

  it('на максимальном уровне карточка остаётся и возвращается через 32 дня', () => {
    const card = srsNext({ box: SRS_MAX_BOX, due: NOW }, true, NOW)
    expect(card.box).toBe(SRS_MAX_BOX)
    expect(card.due - NOW).toBe(32 * DAY)
  })

  it('ошибка сбрасывает карточку на уровень 0 — повтор сегодня', () => {
    const card = srsNext({ box: 4, due: NOW + 8 * DAY }, false, NOW)
    expect(card).toEqual({ box: 0, due: NOW })
  })

  it('srsReviewWord: новая карточка слова после «Знаю» — уровень 1, после «Не помню» — 0', () => {
    const ok = srsReviewWord({}, 'v-ser', true, NOW)
    expect(ok['v-ser']).toEqual({ box: 1, due: NOW + DAY })
    const fail = srsReviewWord({}, 'v-ser', false, NOW)
    expect(fail['v-ser']).toEqual({ box: 0, due: NOW })
    // существующая карточка поднимается с текущего уровня
    const up = srsReviewWord({ 'v-ser': { box: 2, due: NOW } }, 'v-ser', true, NOW)
    expect(up['v-ser']!.box).toBe(3)
    expect(up['v-ser']!.due - NOW).toBe(4 * DAY)
  })
})

describe('SRS — очередь сессии', () => {
  it('новые карточки — выученные слова без карточки, по порядку уроков', () => {
    const p = withKnown(['v-hablar', 'v-ser', 'v-estar']) // уроки 4, 1, 1
    const queue = srsQueue(p, NOW)
    expect(queue.map((w) => w.id)).toEqual(['v-estar', 'v-ser', 'v-hablar'])
    expect(srsDueCount(p, NOW)).toBe(3)
  })

  it('просроченные карточки идут раньше новых, по сроку; не просроченные — не попадают', () => {
    const p = withKnown(['v-ser', 'v-hablar', 'v-estar'])
    p.srs = {
      'v-ser': { box: 1, due: NOW - 2 * DAY },
      'v-hablar': { box: 2, due: NOW - DAY },
      'v-estar': { box: 3, due: NOW + 2 * DAY }, // ещё не пора
    }
    const queue = srsQueue(p, NOW)
    expect(queue.map((w) => w.id)).toEqual(['v-ser', 'v-hablar'])
    expect(srsDueCount(p, NOW)).toBe(2)
  })

  it('невыученные слова в очередь не попадают', () => {
    const p = emptyProgress()
    p.words['v-ser'] = { correct: 1, wrong: 0 } // в процессе — не выучено
    expect(srsQueue(p, NOW)).toEqual([])
    expect(srsDueCount(p, NOW)).toBe(0)
  })

  it('лимит сессии обрезает очередь (удалённые из словаря слова не роняют её)', () => {
    const ids = [...wordsByLesson(1), ...wordsByLesson(2), ...wordsByLesson(3)].map((w) => w.id)
    const p = withKnown(ids)
    p.words['ghost-word'] = { correct: 2, wrong: 0 } // удалённое слово
    const queue = srsQueue(p, NOW)
    expect(queue.length).toBe(SRS_SESSION_LIMIT)
    expect(queue.every((w) => ids.includes(w.id))).toBe(true)
  })
})

describe('Слабые слова', () => {
  it('только слова с ошибками: больше ошибок выше, при равных — меньше верных выше', () => {
    const p = emptyProgress()
    p.words['v-ser'] = { correct: 1, wrong: 3 }
    p.words['v-hablar'] = { correct: 0, wrong: 3 }
    p.words['n-casa'] = { correct: 5, wrong: 1 }
    p.words['v-estar'] = { correct: 4, wrong: 0 } // без ошибок — не слабое
    p.words['ghost-word'] = { correct: 0, wrong: 9 } // удалённое из словаря — пропускается
    const weak = weakWords(p)
    expect(weak.map((w) => w.word.id)).toEqual(['v-hablar', 'v-ser', 'n-casa'])
    expect(weak[0]).toMatchObject({ correct: 0, wrong: 3 })
    expect(weakWords(p, 2)).toHaveLength(2)
  })

  it('у пользователя без ошибок список пуст', () => {
    const p = withKnown(['v-ser'])
    expect(weakWords(p)).toEqual([])
  })
})

describe('Практика по пулу (слабые слова)', () => {
  it('makeExercise с opts.pool спрашивает только слова пула', () => {
    const p = emptyProgress()
    p.words['v-ser'] = { correct: 5, wrong: 3 }
    p.words['n-casa'] = { correct: 1, wrong: 4 }
    for (let i = 0; i < 40; i++) {
      const ex = makeExercise('choice', p, Math.random, {
        pool: [getWord('v-ser'), getWord('n-casa')],
      })
      expect(ex).not.toBeNull()
      expect(['v-ser', 'n-casa']).toContain(ex!.wordIds[0])
    }
  })

  it('пустой пул — откат на общую практику (без падений)', () => {
    const p = emptyProgress()
    p.words['v-ser'] = { correct: 2, wrong: 1 }
    const ex = makeExercise('choice', p, Math.random, { pool: [] })
    expect(ex).not.toBeNull()
    expect(ex!.wordIds[0]).toBe('v-ser')
  })
})

describe('mergeProgress — карточки «Повторения» при синке', () => {
  it('уровень карточки — максимум; при равных уровнях — более ранний срок', () => {
    const local = withKnown(['v-ser'])
    local.srs = { 'v-ser': { box: 3, due: NOW + 8 * DAY } }
    const remote = withKnown(['v-ser'])
    remote.srs = { 'v-ser': { box: 1, due: NOW + DAY } }
    const m = mergeProgress(local, remote)
    expect(m.srs?.['v-ser']).toEqual({ box: 3, due: NOW + 8 * DAY })

    const local2 = withKnown(['v-hablar'])
    local2.srs = { 'v-hablar': { box: 2, due: NOW + 500 } }
    const remote2 = withKnown(['v-hablar'])
    remote2.srs = { 'v-hablar': { box: 2, due: NOW + 300 } }
    expect(mergeProgress(local2, remote2).srs?.['v-hablar']!.due).toBe(NOW + 300)
  })

  it('карточки с разных устройств объединяются', () => {
    const local = withKnown(['v-ser'])
    local.srs = { 'v-ser': { box: 1, due: NOW } }
    const remote = withKnown(['v-hablar'])
    remote.srs = { 'v-hablar': { box: 4, due: NOW } }
    const m = mergeProgress(local, remote)
    expect(m.srs?.['v-ser']).toEqual({ box: 1, due: NOW })
    expect(m.srs?.['v-hablar']).toEqual({ box: 4, due: NOW })
  })

  it('без карточек ключ srs не появляется (идемпотентность слияния)', () => {
    const local = withKnown(['v-ser'])
    const remote = withKnown(['v-ser'])
    const m = mergeProgress(local, remote)
    expect(m.srs).toBeUndefined()
    expect(m).toEqual(mergeProgress(m, remote))
  })
})
