// ============================================================
// test/unit/make-exercise.spec.ts — makeExercise на богатом
// прогрессе (изолированный файл: движок чувствителен к порядку
// инициализации модулей в одном spec-файле).
// ============================================================

import { describe, it, expect } from 'vitest'
import { emptyProgress } from '../../shared/types'
import { ALL_WORDS } from '../../shared/data/words'
import { makeExercise } from '../../shared/practice'

/** Прогресс со словами первых 13 уроков (correct = 2 — «выучено») */
function richProgress() {
  const p = emptyProgress()
  for (const w of ALL_WORDS.filter((w) => w.lesson <= 13)) {
    p.words[w.id] = { correct: 2, wrong: 0 }
  }
  return p
}

describe('makeExercise', () => {
  it('choice — 4 варианта и верный ответ', () => {
    const ex = makeExercise('choice', richProgress())
    expect(ex).not.toBeNull()
    expect(ex!.kind).toBe('choice')
    expect(ex!.options.length).toBe(4)
    expect(ex!.options[ex!.answerIndex]).toBeTruthy()
  })

  it('build — плитки соответствуют правильному ответу', () => {
    let ex = makeExercise('build', richProgress())
    for (let i = 0; i < 20 && !ex; i++) ex = makeExercise('build', richProgress())
    expect(ex).not.toBeNull()
    expect(ex!.kind).toBe('build')
    expect([...ex!.tiles!].sort()).toEqual([...ex!.answerTiles!].sort())
    expect(ex!.hint.length).toBeGreaterThan(0)
  })

  it('audio — озвучка и варианты переводов', () => {
    const ex = makeExercise('audio', richProgress())
    expect(ex).not.toBeNull()
    expect(ex!.kind).toBe('audio')
    expect(ex!.speak).toBeTruthy()
    expect(ex!.options.length).toBe(4)
  })

  it('гость без прогресса получает хотя бы choice', () => {
    const ex = makeExercise('choice', emptyProgress())
    expect(ex).not.toBeNull()
  })
})
