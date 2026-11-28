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
import { TEMPLATES, allTemplates, BARE_OK_VERBS, MANNER_VERBS, PRONOUN_CONJ_VERBS } from '../../shared/phrases/templates'
import {
  adjSemCompatible,
  verbObjCompatible,
  ADJ_NOUN_CLASSES,
  ADJ_NOUN_EXCEPTIONS,
  VERB_OBJ_ALLOWED,
} from '../../shared/phrases/collocations'
import { countTemplate, enumerateTemplate, walkFills, adjCompatible, detCompatible, unitNumbers } from '../../shared/phrases/engine'
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

  it('вкус: только еда и напитки, богатство: люди', () => {
    expect(adjSemCompatible(w('a-rico'), w('n-pan'))).toBe(true)
    expect(adjSemCompatible(w('a-delicioso'), w('n-fruta'))).toBe(true)
    expect(adjSemCompatible(w('a-rico'), w('n-casa'))).toBe(false)
    expect(adjSemCompatible(w('a-rico'), w('n-libro'))).toBe(false)
    // «богатый человек», «богатый город» — да (ruByClass переводит как «богатый»)
    expect(adjSemCompatible(w('a-rico'), w('n-hombre'))).toBe(true)
    expect(adjSemCompatible(w('a-rico'), w('n-ciudad'))).toBe(true)
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
      // пустой список = только исключения (fácil/difícil: «лёгкий вопрос»)
      expect(
        classes.length > 0 || (ADJ_NOUN_EXCEPTIONS[adjId]?.length ?? 0) > 0,
        adjId,
      ).toBe(true)
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

  it('глаголы с точным списком: comer — только еда (не напитки), beber — напитки', () => {
    expect(verbObjCompatible(w('v-comer'), w('n-pan'))).toBe(true)
    expect(verbObjCompatible(w('v-comer'), w('n-agua'))).toBe(false)
    expect(verbObjCompatible(w('v-comer'), w('n-libro'))).toBe(false)
    expect(verbObjCompatible(w('v-beber'), w('n-agua'))).toBe(true)
    expect(verbObjCompatible(w('v-beber'), w('n-pan'))).toBe(false)
  })
})

