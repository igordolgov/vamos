// ============================================================
// test/unit/mi-este.spec.ts — генерация фраз с «мой/этот»
// (просьба пользователя: включить mi/este в движок) и маркеры
// времени «(вообще)»/«(сейчас)» у глаголов с обеими формами.
// ============================================================

import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../shared/phrases/templates'
import { countTemplate, detCompatible, walkFills } from '../../shared/phrases/engine'
import { ALL_WORDS, getWord } from '../../shared/data/words'
import { ruDetCaseForm, ruNounCaseWithDet } from '../../shared/phrases/ru'
import type { Fill, PhraseKind, Template } from '../../shared/phrases/schema'

const ALL = new Set(ALL_WORDS.map((w) => w.id))
const NO_MI = new Set(ALL_WORDS.filter((w) => w.id !== 'p-mi' && w.id !== 'p-este').map((w) => w.id))
const T = (id: string) => {
  const t = TEMPLATES.find((x) => x.id === id)
  expect(t, `шаблон ${id} существует`).toBeTruthy()
  return t as Template
}
const w = (id: string) => getWord(id)

describe('Генерация фраз с mi/este', () => {
  it('определители-местоимения совместимы с существительными (но не с casa)', () => {
    expect(detCompatible(w('p-mi'), w('n-casa'), 'sg')).toBe(false)
    expect(detCompatible(w('p-mi'), w('n-telefono'), 'sg')).toBe(true)
    expect(detCompatible(w('p-mi'), w('n-telefono'), 'pl')).toBe(true) // mis teléfonos
    expect(detCompatible(w('p-este'), w('n-mujer'), 'sg')).toBe(true) // esta mujer
    expect(detCompatible(w('p-ese'), w('n-mujer'), 'pl')).toBe(true) // esas mujeres
    // случайные местоимения (не определители) — по-прежнему несовместимы
    expect(detCompatible(w('p-yo'), w('n-telefono'), 'sg')).toBe(false)
  })

  it('фразы с mi/este генерируются: счёт шаблона растёт', () => {
    const without = countTemplate(T('t-pron-v-do'), NO_MI)
    const withAll = countTemplate(T('t-pron-v-do'), ALL)
    expect(withAll).toBeGreaterThan(without)
    expect(without).toBeGreaterThan(0)
  })

  it('«Yo busco mi teléfono» действительно собирается из слов', () => {
    const found: string[] = []
    walkFills(T('t-pron-v-do'), ALL, (fill: Fill, kind: PhraseKind) => {
      found.push(T('t-pron-v-do').render(fill, kind))
    }, { maxLeaves: 200_000 })
    expect(found).toContain('Yo busco mi teléfono')
  })

  it('hay не сочетается с mi: «Hay mi comida» не генерируется', () => {
    const seen: string[] = []
    walkFills(T('t-hay-noun'), ALL, (fill: Fill, kind: PhraseKind) => {
      seen.push(T('t-hay-noun').render(fill, kind))
    }, { maxLeaves: 20_000 })
    expect(seen.length).toBeGreaterThan(0)
    for (const es of seen) expect(es.toLowerCase()).not.toMatch(/\b(mi|mis|este|esta)\b/)
  })

  it('русская фраза несёт определитель: «Я ищу мой телефон»', () => {
    const fill = {
      s: w('p-yo'), v: w('v-buscar'),
      'o#noun': w('n-telefono'), 'o#num': 'sg', 'o#det': w('p-mi'), 'o#adj': null,
    } as unknown as Fill
    const t = T('t-pron-v-do')
    expect(t.render(fill, 'aff')).toBe('Yo busco mi teléfono')
    expect(t.ru(fill, 'aff')).toBe('Я ищу (вообще) мой телефон')
  })

  it('мн.ч.: «Me gustan mis libros» → «Мне нравятся мои книги»', () => {
    const fill = {
      io: w('p-me'),
      'o#noun': w('n-libro'), 'o#num': 'pl', 'o#det': w('p-mi'), 'o#adj': null,
    } as unknown as Fill
    const t = T('t-pron-gustar-np')
    expect(t.render(fill, 'aff')).toBe('Me gustan mis libros')
    expect(t.ru(fill, 'aff')).toBe('Мне нравятся мои книги')
  })
})

