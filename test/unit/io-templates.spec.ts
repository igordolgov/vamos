// ============================================================
// test/unit/io-templates.spec.ts — шаблоны «le/les + dar/escribir/decir»:
// получатель действия. Проверяем: получатель — только io-местоимения
// (me/te/le/les/nos, никогда lo/la), форма глагола согласована с
// подразумеваемым подлежащим (Me das / Te doy / Nos dan), порядок
// «получатель → глагол → вещь», русский перевод с дательным падежом.
// ============================================================

import { describe, it, expect } from 'vitest'
import { allTemplates } from '../../shared/phrases/templates'
import { walkFills, countTemplate } from '../../shared/phrases/engine'
import { ALL_WORDS } from '../../shared/data/words'
import type { Word } from '../../shared/types'

const KNOWN = new Set(ALL_WORDS.map((w) => w.id))
const IDS = ['t-io-dar-np', 't-io-escribir-np', 't-io-decir-np']

function tpl(id: string) {
  const t = allTemplates().find((x) => x.id === id)
  expect(t, `шаблон ${id} существует`).toBeTruthy()
  return t!
}

describe('le/les — получатель (dar, escribir, decir)', () => {
  it('шаблоны зарегистрированы в группе «le/les (получатель)»', () => {
    for (const id of IDS) {
      expect(tpl(id).group).toBe('le/les (получатель)')
    }
  })

  it('получатель — только io-местоимения (me/te/le/les/nos), никогда lo/la', () => {
    for (const id of IDS) {
      const unit = tpl(id).units[0]!
      expect(unit.kind).toBe('free')
      const es = (unit as { words: Word[] }).words.map((w) => w.es)
      expect(es).toEqual(expect.arrayContaining(['me', 'te', 'le', 'les', 'nos']))
      expect(es).not.toContain('lo')
      expect(es).not.toContain('la')
      expect(es).not.toContain('los')
      expect(es).not.toContain('las')
    }
  })

  it('дополнения совместимы с глаголом (decir не берёт «libro»)', () => {
    const decir = tpl('t-io-decir-np').units[2]!
    const nouns = (decir as { nouns: Word[] }).nouns
    expect(nouns.map((n) => n.es)).toEqual(expect.arrayContaining(['verdad', 'palabra', 'nombre']))
    expect(nouns.some((n) => n.id === 'n-libro')).toBe(false)
    // dar, наоборот, берёт вещи и еду
    const dar = (tpl('t-io-dar-np').units[2] as { nouns: Word[] }).nouns
    expect(dar.some((n) => n.id === 'n-libro')).toBe(true)
    expect(dar.some((n) => n.id === 'n-agua')).toBe(true)
  })

  it('«Le doy el libro» — получатель перед глаголом, lo не появляется', () => {
    const t = tpl('t-io-dar-np')
    const phrases: string[] = []
    walkFills(t, KNOWN, (fill, kind) => phrases.push(t.render(fill, kind)), { maxLeaves: 30_000 })
    expect(phrases.length).toBeGreaterThan(200)
    expect(phrases).toContain('Le doy el libro')
    expect(phrases).toContain('Le doy el agua') // el agua — ж.р. с артиклем «el»
    expect(phrases.some((p) => p.startsWith('No le '))).toBe(true)
    expect(phrases.some((p) => p.startsWith('¿Le '))).toBe(true)
    for (const p of phrases) {
      expect(p).not.toMatch(/\b(?:lo|la|los|las) (?:doy|das|da|damos|dan)\b/)
    }
  })

  it('форма глагола согласована с подразумеваемым подлежащим', () => {
    const t = tpl('t-io-dar-np')
    const phrases: string[] = []
    walkFills(t, KNOWN, (fill, kind) => {
      if (kind === 'aff') phrases.push(t.render(fill, kind))
    }, { maxLeaves: 30_000 })
    expect(phrases.some((p) => /^Me das /.test(p))).toBe(true) // me → ты (2s)
    expect(phrases.some((p) => /^Te doy /.test(p))).toBe(true) // te → я (1s)
    expect(phrases.some((p) => /^Le doy /.test(p))).toBe(true)
    expect(phrases.some((p) => /^Les doy /.test(p))).toBe(true)
    expect(phrases.some((p) => /^Nos dan /.test(p))).toBe(true) // nos → вы (3p)
  })

  it('русский перевод: субъект + дательный получатель + винительный предмет', () => {
    const t = tpl('t-io-dar-np')
    const phrases: string[] = []
    walkFills(t, KNOWN, (fill, kind) => {
      if (kind === 'aff') phrases.push(t.ru(fill, kind))
    }, { maxLeaves: 30_000 })
    // счётное всегда с артиклем: un → «(какую-то)», el → «(конкретную)»
    // (подсказки артиклей — «Le doy un libro» ↔ «Le doy el libro» различимы)
    expect(phrases).toContain('Я даю ему (какую-то) книгу')
    expect(phrases).toContain('Я даю ему (конкретную) книгу')
    expect(phrases).toContain('Ты даёшь мне (какую-то) книгу')
    expect(phrases.some((p) => p.startsWith('Вы даёте нам '))).toBe(true)
    // без мусора и незаполненных мест
    for (const p of phrases) expect(p).not.toMatch(/undefined|NaN|\? /)
  })

  it('decir: «Le digo la verdad», escribir: «Le escribo una carta»', () => {
    const decir = tpl('t-io-decir-np')
    const decirPhrases: string[] = []
    walkFills(decir, KNOWN, (fill, kind) => decirPhrases.push(decir.render(fill, kind)), { maxLeaves: 30_000 })
    expect(decirPhrases).toContain('Le digo la verdad')

    const escribir = tpl('t-io-escribir-np')
    const escribirPhrases: string[] = []
    walkFills(escribir, KNOWN, (fill, kind) => escribirPhrases.push(escribir.render(fill, kind)), { maxLeaves: 30_000 })
    expect(escribirPhrases).toContain('Le escribo una carta')
    // me → ты (2s): ¿Me escribes…?
    expect(escribirPhrases).toContain('¿Me escribes un nombre?')
  })

  it('русские переводы decir/escribir без падежных ошибок', () => {
    const decir = tpl('t-io-decir-np')
    const phrases: string[] = []
    walkFills(decir, KNOWN, (fill, kind) => {
      if (kind === 'aff') phrases.push(decir.ru(fill, kind))
    }, { maxLeaves: 30_000 })
    // verdad — счётное, всегда с артиклем → подсказка «(конкретную)/(какую-то)»
    expect(phrases.some((p) => /^Я говорю ему .*правду$/.test(p))).toBe(true)
    for (const p of phrases) {
      expect(p).toMatch(/^(Я|Ты|Вы) (не )?(говорю|говоришь|говорит|говорим|говорите)/)
    }
  })

  it('шаблоны собираются из известных слов (countTemplate > 0)', () => {
    for (const id of IDS) {
      expect(countTemplate(tpl(id), KNOWN)).toBeGreaterThan(0)
    }
  })
})
