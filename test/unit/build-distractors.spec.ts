// ============================================================
// test/unit/build-distractors.spec.ts — пул плиток «Сборки фразы».
// Просьба пользователя: «добавь больше слов для подстановки, главное
// чтобы они не выходили за пределы двух строк».
// ============================================================

import { describe, it, expect } from 'vitest'
import { buildDistractors, tileWidthPx } from '../../shared/practice'
import { ALL_WORDS } from '../../shared/data/words'

const KNOWN_ALL = new Set(ALL_WORDS.map((w) => w.id))
const MAX_LESSON = Math.max(...ALL_WORDS.map((w) => w.lesson))

/** Оценка ширины двух строк пула: ответ + дистракторы */
function estimatedWidth(answerTiles: string[], distractors: string[]): number {
  return [...answerTiles, ...distractors].reduce((s, w) => s + tileWidthPx(w), 0)
}

const TWO_ROW_BUDGET = 2 * 344

describe('buildDistractors — больше слов, пул в двух строках', () => {
  it('дистракторов больше прежних 2–3 (3–5 для короткой фразы)', () => {
    const answer = ['yo', 'quiero', 'hablar']
    const d = buildDistractors(answer, MAX_LESSON, Math.random, KNOWN_ALL)
    expect(d.length).toBeGreaterThanOrEqual(3)
    expect(d.length).toBeLessThanOrEqual(4)
  })

  it('пул (ответ + дистракторы) укладывается в бюджет двух строк', () => {
    // Прогоняем много случайных сборок: оценка ширины не выходит
    // за две строки мобильного экрана
    const answers = [
      ['yo', 'quiero', 'hablar'],
      ['ella', 'está', 'buscando', 'las', 'llaves'],
      ['tengo', 'una', 'cama', 'nueva'],
      ['hay', 'que', 'trabajar'],
      ['ustedes', 'son', 'mis', 'amigos'],
    ]
    for (const answer of answers) {
      for (let i = 0; i < 20; i++) {
        const d = buildDistractors(answer, MAX_LESSON, Math.random, KNOWN_ALL)
        expect(d.length).toBeLessThanOrEqual(5)
        expect(estimatedWidth(answer, d), `${answer.join(' ')} + ${d.join(',')}`).toBeLessThanOrEqual(TWO_ROW_BUDGET)
      }
    }
  })

  it('минимум 2 дистрактора даже для длинной фразы', () => {
    const answer = ['ella', 'está', 'buscando', 'sus', 'llaves', 'perdidas']
    for (let i = 0; i < 10; i++) {
      const d = buildDistractors(answer, MAX_LESSON, Math.random, KNOWN_ALL)
      expect(d.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('дистракторы — отдельные слова без пунктуации, нет дубликатов ответа', () => {
    const answer = ['tengo', 'un', 'perro']
    for (let i = 0; i < 10; i++) {
      const d = buildDistractors(answer, MAX_LESSON, Math.random, KNOWN_ALL)
      for (const w of d) {
        expect(w).not.toMatch(/\s/)
        expect(w).not.toMatch(/[¿?¡!.]/)
        expect(answer.map((a) => a.toLowerCase())).not.toContain(w)
      }
      expect(new Set(d.map((x) => x.toLowerCase())).size).toBe(d.length)
    }
  })
})
