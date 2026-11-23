// ============================================================
// plural.spec.ts — склонение числительных («фраза/фразы/фраз»).
// ============================================================
import { describe, expect, it } from 'vitest'
import { phrasesWord, pluralEs, pluralRu } from '#shared/i18n/plural'

describe('pluralRu', () => {
  const forms: [string, string, string] = ['фраза', 'фразы', 'фраз']

  it('единственное число', () => {
    expect(pluralRu(1, forms)).toBe('фраза')
    expect(pluralRu(21, forms)).toBe('фраза')
    expect(pluralRu(101, forms)).toBe('фраза')
    expect(pluralRu(6951, forms)).toBe('фраза')
  })

  it('2–4 и кратные им', () => {
    expect(pluralRu(2, forms)).toBe('фразы')
    expect(pluralRu(4, forms)).toBe('фразы')
    expect(pluralRu(22, forms)).toBe('фразы')
    expect(pluralRu(27202, forms)).toBe('фразы')
  })

  it('5+ и 11–14', () => {
    expect(pluralRu(5, forms)).toBe('фраз')
    expect(pluralRu(12, forms)).toBe('фраз')
    expect(pluralRu(14, forms)).toBe('фраз')
    expect(pluralRu(11, forms)).toBe('фраз')
    expect(pluralRu(0, forms)).toBe('фраз')
    expect(pluralRu(1000000, forms)).toBe('фраз')
  })

  it('отрицательные числа трактуются как положительные', () => {
    expect(pluralRu(-1, forms)).toBe('фраза')
    expect(pluralRu(-5, forms)).toBe('фраз')
  })
})

describe('pluralEs', () => {
  it('1 → единственное, остальное — множественное', () => {
    expect(pluralEs(1, 'frase', 'frases')).toBe('frase')
    expect(pluralEs(-1, 'frase', 'frases')).toBe('frase')
    expect(pluralEs(2, 'frase', 'frases')).toBe('frases')
    expect(pluralEs(0, 'frase', 'frases')).toBe('frases')
    expect(pluralEs(68188, 'frase', 'frases')).toBe('frases')
  })
})

describe('phrasesWord', () => {
  it('выбирает форму по локали', () => {
    expect(phrasesWord(1, 'ru')).toBe('фраза')
    expect(phrasesWord(3, 'ru')).toBe('фразы')
    expect(phrasesWord(7, 'ru')).toBe('фраз')
    expect(phrasesWord(1, 'es')).toBe('frase')
    expect(phrasesWord(7, 'es')).toBe('frases')
  })
})
