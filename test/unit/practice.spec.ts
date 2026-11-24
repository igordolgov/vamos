// ============================================================
// test/unit/practice.spec.ts — генератор упражнений и запись ответов.
// ============================================================

import { describe, it, expect } from 'vitest'
import { emptyProgress, KNOWN_THRESHOLD } from '../../shared/types'
import { practicePool, wordChoiceExercise, buildExercise, audioExercise, makeExercise, recordAnswer, shuffle, starExercise, phraseStarKey, type Exercise } from '../../shared/practice'
import { getWord, ALL_WORDS } from '../../shared/data/words'

/** Прогресс: слова с N верными ответами */
function withProgress(map: Record<string, number>) {
  const p = emptyProgress()
  for (const [id, correct] of Object.entries(map)) {
    p.words[id] = { correct, wrong: 0 }
  }
  return p
}

describe('Пул практики', () => {
  it('приоритет: «в процессе» раньше новых', () => {
    const p = withProgress({ 'v-ser': 1 })
    const pool = practicePool(p)
    const inProgressIdx = pool.findIndex((w) => w.id === 'v-ser')
    expect(inProgressIdx).toBeGreaterThanOrEqual(0)
    // любое «новое» слово идёт после слова в процессе
    const firstFresh = pool.findIndex((w) => w.id !== 'v-ser' && !p.words[w.id]?.correct)
    expect(firstFresh).toBeGreaterThan(inProgressIdx)
  })

  it('слова из будущих уроков не попадают в пул', () => {
    const p = emptyProgress()
    const pool = practicePool(p, 5)
    for (const w of pool) expect(w.lesson).toBeLessThanOrEqual(5)
  })
})

describe('Упражнения', () => {
  it('тест-выбор: 4 варианта, ровно один верный', () => {
    const word = getWord('v-hablar')
    const ex = wordChoiceExercise(word, ALL_WORDS, 'es-ru')
    expect(ex.options.length).toBe(4)
    expect(new Set(ex.options).size).toBe(4)
    expect(ex.options[ex.answerIndex]).toBe(word.ru[0])
    // отвлекающие — той же части речи
    expect(ex.wordIds).toEqual(['v-hablar'])
  })

  it('тест-выбор RU→ES: вопрос на русском, варианты на испанском', () => {
    const word = getWord('n-casa')
    const ex = wordChoiceExercise(word, ALL_WORDS, 'ru-es')
    expect(ex.questionRu).toBe('дом')
    expect(ex.options).toContain('casa')
  })

  it('сборка фразы: плитки без пунктуации, все слова ответа + лишние, нижний регистр', () => {
    const p = withProgress({})
    // Словарь первых 13 уроков — чтобы выбор случайного шаблона был надёжным
    for (const w of ALL_WORDS.filter((w) => w.lesson <= 13)) p.words[w.id] = { correct: 2, wrong: 0 }
    let ex = makeExercise('build', p)
    for (let i = 0; i < 5 && !ex; i++) ex = makeExercise('build', p)
    expect(ex?.kind).toBe('build')
    const tiles = ex!.tiles!
    const answer = ex!.answerTiles!
    for (const tile of tiles) {
      expect(/[¿?¡!.]/.test(tile), tile).toBe(false)
    }
    // заглавная буква не выдаёт начало фразы
    for (const tile of tiles) expect(tile, tile).toBe(tile.toLowerCase())
    // все слова ответа присутствуют, а плиток больше (есть дистракторы)
    for (const w of answer) expect(tiles).toContain(w.toLowerCase())
    expect(tiles.length).toBeGreaterThan(answer.length)
    // дистракторы не пересекаются с ответом и не дублируются
    const extra = tiles.filter((t) => !answer.map((a) => a.toLowerCase()).includes(t))
    expect(extra.length).toBeGreaterThanOrEqual(2)
    expect(new Set(extra).size).toBe(extra.length)
  })

  it('аудио: вопрос для озвучки и варианты переводов', () => {
    const word = getWord('n-casa')
    const ex = audioExercise(word, ALL_WORDS)
    expect(ex.speak).toBe('casa')
    expect(ex.options.length).toBe(4)
    expect(ex.options[ex.answerIndex]).toBe('дом')
  })



  it('shuffle сохраняет все элементы', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffle(arr, () => 0.5)
    expect([...shuffled].sort()).toEqual(arr)
  })
})