describe('Инвариант: подсчёт = перечисление, все пары из белого списка', () => {
  /** Шаблоны с прилагательными и дополнениями (небольшие — перечисляются целиком) */
  const ids = ['t-pron-v-do', 't-pron-tener-noun', 't-pron-gustar-np', 't-pron-ser-prof', 't-noun-v-person', 't-noun-ser-adj', 't-pron-tener-num', 't-pron-modal-inf']

  /** Пары «прилагательное × существительное» и «глагол × дополнение» из заполнения */
  function pairsOf(t: ReturnType<typeof allTemplates>[number], fill: Fill): Array<[Word, Word]> {
    const pairs: Array<[Word, Word]> = []
    for (const unit of t.units) {
      if (unit.kind === 'np' && unit.withAdj) {
        const noun = fill[`${unit.role}#noun`] as Word | undefined
        const adj = fill[`${unit.role}#adj`] as Word | null | undefined
        if (noun && adj) pairs.push([adj, noun])
      }
      if (unit.kind === 'npDep' && unit.depRole === 'adj') {
        const noun = fill[`${unit.role}#noun`] as Word | undefined
        const adj = fill[unit.depRole] as Word | null | undefined
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

describe('Примеры из жалоб — больше не генерируются', () => {
  it('«Мы читаем дешёвую жизнь?» — leer/escribir не сочетаются с vida', () => {
    expect(verbObjCompatible(w('v-leer'), w('n-vida'))).toBe(false)
    expect(verbObjCompatible(w('v-escribir'), w('n-vida'))).toBe(false)
    expect(verbObjCompatible(w('v-leer'), w('n-libro'))).toBe(true)
    expect(verbObjCompatible(w('v-leer'), w('n-carta'))).toBe(true)
    expect(verbObjCompatible(w('v-escribir'), w('n-historia'))).toBe(true)
    expect(verbObjCompatible(w('v-leer'), w('n-mesa'))).toBe(false)
  })

  it('«Она может мочь?» — модальный не сочетается с модальным и с собой', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-modal-inf')!
    const { phrases } = enumerateTemplate(t, ALL, 0, 100_000)
    for (const p of phrases) {
      expect(p.es, p.es).not.toMatch(/\b(poder|querer|necesitar) (poder|querer|necesitar)\b/)
    }
    expect(phrases.some((p) => p.es === 'Ella puede trabajar')).toBe(true)
    expect(phrases.some((p) => p.es === 'Yo quiero comer')).toBe(true)
  })

  it('«No hay la comida» — hay без определённого артикля и притяжательных', () => {
    const t = TEMPLATES.find((x) => x.id === 't-hay-noun')!
    const { phrases, total } = enumerateTemplate(t, ALL, 0, 50_000)
    expect(phrases.length, 'перечисление = подсчёт').toBe(total)
    expect(total).toBe(countTemplate(t, ALL))
    for (const p of phrases) {
      expect(p.es, p.es).toMatch(/^(no hay |hay )/i)
      expect(p.es, p.es).not.toMatch(/hay (el|la|los|las|mi|tu|su|nuestro|este|ese) /)
    }
    expect(phrases.some((p) => p.es === 'Hay comida')).toBe(true)
    expect(phrases.some((p) => p.es === 'No hay comida')).toBe(true)
    expect(phrases.some((p) => p.es === 'Hay una cama')).toBe(true)
    expect(phrases.some((p) => p.es === 'Hay mucha comida')).toBe(true)
    // «No hay una comida» — нет: comida — массовое «еда» (жалоба пользователя)
    expect(phrases.some((p) => p.es === 'Hay una comida')).toBe(false)
    expect(phrases.some((p) => p.es === 'No hay una comida')).toBe(false)
  })

  it('«Te doy una leche» — неисчисляемые без un/una, без мн.ч. (жалоба пользователя)', () => {
    // «дать молоко» — да, но только без неопределённого артикля
    expect(verbObjCompatible(w('v-dar'), w('n-leche'))).toBe(true)
    expect(detCompatible(w('d-una'), w('n-leche'), 'sg')).toBe(false)
    expect(detCompatible(w('d-una'), w('n-azucar'), 'sg')).toBe(false)
    expect(detCompatible(w('d-una'), w('n-sal'), 'sg')).toBe(false)
    expect(detCompatible(w('d-un'), w('n-arroz'), 'sg')).toBe(false)
    // comida — массовое «еда»: «No hay comida», а не «No hay una comida»
    expect(detCompatible(w('d-una'), w('n-comida'), 'sg')).toBe(false)
    expect(detCompatible(w('d-una'), w('n-cama'), 'sg')).toBe(true)
    // «много молока» — да
    expect(detCompatible(w('d-mucho'), w('n-leche'), 'sg')).toBe(true)
    // leche/azúcar/sal/arroz не имеют реального мн.ч. ни на одной оси
    expect(unitNumbers(w('n-leche'), 'any')).toEqual(['sg'])
    expect(unitNumbers(w('n-casa'), 'any')).toEqual(['sg', 'pl'])
    // в t-io-dar-np: голая форма и «la leche» есть, «una leche» — нет
    const dar = TEMPLATES.find((x) => x.id === 't-io-dar-np')!
    const phrases = enumerateTemplate(dar, ALL, 0, 50_000).phrases
    expect(phrases.some((p) => p.es === 'Te doy leche')).toBe(true)
    expect(phrases.some((p) => p.es === 'Te doy la leche')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Я даю тебе молоко')).toBe(true)
    for (const p of phrases) {
      expect(p.es, p.es).not.toMatch(/una? (leche|azúcar|sal|arroz)|\b(leches|azúcares|arroces)\b/)
    }
  })

  it('«У ребёнка есть чёрный фильм?» — цвета не описывают фильмы и фото', () => {
    expect(adjSemCompatible(w('a-negro'), w('n-pelicula'))).toBe(false)
    expect(adjSemCompatible(w('a-blanco'), w('n-pelicula'))).toBe(false)
    expect(adjSemCompatible(w('a-azul'), w('n-foto'))).toBe(false)
    // с обычными предметами цвета работают по-прежнему
    expect(adjSemCompatible(w('a-negro'), w('n-carro'))).toBe(true)
    expect(adjSemCompatible(w('a-blanco'), w('n-camisa'))).toBe(true)
    // скан шаблона с прилагательным: никаких «чёрный фильм»/«белое фото»
    const t = TEMPLATES.find((x) => x.id === 't-noun-v-do-adj')!
    walkFills(t, ALL, (fill, kind) => {
      const ru = t.ru(fill, kind)
      expect(ru, ru).not.toMatch(/(чёрный|белый|красный|зелёный|синий|жёлтый) (фильм|фото)/)
    }, { maxLeaves: 120_000 })
  })

  it('«Молоко — очень вкусное» — ser+прил. согласует прилагательное целиком', () => {
    const t = TEMPLATES.find((x) => x.id === 't-noun-ser-adj')!
    const phrases = enumerateTemplate(t, ALL, 0, 100_000).phrases
    // подсказка артикля подлежащего: «El carro es nuevo» ↔ «Un carro es nuevo»
    expect(phrases.some((p) => p.ru === '(Известное) молоко — дорогое')).toBe(true)
    expect(phrases.some((p) => p.ru === '(Известное) молоко — очень вкусное')).toBe(true)
    expect(phrases.some((p) => p.ru === '(Известная) машина — красивая')).toBe(true)
    for (const p of phrases) {
      // «Молоко — дорогой» (сбиты род/скобки) больше не генерируется
      expect(p.ru, p.ru).not.toBe('Молоко — дорогой')
      expect(p.ru, p.ru).not.toMatch(/— очень\?|— очень$/)
    }
  })

  it('«Me gustan las leches» — не генерируется, «Me gusta la leche» — да', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-gustar-np')!
    const phrases = enumerateTemplate(t, ALL, 0, 50_000).phrases
    expect(phrases.some((p) => p.es === 'Me gusta la leche')).toBe(true)
    for (const p of phrases) {
      expect(p.es, p.es).not.toMatch(/\b(leches|azúcares|arroces)\b/)
      expect(p.ru, p.ru).not.toMatch(/молоки/)
    }
  })

  it('«У господина есть мало курицы» — tener без еды и музыки', () => {
    expect(verbObjCompatible(w('v-tener'), w('n-pollo'))).toBe(false)
    expect(verbObjCompatible(w('v-tener'), w('n-musica'))).toBe(false)
    expect(verbObjCompatible(w('v-tener'), w('n-tiempo'))).toBe(true)
    expect(verbObjCompatible(w('v-tener'), w('n-familia'))).toBe(true)
    const t = TEMPLATES.find((x) => x.id === 't-pron-tener-noun')!
    const { phrases, total } = enumerateTemplate(t, ALL, 0, 20_000)
    expect(phrases.length, 'перечисление = подсчёт').toBe(total)
    for (const p of phrases) {
      expect(p.es, p.es).not.toMatch(/pollo|carne|leche|comida|música|vida/)
    }
    expect(phrases.some((p) => p.ru.startsWith('У меня есть время'))).toBe(true)
    expect(phrases.some((p) => p.ru.startsWith('У меня есть семья'))).toBe(true)
  })

  it('«У неё есть три отца» — числа только с «безопасными» существительными', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-tener-num')!
    const { phrases, total } = enumerateTemplate(t, ALL, 0, 20_000)
    expect(phrases.length, 'перечисление = подсчёт').toBe(total)
    for (const p of phrases) {
      expect(p.es, p.es).not.toMatch(/\b(padres|madres|abuelos|abuelas)\b/)
      expect(p.es, p.es).not.toMatch(/dineros|ropas/)
    }
    expect(phrases.some((p) => p.es === 'Ella tiene dos hermanos')).toBe(true)
    expect(phrases.some((p) => p.ru === 'У меня есть две кровати')).toBe(true)
  })

  it('«Ты даёшь быструю фотографию» — быстрый не описывает фотографию', () => {
    expect(adjSemCompatible(w('a-rapido'), w('n-foto'))).toBe(false)
    expect(adjSemCompatible(w('a-lento'), w('n-foto'))).toBe(false)
    expect(adjSemCompatible(w('a-rapido'), w('n-carro'))).toBe(true)
    expect(adjSemCompatible(w('a-rapido'), w('n-hombre'))).toBe(true)
    expect(verbObjCompatible(w('v-dar'), w('n-mesa'))).toBe(false)
    expect(verbObjCompatible(w('v-dar'), w('n-foto'))).toBe(true)
  })

  it('«У тебя есть лёгкая кровать?» — fácil/difícil не с предметами', () => {
    expect(adjSemCompatible(w('a-facil'), w('n-cama'))).toBe(false)
    expect(adjSemCompatible(w('a-dificil'), w('n-leche'))).toBe(false)
    expect(adjSemCompatible(w('a-facil'), w('n-problema'))).toBe(true)
    expect(adjSemCompatible(w('a-dificil'), w('n-tiempo'))).toBe(true)
    expect(adjSemCompatible(w('a-dificil'), w('n-vida'))).toBe(true)
    expect(adjSemCompatible(w('a-barato'), w('n-amor'))).toBe(false)
    expect(adjSemCompatible(w('a-barato'), w('n-vida'))).toBe(true)
  })

  it('«Una maestra ve a la maestra» — подлежащее ≠ дополнение, подсчёт точен', () => {
    const t = TEMPLATES.find((x) => x.id === 't-noun-v-person')!
    const { phrases, total } = enumerateTemplate(t, ALL, 0, 500_000)
    expect(phrases.length, 'перечисление = подсчёт').toBe(total)
    expect(total).toBe(countTemplate(t, ALL))
    let checked = 0
    walkFills(t, ALL, (fill) => {
      const s = fill['s#noun'] as Word
      const o = fill['o#noun'] as Word
      expect(s.id, `${s.es} × ${o.es}`).not.toBe(o.id)
      checked++
    }, { maxLeaves: 600_000 })
    expect(checked).toBeGreaterThan(1000)
  })

  it('«Молоко — трудное» — ser+прилагательное согласован по смыслу', () => {
    const t = TEMPLATES.find((x) => x.id === 't-noun-ser-adj')!
    const { phrases, total } = enumerateTemplate(t, ALL, 0, 100_000)
    expect(phrases.length, 'перечисление = подсчёт').toBe(total)
    expect(total).toBe(countTemplate(t, ALL))
    for (const p of phrases) {
      expect(p.ru, p.ru).not.toBe('Молоко — трудное')
      expect(p.ru, p.ru).not.toBe('Кровать — лёгкая')
      expect(p.ru, p.ru).not.toBe('Деньги — лёгкие')
    }
    expect(phrases.some((p) => p.ru === '(Известное) молоко — вкусное')).toBe(true)
    expect(phrases.some((p) => p.ru === '(Известная) кровать — новая')).toBe(true)
    expect(phrases.some((p) => p.ru === '(Известное) время — трудное')).toBe(true)
  })

  it('«Я — дешёвый» — местоимение + качественное прилагательное согласован по смыслу', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-ser-adj')!
    const { phrases } = enumerateTemplate(t, ALL, 0, 5_000)
    for (const p of phrases) {
      expect(p.ru, p.ru).not.toMatch(/— (дешёв|лёгк|трудн|горяч|холодн|сладк|бел|чёрн|красн|зелён|син|жёлт)/)
    }
    expect(phrases.some((p) => p.ru === 'Я — молодой')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Молоко — трудное')).toBe(false)
  })

  it('наречия: «Они всегда происхожу» — pasar исключён из местоименных пулов', () => {
    for (const id of ['t-pron-v-adverb', 't-pron-v-adverb2', 't-pron-adv-no-v', 't-pron-tampoco-v', 't-pron-nunca-v', 't-qw-cuando', 't-qw-porque', 't-qw-quien']) {
      const t = TEMPLATES.find((x) => x.id === id)!
      const { phrases } = enumerateTemplate(t, ALL, 0, 20_000)
      for (const p of phrases) {
        expect(p.ru, `${id}: ${p.ru}`).not.toMatch(/происхож/)
      }
    }
  })

  it('estar+герундий и образ действия: без «Estoy teniendo», «Ser bien»', () => {
    const ger = TEMPLATES.find((x) => x.id === 't-pron-estar-gerund')!
    const { phrases } = enumerateTemplate(ger, ALL, 0, 30_000)
    for (const p of phrases) {
      expect(p.es, p.es).not.toMatch(/teniendo|queriendo|pudiendo/)
      expect(p.es, p.es).not.toMatch(/^\w+ está (teniendo|queriendo)/)
    }
    expect(phrases.some((p) => p.es === 'Yo estoy comiendo pan')).toBe(true)

    const man = TEMPLATES.find((x) => x.id === 't-pron-v-manner')!
    const manPhrases = enumerateTemplate(man, ALL, 0, 20_000).phrases
    for (const p of manPhrases) {
      expect(p.es, p.es).not.toMatch(/\b(soy|eres|es|somos|son) (bien|mal|despacio|rápido|juntos)\b/)
      expect(p.es, p.es).not.toMatch(/\b(se|sé) (bien|mal)\b/)
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
    expect(phrases.some((p) => p.ru === 'Они (муж.) уже не работают')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Они (муж.) ещё не работают')).toBe(true)
    for (const p of phrases) expect(p.kind).toBe('neg')
  })

  it('«Ellos tampoco trabajan» — отрицание для también', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-tampoco-v')!
    const { phrases } = enumerateTemplate(t, ALL, 0, 10_000)
    expect(phrases.some((p) => p.es === 'Ellos tampoco trabajan')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Они (муж.) тоже не работают')).toBe(true)
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

describe('Переходный глагол требует дополнения', () => {
  // «Tú no conoces bien» неполно: conocer (и все переходные, и модальные,
  // и pensar) без объекта «повисает». Голые оси — только полный без
  // дополнения набор: «Tú hablas bien», «Ya entiendo», «Nunca llegas»
  const NEED_OBJ = new Set([
    // переходные: инфинитивы и личные формы (в голых осях глагол — последнее слово)
    'tener', 'tengo', 'tienes', 'tiene', 'tienen',
    'hacer', 'hago', 'haces', 'hace', 'hacen',
    'dar', 'doy', 'das', 'da', 'dan',
    'ver', 'veo', 'ves', 've', 'ven',
    'decir', 'digo', 'dices', 'dice', 'dicen',
    'saber', 'sé', 'sabes', 'sabe', 'saben',
    'querer', 'quiero', 'quieres', 'quiere', 'quieren',
    'conocer', 'conozco', 'conoces', 'conoce', 'conocen',
    'buscar', 'busco', 'buscas', 'busca', 'buscan',
    'esperar', 'espero', 'esperas', 'espera', 'esperan',
    'recordar', 'recuerdo', 'recuerdas', 'recuerda', 'recuerdan',
    'poner', 'pongo', 'pones', 'pone', 'ponen',
    'llevar', 'llevo', 'llevas', 'lleva', 'llevan',
    'dejar', 'dejo', 'dejas', 'deja', 'dejan',
    'pagar', 'pago', 'pagas', 'paga', 'pagar',
    'pedir', 'pido', 'pides', 'pide', 'piden',
    'seguir', 'sigo', 'sigues', 'sigue', 'siguen',
    'abrir', 'abro', 'abres', 'abre', 'abren',
    'cerrar', 'cierro', 'cierras', 'cierra', 'cierran',
    'empezar', 'empiezo', 'empiezas', 'empieza', 'empiezan',
    'terminar', 'termino', 'terminas', 'termina', 'terminan',
    'usar', 'uso', 'usas', 'usa', 'usan',
    'aprender', 'aprendo', 'aprendes', 'aprende', 'aprenden',
    'ayudar', 'ayudo', 'ayudas', 'ayuda', 'ayudan',
    'llamar', 'llamo', 'llamas', 'llama', 'llaman',
    'creer', 'creo', 'crees', 'cree', 'creen',
    // модальные: «Siempre puedo» / «Voy a poder» — тоже неполны
    'poder', 'puedo', 'puedes', 'puede', 'pueden',
    'necesitar', 'necesito', 'necesitas', 'necesita', 'necesitan',
  ])

  /** Шаблоны, где глагол/инфинитив стоит БЕЗ дополнения (последнее слово) */
  const BARE_TEMPLATES = [
    't-pron-v-adverb', 't-pron-v-adverb2', 't-pron-adv-no-v',
    't-pron-tampoco-v', 't-pron-nunca-v', 't-pron-v-manner',
    't-qw-cuando', 't-qw-porque', 't-qw-quien',
    't-pron-modal-inf', 't-pron-tener-que-inf', 't-pron-ir-a-inf', 't-hay-que-inf',
  ]

  it('голые оси содержат только глаголы, полные без дополнения', () => {
    for (const v of [...MANNER_VERBS, ...PRONOUN_CONJ_VERBS]) {
      expect(BARE_OK_VERBS.some((b) => b.id === v.id), v.id).toBe(true)
    }
  })

  it('ни в одном голом шаблоне нет переходного/модального глагола без объекта', () => {
    for (const id of BARE_TEMPLATES) {
      const t = TEMPLATES.find((x) => x.id === id)!
      const { phrases } = enumerateTemplate(t, ALL, 0, 40_000)
      expect(phrases.length, id).toBeGreaterThan(0)
      for (const p of phrases) {
        const last = p.es.replace(/[¿?¡!.]/g, '').trim().split(/\s+/).pop()!.toLowerCase()
        expect(NEED_OBJ.has(last), `${id}: ${p.es}`).toBe(false)
      }
    }
  })

  it('«Tú hablas bien» есть, «Tú no conoces bien» — нет', () => {
    const man = TEMPLATES.find((x) => x.id === 't-pron-v-manner')!
    const phrases = enumerateTemplate(man, ALL, 0, 20_000).phrases
    expect(phrases.some((p) => p.es === 'Tú hablas bien')).toBe(true)
    expect(phrases.some((p) => p.es === 'Tú no conoces bien')).toBe(false)
    expect(phrases.some((p) => p.es === 'Yo no veo bien')).toBe(false)
  })

  it('инфинитив после модального: «Quiero comer» есть, «Quiero conocer» — нет', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-modal-inf')!
    const phrases = enumerateTemplate(t, ALL, 0, 20_000).phrases
    expect(phrases.some((p) => p.es === 'Yo quiero comer')).toBe(true)
    expect(phrases.some((p) => p.es === 'Yo quiero conocer')).toBe(false)
    expect(phrases.some((p) => p.es === 'Yo puedo saber')).toBe(false)
  })

  it('ir a / tener que / hay que: «Voy a comer» есть, «Voy a poder» — нет', () => {
    const irA = enumerateTemplate(TEMPLATES.find((x) => x.id === 't-pron-ir-a-inf')!, ALL, 0, 20_000).phrases
    expect(irA.some((p) => p.es === 'Yo voy a comer')).toBe(true)
    expect(irA.some((p) => p.es === 'Yo voy a poder')).toBe(false)
    expect(irA.some((p) => p.es === 'Yo voy a conocer')).toBe(false)

    const hayQue = enumerateTemplate(TEMPLATES.find((x) => x.id === 't-hay-que-inf')!, ALL, 0, 20_000).phrases
    expect(hayQue.some((p) => p.es === 'Hay que trabajar')).toBe(true)
    expect(hayQue.some((p) => p.es === 'Hay que saber')).toBe(false)
  })
})
