// ============================================================
// test/unit/make-exercise.spec.ts — makeExercise на богатом
// прогрессе (изолированный файл: движок чувствителен к порядку
// инициализации модулей в одном spec-файле).
// ============================================================

import { describe, it, expect } from 'vitest'
import { emptyProgress } from '../../shared/types'
import { ALL_WORDS, getWord } from '../../shared/data/words'
import { makeExercise, type Exercise } from '../../shared/practice'

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

  it('build — плитки содержат ответ и лишние слова', () => {
    let ex = makeExercise('build', richProgress())
    for (let i = 0; i < 20 && !ex; i++) ex = makeExercise('build', richProgress())
    expect(ex).not.toBeNull()
    expect(ex!.kind).toBe('build')
    const answer = ex!.answerTiles!
    for (const w of answer) expect(ex!.tiles).toContain(w.toLowerCase())
    expect(ex!.tiles!.length).toBeGreaterThan(answer.length)
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

  it('гость без прогресса получает и сборку фразы (раньше — «не работает»)', () => {
    // Баг: сборка брала слова только из выученных (knownSet), у новичка их
    // нет — makeExercise возвращал null и сессия мгновенно «завершалась».
    // Теперь пул практики разрешён как источник слов.
    let ex = makeExercise('build', emptyProgress())
    for (let i = 0; i < 20 && !ex; i++) ex = makeExercise('build', emptyProgress())
    expect(ex).not.toBeNull()
    expect(ex!.kind).toBe('build')
    expect(ex!.tiles!.length).toBeGreaterThan(0)
    expect(ex!.hint.length).toBeGreaterThan(0)
  })

  it('практика по уроку — слова только этого урока', () => {
    for (let i = 0; i < 10; i++) {
      const ex = makeExercise('choice', richProgress(), Math.random, { lesson: 2 })
      expect(ex).not.toBeNull()
      for (const id of ex!.wordIds) {
        expect(getWord(id).lesson).toBe(2)
      }
    }
  })

  it('практика по уроку: без изученных слов сборки нет', () => {
    // Во фразах — только изученные слова. В первых уроках местоимения и
    // артикли шаблоны не заполняют — сборка недоступна (practice.vue
    // откатывается на тест-выбор по словам урока).
    let ex: Exercise | null = makeExercise('build', emptyProgress(), Math.random, { lesson: 1 })
    for (let i = 0; i < 20 && !ex; i++) {
      ex = makeExercise('build', emptyProgress(), Math.random, { lesson: 1 })
    }
    expect(ex).toBeNull()
    // то же для урока 2 (артикли одни не собирают фраз)
    let ex2: Exercise | null = makeExercise('build', emptyProgress(), Math.random, { lesson: 2 })
    for (let i = 0; i < 20 && !ex2; i++) {
      ex2 = makeExercise('build', emptyProgress(), Math.random, { lesson: 2 })
    }
    expect(ex2).toBeNull()
  })

  it('практика по уроку: во фразах только изученные слова', () => {
    const p = emptyProgress()
    // Выучены все слова уроков <= 12
    for (const w of ALL_WORDS.filter((w) => w.lesson <= 12)) {
      p.words[w.id] = { correct: 2, wrong: 0 }
    }
    const known = new Set(Object.keys(p.words))
    for (let i = 0; i < 10; i++) {
      const ex = makeExercise('build', p, Math.random, { lesson: 1 })
      expect(ex).not.toBeNull()
      // каждое слово фразы — изученное, а не «материал до уровня»
      for (const id of ex!.wordIds) expect(known.has(id), id).toBe(true)
    }
  })

  it('вопросительные слова не появляются раньше, чем изучены', () => {
    // Выучены слова первых 2 уроков: вопросительные (урок 3) — нет.
    // Раньше «¿Cómo estás?» собирался без изученного «cómo».
    const p = emptyProgress()
    for (const w of ALL_WORDS.filter((w) => w.lesson <= 2)) {
      p.words[w.id] = { correct: 2, wrong: 0 }
    }
    const qwTokens = ['quién', 'quiénes', 'cómo', 'cuándo', 'cuánto', 'cuántos', 'cuánta', 'cuántas', 'dónde', 'qué', 'cuál', 'cuáles', 'por qué']
    for (let i = 0; i < 30; i++) {
      const ex = makeExercise('build', p)
      if (!ex) continue
      const s = (ex.answerTiles ?? []).join(' ').toLowerCase()
      const hit = qwTokens.find((t) => s.includes(t))
      expect(hit, `фраза «${s}» содержит неизученное «${hit}»`).toBeUndefined()
    }
    // В тесте-выборе вопросительные слова как НОВЫЕ слова следующего
    // урока допустимы (механика знакомства со словами) — проверяем
    // только сборку фраз: там неизученных qw быть не должно
  })

  it('помеченная «уже выучил» фраза не возвращается генератором, пока есть другие', () => {
    const p = richProgress()
    // Помечаем все фразы одного шаблона через конкретное предложение
    let seen: string[] = []
    for (let i = 0; i < 40; i++) {
      const ex = makeExercise('build', p)
      if (ex) seen.push((ex.answerTiles ?? []).join(' ').toLowerCase())
    }
    expect(seen.length).toBeGreaterThan(0)
    const target = seen[0]!
    p.starredPhrases = { [target]: 1000 }
    // 30 генераций: помеченная фраза может появиться только если
    // всё остальное тоже помечено — здесь этого нет
    for (let i = 0; i < 30; i++) {
      const ex = makeExercise('build', p)
      if (!ex) continue
      const s = (ex.answerTiles ?? []).join(' ').toLowerCase()
      expect(s, `${s} — помеченная фраза вернулась`).not.toBe(target)
    }
  })
})
