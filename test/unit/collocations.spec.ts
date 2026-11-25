// ============================================================
// test/unit/collocations.spec.ts — белый список сочетаемости.
//
// Генератор не должен порождать абсурд: «уставшая кровать»
// (cansado не описывает неодушевлённое), «пишу кровать»
// (escribir не сочетается с cama), «Они не тоже работают»
// (no перед наречием también). Плюс инвариант: аналитический
// подсчёт фраз совпадает с фактическим перечислением.
// ============================================================

import { describe, it, expect } from 'vitest'
import { getWord, ALL_WORDS } from '../../shared/data/words'
import { TEMPLATES, allTemplates } from '../../shared/phrases/templates'
import {
  adjSemCompatible,
  verbObjCompatible,
  ADJ_NOUN_CLASSES,
  VERB_OBJ_ALLOWED,
} from '../../shared/phrases/collocations'
import { countTemplate, enumerateTemplate, walkFills, adjCompatible } from '../../shared/phrases/engine'
import type { Fill, Word } from '../../shared/phrases/schema'

const ALL = new Set(ALL_WORDS.map((w) => w.id))

const w = (id: string) => getWord(id)

describe('Прилагательное × существительное', () => {
  it('состояния человека не описывают предметы: cansado × cama — нет', () => {
    expect(adjSemCompatible(w('a-cansado'), w('n-cama'))).toBe(false)
    expect(adjSemCompatible(w('a-cansado'), w('n-mesa'))).toBe(false)
    expect(adjCompatible(w('a-cansado'), w('n-cama'))).toBe(false)
  })

  it('состояния человека сочетаются с людьми: cansado × hombre — да', () => {
    expect(adjSemCompatible(w('a-cansado'), w('n-hombre'))).toBe(true)
    expect(adjSemCompatible(w('a-cansado'), w('n-hermana'))).toBe(true)
    expect(adjSemCompatible(w('a-enfermo'), w('n-nino'))).toBe(true)
  })

  it('температура: еда/напитки — да, люди — нет', () => {
    expect(adjSemCompatible(w('a-caliente'), w('n-cafe'))).toBe(true)
    expect(adjSemCompatible(w('a-frio'), w('n-agua'))).toBe(true)
    expect(adjSemCompatible(w('a-caliente'), w('n-hombre'))).toBe(false)
  })

  it('вкус: только еда и напитки', () => {
    expect(adjSemCompatible(w('a-rico'), w('n-pan'))).toBe(true)
    expect(adjSemCompatible(w('a-delicioso'), w('n-fruta'))).toBe(true)
    expect(adjSemCompatible(w('a-rico'), w('n-casa'))).toBe(false)
    expect(adjSemCompatible(w('a-rico'), w('n-libro'))).toBe(false)
  })

  it('цвета: предметы и напитки — да, люди — нет', () => {
    expect(adjSemCompatible(w('a-blanco'), w('n-vino'))).toBe(true)
    expect(adjSemCompatible(w('a-negro'), w('n-carro'))).toBe(true)
    expect(adjSemCompatible(w('a-rojo'), w('n-hombre'))).toBe(false)
  })

  it('цена: предметы и места, не люди', () => {
    expect(adjSemCompatible(w('a-caro'), w('n-telefono'))).toBe(true)
    expect(adjSemCompatible(w('a-barato'), w('n-restaurante'))).toBe(true)
    expect(adjSemCompatible(w('a-caro'), w('n-mujer'))).toBe(false)
  })

  it('универсальные прилагательные сочетаются со всем', () => {
    expect(ADJ_NOUN_CLASSES['a-bueno']).toBeUndefined()
    expect(adjSemCompatible(w('a-bueno'), w('n-cama'))).toBe(true)
    expect(adjSemCompatible(w('a-nuevo'), w('n-trabajo'))).toBe(true)
    expect(adjSemCompatible(w('a-grande'), w('n-problema'))).toBe(true)
  })

  it('белый список покрывает все прилагательные с ограничениями корректными классами', () => {
    for (const [adjId, classes] of Object.entries(ADJ_NOUN_CLASSES)) {
      expect(classes.length, adjId).toBeGreaterThan(0)
      const adj = w(adjId)
      expect(adj.pos, adjId).toBe('adjective')
    }
  })
})

describe('Глагол × прямое дополнение', () => {
  it('escribir не сочетается с cama («пишу кровать» — нет)', () => {
    expect(verbObjCompatible(w('v-escribir'), w('n-cama'))).toBe(false)
    expect(verbObjCompatible(w('v-escribir'), w('n-mesa'))).toBe(false)
  })

  it('escribir сочетается с книгой, письмом и абстрактным', () => {
    expect(verbObjCompatible(w('v-escribir'), w('n-libro'))).toBe(true)
    expect(verbObjCompatible(w('v-escribir'), w('n-carta'))).toBe(true)
    expect(verbObjCompatible(w('v-escribir'), w('n-palabra'))).toBe(true)
    expect(verbObjCompatible(w('v-escribir'), w('n-historia'))).toBe(true)
  })

  it('leer: книга и письмо — да, мебель — нет', () => {
    expect(verbObjCompatible(w('v-leer'), w('n-libro'))).toBe(true)
    expect(verbObjCompatible(w('v-leer'), w('n-carta'))).toBe(true)
    expect(verbObjCompatible(w('v-leer'), w('n-silla'))).toBe(false)
  })

  it('recordar: имя и мысль — да, стол — нет', () => {
    expect(verbObjCompatible(w('v-recordar'), w('n-nombre'))).toBe(true)
    expect(verbObjCompatible(w('v-recordar'), w('n-respuesta'))).toBe(true)
    expect(verbObjCompatible(w('v-recordar'), w('n-mesa'))).toBe(false)
  })

  it('глаголы без записи в белом списке работают по objClasses', () => {
    expect(VERB_OBJ_ALLOWED['v-comer']).toBeUndefined()
    expect(verbObjCompatible(w('v-comer'), w('n-pan'))).toBe(true)
    expect(verbObjCompatible(w('v-comer'), w('n-agua'))).toBe(true)
    expect(verbObjCompatible(w('v-comer'), w('n-libro'))).toBe(false)
  })
})

