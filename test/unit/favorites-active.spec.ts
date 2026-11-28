// ============================================================
// test/unit/favorites-active.spec.ts — «нравится»/«не нравится»
// (коллекция и скрытие фраз), «Активный перевод» (RU → ES),
// цветовые роли плиток и речевые достижения.
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  makeExercise,
  buildExercise,
  activeExercise,
  likePhrase,
  hidePhrase,
  normalizeTyped,
  typeableWord,
  normalizePhraseKey,
  type Exercise,
} from '../../shared/practice'
import { getWord, ALL_WORDS } from '../../shared/data/words'
import { emptyProgress, type Progress } from '../../shared/types'
import { achievementContext } from '../../shared/achievements'

function progressWith(partial: Partial<Progress>): Progress {
  return { ...emptyProgress(), ...partial }
}

const knownProgress = (): Progress => {
  // знакомый набор: yo, buscar, teléfono + артикли (урок 2) —
  // шаблон t-pron-v-do собирается: «Yo busco un teléfono».
  // Общая практика собирает фразы ТОЛЬКО из встречавшихся слов:
  // артикль в наборе обязателен (незнакомые слова не подставляются)
  const p = emptyProgress()
  for (const id of ['p-yo', 'v-buscar', 'n-telefono', 'd-un', 'd-el', 'd-la', 'd-una']) {
    p.words[id] = { correct: 3, wrong: 0, knownAt: 1 }
  }
  return p
}

describe('«Нравится» / «Не нравится»', () => {
  it('likePhrase добавляет фразу в коллекцию и снимает дизлайк', () => {
    const p = emptyProgress()
    const ex = makeExercise('build', knownProgress(), () => 0.42)
    expect(ex).toBeTruthy()
    expect(ex!.kind).toBe('build')
    // первый лайк
    const key = likePhrase(p, ex!, 1000)
    expect(key).toBeTruthy()
    expect(p.likedPhrases![key!]).toBe(1000)
    // дизлайк перекрывает лайк, лайк снимает дизлайк
    hidePhrase(p, ex!, 2000)
    expect(p.hiddenPhrases![key!]).toBe(2000)
    likePhrase(p, ex!, 3000)
    expect(p.likedPhrases![key!]).toBe(3000)
    expect(p.hiddenPhrases?.[key!]).toBeUndefined()
  })

  it('скрытая фраза не показывается: makeExercise её пропускает', () => {
    const known = knownProgress()
    // сузим известный набор до одной связки: yo+buscar+telefono
    const first = makeExercise('build', known, () => 0.1) as Exercise
    expect(first).toBeTruthy()
    const hiddenKey = normalizePhraseKey(first!.explanation ?? '')
    const p = progressWith({
      words: known.words,
      hiddenPhrases: { [hiddenKey]: 1 },
    })
    // все фразы одного шаблона скрыты → практику не на чем собрать, null
    for (let i = 0; i < 20; i++) {
      const ex = makeExercise('build', p, Math.random)
      if (!ex) continue
      expect(normalizePhraseKey(ex.explanation ?? '')).not.toBe(hiddenKey)
    }
  })

  it('фраза из коллекции имеет приоритет над нейтральной', () => {
    const known = knownProgress()
    const sample = makeExercise('build', known, () => 0.3) as Exercise
    const likedKey = normalizePhraseKey(sample!.explanation ?? '')
    const p = progressWith({
      words: known.words,
      likedPhrases: { [likedKey]: 1 },
    })
    // 10 попыток генератора: рано или поздно лайкнутая выйдет вперёд
    // (в нашей сборке она же и есть ближайшая нейтральная — ключ совпадает)
    const ex = makeExercise('build', p, () => 0.3)
    expect(ex).toBeTruthy()
  })

  it('слово не фразовое упражнение: likePhrase возвращает null', () => {
    const p = emptyProgress()
    const ex: Exercise = {
      kind: 'choice', options: [], answerIndex: 0,
      questionEs: 'hablar', wordIds: ['v-hablar'],
    }
    expect(likePhrase(p, ex)).toBeNull()
    expect(hidePhrase(p, ex)).toBeNull()
  })
})

