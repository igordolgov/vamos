// ============================================================
// test/unit/staged-build.spec.ts — поэтапный режим «Слова по шагам»:
// buildStages (наборы кандидатов по шагам) и threading через
// buildExercise/makeExercise (опция staged).
//
// Эталон — пример пользователя: «¿Cómo te llamas?» — сначала
// вопросительные (cómo среди qué/cuál), затем местоимения
// (te среди me/tu/se), затем формы глагола (llamas среди
// llamo/llama/llamar).
// ============================================================

import { describe, it, expect } from 'vitest'
import { emptyProgress } from '../../shared/types'
import { ALL_WORDS, getWord } from '../../shared/data/words'
import type { Fill } from '../../shared/phrases/schema'
import { buildStages, buildExercise, makeExercise } from '../../shared/practice'

const KNOWN = new Set(ALL_WORDS.map((w) => w.id))

/** Детерминированный генератор (LCG) — для проверки повторяемости */
function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

/** Прогресс со словами первых 13 уроков (correct = 2 — «выучено») */
function richProgress() {
  const p = emptyProgress()
  for (const w of ALL_WORDS.filter((w) => w.lesson <= 13)) {
    p.words[w.id] = { correct: 2, wrong: 0 }
  }
  return p
}

/** Базовые проверки любого шага: верное слово внутри, без дубликатов,
 *  без пунктуации, в нижнем регистре, размер 2..5 плиток */
function expectValidStage(stage: string[], target: string) {
  expect(stage.length, JSON.stringify(stage)).toBeGreaterThanOrEqual(2)
  expect(stage.length, JSON.stringify(stage)).toBeLessThanOrEqual(5)
  expect(new Set(stage).size, JSON.stringify(stage)).toBe(stage.length)
  expect(stage).toContain(target)
  for (const tile of stage) {
    expect(tile).toBe(tile.toLowerCase())
    expect(tile).not.toMatch(/[¿?¡!.]/)
    expect(/\s/.test(tile), tile).toBe(false)
  }
}

describe('buildStages — «¿Cómo te llamas?» (пример пользователя)', () => {
  const fill: Fill = { qw: getWord('qw-como'), io: getWord('p-te'), v: getWord('v-llamar') }
  const answer = ['Cómo', 'te', 'llamas']

  it('шаг 1: cómo среди других вопросительных', () => {
    const stages = buildStages(answer, fill, 32, Math.random, KNOWN)
    expect(stages.length).toBe(3)
    expectValidStage(stages[0]!, 'cómo')
    const qwEs = ALL_WORDS.filter((w) => w.pos === 'question').map((w) => w.es.toLowerCase())
    const others = stages[0]!.filter((w) => w !== 'cómo')
    expect(others.some((w) => qwEs.includes(w)), stages[0]!.join(', ')).toBe(true)
  })

  it('шаг 2: te среди местоимений и определителей', () => {
    const stages = buildStages(answer, fill, 32, Math.random, KNOWN)
    expectValidStage(stages[1]!, 'te')
    const fnEs = new Set(
      ALL_WORDS.filter((w) => w.pos === 'pronoun' || w.pos === 'determiner').map((w) => w.es.toLowerCase()),
    )
    // Отвлекающие шага — местоимения/определители (пул объединён), а не
    // случайные существительные
    const distractors = stages[1]!.filter((w) => w !== 'te')
    expect(distractors.length).toBeGreaterThanOrEqual(2)
    expect(distractors.every((w) => fnEs.has(w)), stages[1]!.join(', ')).toBe(true)
    // уже использованное «cómo» в хвосте фразы больше не предлагается
    expect(stages[1]).not.toContain('cómo')
  })

  it('шаг 3: llamas среди форм того же глагола llamar', () => {
    const stages = buildStages(answer, fill, 32, Math.random, KNOWN)
    expectValidStage(stages[2]!, 'llamas')
    const siblingForms = ['llamo', 'llama', 'llamamos', 'llaman', 'llamar']
    const siblings = stages[2]!.filter((w) => siblingForms.includes(w))
    expect(siblings.length, stages[2]!.join(', ')).toBeGreaterThanOrEqual(2)
    // использованные «cómo»/«te» дальше не нужны — не предлагаются
    expect(stages[2]).not.toContain('cómo')
    expect(stages[2]).not.toContain('te')
  })

  it('одинаковый seed — одинаковые наборы (возврат на шаг даёт тот же пул)', () => {
    const s1 = buildStages(answer, fill, 32, seededRand(42), KNOWN)
    const s2 = buildStages(answer, fill, 32, seededRand(42), KNOWN)
    expect(s1).toEqual(s2)
  })
})

describe('buildExercise с staged', () => {
  it('stages по числу слов ответа; служебная плитка получает формы ser', () => {
    // «Tú eres alto»: плитка eres — форма ser из шаблона (не из заполнения):
    // источник находится по индексу форм всего словаря
    const fill: Fill = { s: getWord('p-tu'), adj: getWord('a-alto') }
    const ex = buildExercise(fill, 't-pron-ser-adj', 'aff', Math.random, 32, KNOWN, true)
    expect(ex.answerTiles!.join(' ').toLowerCase()).toBe('tú eres alto')
    expect(ex.stages).toBeDefined()
    expect(ex.stages!.length).toBe(3)
    expectValidStage(ex.stages![0]!, 'tú')
    expectValidStage(ex.stages![1]!, 'eres')
    expectValidStage(ex.stages![2]!, 'alto')
    // eres: отвлекающие — формы того же глагола ser
    const serForms = ['soy', 'es', 'somos', 'son', 'ser']
    expect(ex.stages![1]!.some((w) => serForms.includes(w)), ex.stages![1]!.join(', ')).toBe(true)
    // прилагательное: формы рода/числа того же слова
    const altoForms = ['alta', 'altos', 'altas']
    expect(ex.stages![2]!.some((w) => altoForms.includes(w)), ex.stages![2]!.join(', ')).toBe(true)
    // «tú» уже собран и дальше не нужен — в шагах 2 и 3 его нет
    expect(ex.stages![1]).not.toContain('tú')
    expect(ex.stages![2]).not.toContain('tú')
  })

  it('без staged поле stages не появляется (обратная совместимость)', () => {
    const fill: Fill = { s: getWord('p-tu'), adj: getWord('a-alto') }
    const ex = buildExercise(fill, 't-pron-ser-adj', 'aff')
    expect(ex.stages).toBeUndefined()
  })
})

describe('makeExercise протаскивает staged', () => {
  it('staged: stages есть и согласованы с ответом', () => {
    const p = richProgress()
    let ex = makeExercise('build', p, Math.random, { staged: true })
    for (let i = 0; i < 20 && !ex; i++) ex = makeExercise('build', p, Math.random, { staged: true })
    expect(ex).not.toBeNull()
    expect(ex!.stages).toBeDefined()
    expect(ex!.stages!.length).toBe(ex!.answerTiles!.length)
    for (let k = 0; k < ex!.stages!.length; k++) {
      expectValidStage(ex!.stages![k]!, ex!.answerTiles![k]!.toLowerCase())
    }
  })

  it('без staged: stages нет', () => {
    const p = richProgress()
    let ex = makeExercise('build', p)
    for (let i = 0; i < 20 && !ex; i++) ex = makeExercise('build', p)
    expect(ex).not.toBeNull()
    expect(ex!.stages).toBeUndefined()
  })
})