describe('Инвариант: подсчёт = перечисление, все пары из белого списка', () => {
  /** Шаблоны с прилагательными и дополнениями (небольшие — перечисляются целиком) */
  const ids = ['t-pron-v-do', 't-pron-tener-noun', 't-pron-gustar-np', 't-pron-ser-prof']

  /** Пары «прилагательное × существительное» и «глагол × дополнение» из заполнения */
  function pairsOf(t: ReturnType<typeof allTemplates>[number], fill: Fill): Array<[Word, Word]> {
    const pairs: Array<[Word, Word]> = []
    for (const unit of t.units) {
      if (unit.kind === 'np' && unit.withAdj) {
        const noun = fill[`${unit.role}#noun`] as Word | undefined
        const adj = fill[`${unit.role}#adj`] as Word | null | undefined
        if (noun && adj) pairs.push([adj, noun])
      }
      if (unit.kind === 'verbObj') {
        const verb = fill[unit.verbRole] as Word | undefined
        const noun = fill[`${unit.nounRole}#noun`] as Word | undefined
        if (verb && noun) pairs.push([verb, noun])
      }
    }
    return pairs
  }

  it('перечисление содержит только допустимые пары, total совпадает', () => {
    for (const id of ids) {
      const t = TEMPLATES.find((x) => x.id === id)!
      const { phrases, total } = enumerateTemplate(t, ALL, 0, 500_000)
      expect(phrases.length, id).toBe(total)
      expect(total, id).toBe(countTemplate(t, ALL))
      for (const p of phrases.slice(0, 3000)) {
        // пары проверяем по ключу фразы → заполнение недоступно, поэтому
        // проверяем через walkFills ниже; здесь — выборочный контроль текста
        expect(p.ru.includes('уставшую кровать'), p.ru).toBe(false)
        expect(p.ru.includes(' пишу кровать'), p.ru).toBe(false)
      }
    }
  })

  it('walkFills: каждая пара «прил.×сущ.» и «глагол×дополнение» в белом списке', () => {
    for (const t of TEMPLATES) {
      walkFills(t, ALL, (fill) => {
        for (const [a, b] of pairsOf(t, fill)) {
          const isAdjPair = !!a.adj
          const ok = isAdjPair ? adjCompatible(a, b) : verbObjCompatible(a, b)
          if (!ok) {
            // найти нарушивший шаблон в отчёте
            throw new Error(`${t.id}: недопустимая пара ${a.id} × ${b.id}`)
          }
        }
      }, { maxLeaves: 120_000 })
    }
  })

  it('глагольный прирост согласован с подсчётом при белых списках', () => {
    // выучить cama не должно добавлять фраз «пишу кровать»
    const base = new Set(ALL_WORDS.filter((x) => x.lesson <= 6 && x.id !== 'n-cama').map((x) => x.id))
    for (const t of TEMPLATES.slice(0, 20)) {
      const extended = new Set([...base, 'n-cama'])
      const before = countTemplate(t, base)
      const after = countTemplate(t, extended)
      expect(after, t.id).toBeGreaterThanOrEqual(before)
    }
  })
})

describe('Наречия и отрицание', () => {
  it('нет «no también / no casi / no ya / no ahora / no todavía / no apenas»', () => {
    for (const t of TEMPLATES) {
      const { phrases } = enumerateTemplate(t, ALL, 0, 20_000)
      for (const p of phrases) {
        expect(p.es.toLowerCase(), p.es).not.toMatch(/no (también|todavía|casi|apenas|ahora|ya)\b/)
        expect(p.ru, p.es).not.toContain('не тоже')
      }
    }
  })

  it('«Ya no trabajo» / «Они уже не работают» корректно собираются', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-adv-no-v')!
    const { phrases } = enumerateTemplate(t, ALL, 0, 10_000)
    expect(phrases.some((p) => p.es === 'Yo ya no trabajo')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Они уже не работают')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Они ещё не работают')).toBe(true)
    for (const p of phrases) expect(p.kind).toBe('neg')
  })

  it('«Ellos tampoco trabajan» — отрицание для también', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-tampoco-v')!
    const { phrases } = enumerateTemplate(t, ALL, 0, 10_000)
    expect(phrases.some((p) => p.es === 'Ellos tampoco trabajan')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Они тоже не работают')).toBe(true)
  })

  it('«No siempre trabajan» сохранено, у adverb2 отрицаний нет', () => {
    const t1 = TEMPLATES.find((x) => x.id === 't-pron-v-adverb')!
    const p1 = enumerateTemplate(t1, ALL, 0, 5000).phrases
    expect(p1.some((p) => p.es === 'Ellos no siempre trabajan')).toBe(true)

    const t2 = TEMPLATES.find((x) => x.id === 't-pron-v-adverb2')!
    const p2 = enumerateTemplate(t2, ALL, 0, 20_000).phrases
    expect(p2.some((p) => p.es === 'Ellos también trabajan')).toBe(true)
    for (const p of p2) expect(p.kind, p.es).not.toBe('neg')
  })
})