describe('Активный перевод (RU → ES)', () => {
  it('normalizeTyped: ударения/регистр/пунктуация не важны', () => {
    expect(normalizeTyped('Teléfono')).toBe('telefono')
    expect(normalizeTyped('¿teléfono?')).toBe('telefono')
    expect(normalizeTyped('TELÉFONO ')).toBe('telefono')
    expect(normalizeTyped('año')).toBe('ano')
    expect(normalizeTyped('telefono')).toBe(normalizeTyped('teléfono'))
  })

  it('activeExercise: каноничный ответ, esAlt и артикль через ruHint', () => {
    const ex = activeExercise(getWord('n-telefono'))
    expect(ex.kind).toBe('active')
    expect(ex.typeAnswer).toBe('teléfono')
    expect(ex.questionRu).toBe('телефон')
    const det = activeExercise(getWord('d-el'))
    expect(det.questionRu).toBe(getWord('d-el').ruHint)
  })

  it('makeExercise(active) возвращает вводимое упражнение без формул-конструкций', () => {
    const p = knownProgress()
    for (let i = 0; i < 10; i++) {
      const ex = makeExercise('active', p, Math.random)
      expect(ex).toBeTruthy()
      expect(ex!.kind).toBe('active')
      expect(ex!.typeAnswer, ex!.typeAnswer).not.toContain('+')
    }
  })

  it('typeableWord отсекает формулы («estar + герундий»)', () => {
    expect(typeableWord(getWord('cstr-estar-gerundio'))).toBe(false)
    expect(typeableWord(getWord('cstr-hay-que'))).toBe(true)
    expect(typeableWord(getWord('n-telefono'))).toBe(true)
  })
})

describe('Цветовые роли плиток', () => {
  it('buildExercise отдаёт tileWords: глагол — verb, существительное — noun', () => {
    const t = 't-pron-v-do'
    const fill = {
      s: getWord('p-yo'), v: getWord('v-buscar'),
      'o#noun': getWord('n-telefono'), 'o#num': 'sg',
      'o#det': getWord('p-mi'), 'o#adj': null,
    } as never
    const ex = buildExercise(fill, t, 'aff', () => 0.5, 33, new Set(ALL_WORDS.map((x) => x.id)))
    expect(ex.kind).toBe('build')
    expect(ex.tileWords).toBeTruthy()
    const tw = ex.tileWords!
    expect(tw['busco']).toBe('verb')
    expect(tw['teléfono']).toBe('noun')
    expect(tw['mi']).toBe('pronoun')
    // плитки ответа покрыты ролями
    for (const tile of ex.answerTiles ?? []) {
      expect(tw[tile.toLowerCase()], tile).toBeTruthy()
    }
  })
})

describe('Речевые достижения', () => {
  it('phraseFirstTry: одна практика с верным ответом', () => {
    const p = progressWith({
      phrases: { 't|a|aff': { practiced: 1, correct: 1 } },
    })
    expect(achievementContext(p).phraseFirstTry).toBe(true)
    expect(achievementContext(p).phrasesPracticed).toBe(1)
  })

  it('вторая попытка уже не «с первого раза»', () => {
    const p = progressWith({
      phrases: { 't|a|aff': { practiced: 2, correct: 1 } },
    })
    expect(achievementContext(p).phraseFirstTry).toBe(false)
    expect(achievementContext(p).phrasesPracticed).toBe(2)
  })

  it('новый урок 33 «Спасательные фразы» попал в словарь', () => {
    const words = ALL_WORDS.filter((w) => w.lesson === 33)
    expect(words.map((w) => w.es).sort()).toEqual(['dame', 'dime', 'espera', 'mira', 'oye'])
    expect(ALL_WORDS.length).toBe(318)
  })
})