describe('Косвенные падежи определителей-местоимений', () => {
  it('формы: «с моей мамой», «в моей школе», «виду моего папу»', () => {
    // instr: с моей мамой
    expect(ruNounCaseWithDet(w('n-madre'), w('p-mi'), 'con', 'с мамой')).toBe('с моей мамой')
    // prep: в моей школе
    expect(ruNounCaseWithDet(w('n-escuela'), w('p-mi'), 'en', 'в школе')).toBe('в моей школе')
    // dat без предлога: помогаю моей маме
    expect(ruNounCaseWithDet(w('n-madre'), w('p-mi'), 'dat', 'маме')).toBe('моей маме')
    // одушевлённый вин.п.: вижу моего папу (m) / вижу мою маму (f)
    expect(ruDetCaseForm(w('p-mi'), w('n-padre'), 'a')).toBe('моего')
    expect(ruDetCaseForm(w('p-mi'), w('n-madre'), 'a')).toBe('мою')
    // неодушевлённый вин.п.: мой телефон
    expect(ruDetCaseForm(w('p-mi'), w('n-telefono'), 'a')).toBe('мой')
  })

  it('ese — «тот»: с тем папой', () => {
    expect(ruNounCaseWithDet(w('n-padre'), w('p-ese'), 'con', 'с папой')).toBe('с тем папой')
    expect(ruDetCaseForm(w('p-ese'), w('n-madre'), 'a')).toBe('ту')
  })

  it('su не склоняется: с его папой, в его школе', () => {
    expect(ruNounCaseWithDet(w('n-padre'), w('p-su'), 'con', 'с папой')).toBe('с его папой')
    expect(ruNounCaseWithDet(w('n-escuela'), w('p-su'), 'en', 'в школе')).toBe('в его школе')
  })

  it('русская падежная фраза с mi целиком: «в моей школе»', () => {
    const fill = {
      s: w('p-yo'),
      v: w('v-estar'), prep: w('prep-en'),
      'o#noun': w('n-escuela'), 'o#num': 'sg', 'o#det': w('p-mi'),
    } as unknown as Fill
    const t = T('t-pron-v-prep-np')
    expect(t.render(fill, 'aff')).toBe('Yo estoy en mi escuela')
    expect(t.ru(fill, 'aff')).toBe('Я в моей школе')
  })
})

describe('Маркеры времени «(вообще)» / «(сейчас)»', () => {
  it('простое время у глагола с обеими формами: «Я ищу (вообще) телефон»', () => {
    const fill = {
      s: w('p-yo'), v: w('v-buscar'),
      'o#noun': w('n-telefono'), 'o#num': 'sg', 'o#det': null, 'o#adj': null,
    } as unknown as Fill
    const t = T('t-pron-v-do')
    expect(t.ru(fill, 'aff')).toBe('Я ищу (вообще) телефон')
    expect(t.ru(fill, 'neg')).toBe('Я не ищу (вообще) телефон')
  })

  it('estar + герундий: «Я ищу (сейчас) телефон»', () => {
    const fill = {
      s: w('p-yo'), v: w('v-buscar'),
      'o#noun': w('n-telefono'), 'o#num': 'sg', 'o#det': null, 'o#adj': null,
    } as unknown as Fill
    const t = T('t-pron-estar-gerund')
    expect(t.render(fill, 'aff')).toBe('Yo estoy buscando teléfono')
    expect(t.ru(fill, 'aff')).toBe('Я ищу (сейчас) телефон')
    expect(t.ru(fill, 'yesno')).toBe('Я ищу (сейчас) телефон?')
  })

  it('у глаголов без герундийной пары маркеров нет', () => {
    // conocer — transitive, но нет в estar+герундии
    const fill = {
      s: w('p-yo'), v: w('v-conocer'),
      'o#noun': w('n-mujer'), 'o#num': 'sg', 'o#det': null, 'o#adj': null,
    } as unknown as Fill
    // conocer — лицо: шаблон person, не do; берём чистый случай — v-leer
    const fill2 = {
      s: w('p-yo'), v: w('v-leer'),
      'o#noun': w('n-libro'), 'o#num': 'sg', 'o#det': null, 'o#adj': null,
    } as unknown as Fill
    expect(T('t-pron-v-do').ru(fill2, 'aff')).toBe('Я читаю (вообще) книгу')
    expect(T('t-pron-v-do').ru(fill, 'aff')).toBe('Я знаю женщину')
  })
})