describe('Запись ответов', () => {
  it('2 верных ответа делают слово выученным', () => {
    const p = emptyProgress()
    const ex = { kind: 'choice', options: [], answerIndex: 0, wordIds: ['v-ser'] } as const
    const n1 = recordAnswer(p as never, ex as never, true)
    expect(n1.length).toBe(0)
    expect(p.words['v-ser'].correct).toBe(1)
    const n2 = recordAnswer(p as never, ex as never, true)
    expect(n2.map((w) => w.id)).toEqual(['v-ser'])
    expect(p.words['v-ser'].knownAt).toBeTruthy()
  })

  it('неверные ответы не сбрасывают изученное, счётчики суммируются', () => {
    const p = withProgress({ 'v-ser': 2 })
    const ex = { kind: 'choice', options: [], answerIndex: 0, wordIds: ['v-ser'] } as const
    recordAnswer(p as never, ex as never, false)
    expect(p.words['v-ser'].correct).toBe(2)
    expect(p.words['v-ser'].wrong).toBe(1)
    expect(isKnown(p, 'v-ser')).toBe(true)
    expect(p.answers.wrong).toBe(1)
  })

  it('фразы: практика записывается по ключу', () => {
    const p = emptyProgress()
    const ex = { kind: 'choice', options: [], answerIndex: 0, wordIds: ['v-ser'], phraseKey: 't-x|a|aff' } as const
    recordAnswer(p as never, ex as never, true)
    expect(p.phrases['t-x|a|aff']).toEqual({ practiced: 1, correct: 1 })
  })
})

function isKnown(p: { words: Record<string, { correct: number }> }, id: string): boolean {
  return (p.words[id]?.correct ?? 0) >= KNOWN_THRESHOLD
}

describe('«Уже выучил» — реже, но не исчезает', () => {
  it('starExercise помечает слово упражнения, не трогая счётчики ответов', () => {
    const p = emptyProgress()
    const ex = wordChoiceExercise(getWord('n-casa'), ALL_WORDS, 'es-ru')
    starExercise(p, ex, 1000)
    expect(p.words['n-casa']?.star).toBe(1000)
    expect(p.words['n-casa']?.correct).toBe(0)
    expect(p.answers.correct).toBe(0)
  })

  it('starExercise помечает фразу по нормализованному предложению', () => {
    const p = emptyProgress()
    const ex: Exercise = {
      kind: 'build',
      options: [],
      answerIndex: -1,
      wordIds: ['n-casa'],
      answerTiles: ['El', 'padre', 'no', 'busca', 'a', 'un', 'maestro'],
    }
    starExercise(p, ex, 1000)
    expect(p.starredPhrases?.['el padre no busca a un maestro']).toBe(1000)
    // слова фразы при этом не помечаются — редчe только сама фраза
    expect(p.words['n-casa']?.star).toBeUndefined()
  })

  it('помеченные слова не в основных группах пула, а в маленьком хвосте (≤2)', () => {
    const p = withProgress({ 'v-ser': 1, 'n-casa': 2, 'v-hablar': 2 })
    p.words['v-ser']!.star = 1000
    p.words['n-casa']!.star = 1000
    const pool = practicePool(p)
    const starredIds = pool.filter((w) => p.words[w.id]?.star).map((w) => w.id)
    expect(starredIds.length).toBeLessThanOrEqual(2)
    // немаркированные слова остаются доступны
    expect(pool.some((w) => w.id === 'v-hablar')).toBe(true)
  })

  it('phraseStarKey: build — по плиткам, фраза-choice — по вопросу, слово — null', () => {
    expect(phraseStarKey({ kind: 'build', answerTiles: ['¿Quién', 'busca?'] } as Exercise)).toBe('quién busca')
    expect(phraseStarKey({ kind: 'choice', phraseKey: 't-x/0/qw', questionEs: '¿Cómo estás?' } as Exercise)).toBe('cómo estás')
    expect(phraseStarKey({ kind: 'choice', questionEs: 'casa' } as Exercise)).toBeNull()
  })
})

describe('«Eres alto» — опущенное подлежащее-местоимение', () => {
  it('buildExercise даёт вариант без местоимения, когда форма глагола однозначна', () => {
    // Tú eres alto → «Eres alto» (форма eres только у tú)
    const fill = { s: getWord('p-tu'), adj: getWord('a-alto') }
    const ex = buildExercise(fill, 't-pron-ser-adj', 'aff')
    expect(ex.answerTiles!.join(' ').toLowerCase()).toBe('tú eres alto')
    expect(ex.altAnswers).toContain('eres alto')
    // Nosotros somos altos → «Somos altos» (somos только у nosotros)
    const fill2 = { s: getWord('p-nosotros'), adj: getWord('a-alto') }
    const ex2 = buildExercise(fill2, 't-pron-ser-adj', 'aff')
    expect(ex2.altAnswers![0]).toContain('somos')
  })

  it('для неоднозначных форм (usted/él/ella — «es») вариант не даётся', () => {
    const fill = { s: getWord('p-usted'), adj: getWord('a-alto') }
    const ex = buildExercise(fill, 't-pron-ser-adj', 'aff')
    // «Es alto» непонятно: usted, él или ella — местоимение обязательно
    expect(ex.altAnswers).toBeUndefined()
  })
})
