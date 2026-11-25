// ============================================================
// test/unit/engine.spec.ts — комбинаторный движок фраз:
// подсчёт, перечисление, рендеринг испанского и русского.
// ============================================================

import { describe, it, expect } from 'vitest'
import { allTemplates } from '../../shared/phrases/templates'
import { countTemplate, enumerateTemplate, sampleFill, gainsTemplate, walkFills, bareAllowed, detCompatible } from '../../shared/phrases/engine'
import { ruGenitive, ruPlural } from '../../shared/phrases/ru-morph'
import { ALL_WORDS, getWord } from '../../shared/data/words'
import type { Fill, Template } from '../../shared/phrases/schema'

const ALL = new Set(ALL_WORDS.map((w) => w.id))
const TEMPLATES = allTemplates()

/** Множество слов после первых N уроков */
function lessons(n: number): Set<string> {
  return new Set(ALL_WORDS.filter((w) => w.lesson <= n).map((w) => w.id))
}

describe('Подсчёт и перечисление', () => {
  it('полный словарь даёт миллионы фраз', () => {
    let total = 0
    for (const t of TEMPLATES) total += countTemplate(t, ALL)
    expect(total).toBeGreaterThan(1_000_000)
  })

  it('подсчёт совпадает с фактическим перечислением', () => {
    // Для трёх шаблонов: enumerate до конца == count
    for (const id of ['t-pron-estar-state', 't-v-lang' in Object ? 't-pron-v-lang' : 't-pron-v-lang', 't-hace-tiempo']) {
      const t = TEMPLATES.find((x) => x.id === id)!
      const { phrases, total } = enumerateTemplate(t, ALL, 0, 200_000)
      expect(phrases.length).toBe(total)
      expect(total).toBe(countTemplate(t, ALL))
    }
  })

  it('перечисление детерминировано (две страницы одинаковы)', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-tener-noun')!
    const page1 = enumerateTemplate(t, ALL, 0, 25).phrases.map((p) => p.key)
    const page2 = enumerateTemplate(t, ALL, 0, 25).phrases.map((p) => p.key)
    expect(page1).toEqual(page2)
  })

  it('ключи фраз уникальны в пределах страницы', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-v-do')!
    const { phrases } = enumerateTemplate(t, ALL, 0, 500)
    expect(new Set(phrases.map((p) => p.key)).size).toBe(phrases.length)
  })

  it('sampleFill даёт заполнение, рендер которого не содержит undefined', () => {
    for (const t of TEMPLATES) {
      const fill = sampleFill(t, ALL)
      if (!fill) continue
      for (const kind of t.variants) {
        const es = t.render(fill, kind)
        const ru = t.ru(fill, kind)
        expect(es.includes('undefined'), t.id).toBe(false)
        expect(ru.includes('undefined'), t.id).toBe(false)
        expect(es.includes('? '), t.id).toBe(false)
      }
    }
  })

  it('прогрессия: после 3 уроков фразы уже есть, после 13 — десятки тысяч', () => {
    // Вопросительные слова — урок 3 (curriculum.ts): «¿Qué es?»,
    // «¿Cómo estás?» собираются сразу после первых уроков.
    // Порог — реальный объём БЕЗ абсурдных сочетаний (читаю стол,
    // есть музыка, три отца): точность важнее «красивых» миллионов
    const after3 = TEMPLATES.reduce((acc, t) => acc + countTemplate(t, lessons(3)), 0)
    const after13 = TEMPLATES.reduce((acc, t) => acc + countTemplate(t, lessons(13)), 0)
    expect(after3).toBeGreaterThan(0)
    expect(after13).toBeGreaterThan(15_000)
    expect(after13).toBeLessThan(after3 * 1_000_000)
  })

  it('требования шаблонов: без ser фраз ser/estar нет', () => {
    const withoutSer = new Set([...ALL].filter((id) => id !== 'v-ser'))
    const serProf = TEMPLATES.find((t) => t.id === 't-pron-ser-prof')!
    expect(countTemplate(serProf, withoutSer)).toBe(0)
  })
})

describe('Испанский рендеринг', () => {
  const t = (id: string) => TEMPLATES.find((x) => x.id === id)!

  it('отрицание: «no» перед глаголом', () => {
    const { phrases } = enumerateTemplate(t('t-pron-estar-place'), ALL, 0, 200)
    const negs = phrases.filter((p) => p.kind === 'neg')
    expect(negs.length).toBeGreaterThan(0)
    for (const p of negs) expect(p.es.toLowerCase()).toContain(' no ')
  })

  it('вопросы обёрнуты в ¿…?', () => {
    const { phrases } = enumerateTemplate(t('t-pron-v-prep-np'), ALL, 0, 300)
    const q = phrases.filter((p) => p.kind === 'yesno')
    expect(q.length).toBeGreaterThan(0)
    for (const p of q) {
      expect(p.es.startsWith('¿')).toBe(true)
      expect(p.es.endsWith('?')).toBe(true)
    }
  })

  it('личное «a» и al-contraction: Veo a la maestra, Voy al banco', () => {
    const { phrases } = enumerateTemplate(t('t-pron-v-person'), ALL, 0, 300)
    const withA = phrases.filter((p) => p.es.includes(' a '))
    expect(withA.length).toBeGreaterThan(0)
    const verbPrep = enumerateTemplate(t('t-pron-v-prep-np'), ALL, 0, 3000).phrases
    expect(verbPrep.some((p) => p.es.includes(' al '))).toBe(true)
    expect(verbPrep.some((p) => p.es.includes(' del '))).toBe(true)
  })

  it('gustar: gusta/gustan по числу', () => {
    const { phrases } = enumerateTemplate(t('t-pron-gustar-np'), ALL, 0, 2000)
    expect(phrases.some((p) => p.es.includes(' gusta '))).toBe(true)
    expect(phrases.some((p) => p.es.includes(' gustan '))).toBe(true)
  })

  it('наличие артиклей в verbPrep (в школу не «в школа»)', () => {
    const { phrases } = enumerateTemplate(t('t-pron-v-prep-np'), ALL, 0, 200)
    for (const p of phrases) {
      // «a escuela» без артикля — ошибка (кроме casa)
      expect(p.es.match(/ (a|en|de) (escuela|tienda|banco)\b/), p.es).toBeNull()
    }
  })
})

describe('Русский рендеринг', () => {
  const t = (id: string) => TEMPLATES.find((x) => x.id === id)!

  it('tener: «У меня есть…» и родительный в отрицании', () => {
    const { phrases } = enumerateTemplate(t('t-pron-tener-noun'), ALL, 0, 500)
    expect(phrases.some((p) => p.ru.startsWith('У меня есть'))).toBe(true)
    expect(phrases.some((p) => p.ru.startsWith('У меня нет '))).toBe(true)
    // винительный/родительный: «У меня нет стола», не «нет стол»
    const negs = phrases.filter((p) => p.kind === 'neg')
    for (const p of negs) {
      expect(p.ru.endsWith('нет'), p.ru).toBe(false)
    }
    // пара ES/RU без количества: «У меня нет времени» ↔ «Yo no tengo tiempo»,
    // а не «Yo no tengo poco/mucho tiempo» (жалоба пользователя)
    const noTiempo = phrases.filter((p) => p.ru === 'У меня нет времени')
    expect(noTiempo.length, 'фраза «У меня нет времени» существует').toBeGreaterThan(0)
    for (const p of noTiempo) {
      expect(p.es, p.es).toMatch(/no tengo tiempo$/i)
    }
  })

  it('hace-tiempo: «Два года назад», «Две недели назад»', () => {
    const { phrases } = enumerateTemplate(t('t-hace-tiempo'), ALL, 0, 20)
    expect(phrases.some((p) => p.ru === 'Два года назад')).toBe(true)
    expect(phrases.some((p) => p.ru === 'Две недели назад')).toBe(true)
  })

  it('gustar: «Мне нравится/нравятся»', () => {
    const { phrases } = enumerateTemplate(t('t-pron-gustar-np'), ALL, 0, 2000)
    expect(phrases.some((p) => p.ru.includes(' нравится '))).toBe(true)
    expect(phrases.some((p) => p.ru.includes(' нравятся '))).toBe(true)
  })

  it('переводы не содержат служебных заглушек', () => {
    for (const t of TEMPLATES) {
      const { phrases } = enumerateTemplate(t, ALL, 0, 300)
      for (const p of phrases) {
        expect(p.ru.includes('? ') || p.ru.includes('? ') === false).toBe(true)
        expect(p.ru, p.es).not.toContain('? ')
      }
    }
  })

  it('языки: «по-испански» и «испанский»', () => {
    const { phrases } = enumerateTemplate(t('t-pron-v-lang'), ALL, 0, 100)
    expect(phrases.some((p) => p.ru.includes('по-испански'))).toBe(true)
    expect(phrases.some((p) => p.ru.includes('учу испанский') || p.ru.includes('изучаю') || p.ru.includes('учу'))).toBe(true)
  })

  it('формы русского глагола: «Вы говорите» (не «говорят»)', () => {
    const { phrases } = enumerateTemplate(t('t-pron-v-lang'), ALL, 0, 100)
    const usted = phrases.find((p) => p.es.startsWith('Usted habla'))
    expect(usted?.ru).toBe('Вы говорите по-испански')
  })
})

describe('Проекции «выучишь X → +Y»', () => {
  it('прирост по слову = count(S∪X) − count(S)', () => {
    // Проверяем на нескольких шаблонах и словах
    const base = lessons(6)
    const templates = TEMPLATES.slice(0, 12)
    for (const wordId of ['n-libro', 'a-blanco', 'prep-en', 'v-leer']) {
      let delta = 0
      for (const t of templates) delta += gainsTemplate(t, base).get(wordId) ?? 0
      const extended = new Set([...base, wordId])
      let direct = 0
      for (const t of templates) {
        direct += countTemplate(t, extended) - countTemplate(t, base)
      }
      expect(delta, wordId).toBe(direct)
    }
  })

  it('неизученные слова дают прирост, изученные — нет', () => {
    const base = lessons(6)
    const gains = gainsTemplate(TEMPLATES.find((x) => x.id === 't-pron-v-do')!, base)
    for (const [wordId, gain] of gains) {
      expect(base.has(wordId), wordId).toBe(false)
      expect(gain).toBeGreaterThan(0)
    }
  })
})

describe('Согласование числа в ser-шаблоне', () => {
  /** Ручное заполнение t-pron-ser-prof: местоимение + существительное */
  function profFill(pronId: string, nounId: string): Fill {
    return { s: getWord(pronId), n: getWord(nounId) } as Fill
  }

  it('мн.ч. подлежащего согласует сказуемое в ES и RU', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-ser-prof')!
    // Ellos son hermanas → «Они — сёстры» (раньше: «Ellos son hermana» / «Они — сестра»)
    const el = profFill('p-ellos', 'n-hermana')
    expect(t.render(el, 'aff')).toBe('Ellos son hermanas')
    expect(t.ru(el, 'aff')).toBe('Они — сёстры')
    // Nosotros somos amigos → «Мы — друзья»
    const nos = profFill('p-nosotros', 'n-amigo')
    expect(t.render(nos, 'aff')).toBe('Nosotros somos amigos')
    expect(t.ru(nos, 'aff')).toBe('Мы — друзья')
  })

  it('ед.ч. остаётся в единственном числе', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-ser-prof')!
    const ella = profFill('p-ella', 'n-hermana')
    expect(t.render(ella, 'aff')).toBe('Ella es hermana')
    expect(t.ru(ella, 'aff')).toBe('Она — сестра')
    // отрицание и вопрос тоже согласованы
    expect(t.ru(profFill('p-ellos', 'n-hermano'), 'neg')).toBe('Они не братья')
    expect(t.ru(profFill('p-ellos', 'n-hermano'), 'yesno')).toBe('Они — братья?')
  })
})

describe('tener в глагольных шаблонах', () => {
  it('после «есть» — именительный падеж (не винительный)', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-v-do')!
    const fill = {
      s: getWord('p-el'),
      v: getWord('v-tener'),
      'o#noun': getWord('n-idea'),
      'o#num': 'sg',
      'o#det': getWord('d-la'),
      'o#adj': null,
    } as unknown as Fill
    expect(t.ru(fill, 'aff')).toBe('У него есть идея')
    expect(t.ru(fill, 'yesno')).toBe('У него есть идея?')
  })

  it('м.р. на -а/-я: родительный и мн.ч. («мужчины», «учителя»)', () => {
    const hombre = getWord('n-hombre')
    const maestro = getWord('n-maestro')
    expect(ruGenitive(hombre)).toBe('мужчины')
    expect(ruPlural(hombre)).toBe('мужчины')
    expect(ruGenitive(maestro)).toBe('учителя')
    expect(ruPlural(maestro)).toBe('учителя')
  })
})


describe('Артикли: правила употребления', () => {
  const word = (id: string) => ALL_WORDS.find((w) => w.id === id)!

  it('голая форма: неисчисляемые да, счётные абстрактные нет', () => {
    // «Tengo dinero/tiempo», «Hay comida», «Como pan» — без артикля
    expect(bareAllowed(word('n-dinero'), 'sg')).toBe(true)
    expect(bareAllowed(word('n-tiempo'), 'sg')).toBe(true)
    expect(bareAllowed(word('n-pan'), 'sg')).toBe(true)
    expect(bareAllowed(word('n-agua'), 'sg')).toBe(true)
    expect(bareAllowed(word('n-casa'), 'sg')).toBe(true)
    expect(bareAllowed(word('n-ropa'), 'sg')).toBe(true)
    // счётные абстрактные — всегда с артиклем: «tengo un problema»,
    // «hay una idea», но не «tengo problema», «hay idea»
    expect(bareAllowed(word('n-problema'), 'sg')).toBe(false)
    expect(bareAllowed(word('n-pregunta'), 'sg')).toBe(false)
    expect(bareAllowed(word('n-idea'), 'sg')).toBe(false)
    expect(bareAllowed(word('n-historia'), 'sg')).toBe(false)
    expect(bareAllowed(word('n-dia'), 'sg')).toBe(false)
    // во мн.ч. голой формы нет вовсе
    expect(bareAllowed(word('n-dinero'), 'pl')).toBe(false)
  })

  it('неисчисляемые не сочетаются с un/una, но сочетаются с mucho в ед.ч.', () => {
    const ropa = word('n-ropa')
    const dinero = word('n-dinero')
    expect(detCompatible(getWord('d-un'), ropa, 'sg')).toBe(false)
    expect(detCompatible(getWord('d-una'), ropa, 'sg')).toBe(false)
    expect(detCompatible(getWord('d-unos'), ropa, 'pl')).toBe(false)
    expect(detCompatible(getWord('d-un'), dinero, 'sg')).toBe(false)
    expect(detCompatible(getWord('d-la'), ropa, 'sg')).toBe(true)
    expect(detCompatible(getWord('d-mucho'), ropa, 'sg')).toBe(true)
    // «muchas ropas» — нет (только ед.ч. с количеством)
    expect(detCompatible(getWord('d-mucho'), ropa, 'pl')).toBe(false)
    // agua — массовое (как leche): «Hay agua», а не «Hay un agua».
    // Формально «un agua» допустимо по RAE (порция), но в приложении
    // вода учится как вещество; определённый артикль остаётся: «el agua»
    const agua = word('n-agua')
    expect(detCompatible(getWord('d-un'), agua, 'sg')).toBe(false)
    expect(detCompatible(getWord('d-una'), agua, 'sg')).toBe(false)
    expect(detCompatible(getWord('d-el'), agua, 'sg')).toBe(true)
    // «No hay una comida» — comida массовое «еда» (жалоба пользователя)
    expect(detCompatible(getWord('d-una'), word('n-comida'), 'sg')).toBe(false)
    expect(detCompatible(getWord('d-unos'), word('n-comida'), 'pl')).toBe(false)
    expect(detCompatible(getWord('d-la'), word('n-comida'), 'sg')).toBe(true)
    expect(detCompatible(getWord('d-mucho'), word('n-comida'), 'sg')).toBe(true)
  })

  it('hay: без языков и без голых счётных абстрактных', () => {
    const t = TEMPLATES.find((x) => x.id === 't-hay-noun')!
    const seen: string[] = []
    walkFills(t, ALL, (fill, kind) => seen.push(t.render(fill, kind)), { maxLeaves: 100_000 })
    const langs = ['español', 'inglés', 'ruso']
    for (const es of seen) {
      const low = es.toLowerCase()
      for (const l of langs) expect(low, es).not.toContain(`hay ${l}`)
      // голые счётные: «hay historia», «hay idea» — нет
      expect(low, es).not.toMatch(/\bhay (historia|idea|pregunta|problema|palabra|respuesta)\b/)
      // «hay una comida» — нет: comida — массовое «еда» (жалоба пользователя)
      expect(low, es).not.toMatch(/\bhay una comida\b/)
    }
    // при этом корректные голые формы остаются: «Hay comida/dinero/tiempo»
    expect(seen.some((es) => /\bhay comida\b/i.test(es))).toBe(true)
    expect(seen.some((es) => /\bhay dinero\b/i.test(es))).toBe(true)
    expect(seen.some((es) => /\bhay una historia\b/i.test(es))).toBe(true)
  })

  it('tener: «Tengo un problema», но не «Tengo problema»; «Tengo ropa» без артикля', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-tener-noun')!
    const seen: string[] = []
    walkFills(t, ALL, (fill, kind) => seen.push(t.render(fill, kind)), { maxLeaves: 100_000 })
    for (const es of seen) {
      expect(es.toLowerCase(), es).not.toMatch(/\btengo (problema|pregunta|idea|historia|respuesta)\b/)
      expect(es.toLowerCase(), es).not.toMatch(/\b(un|una) (ropa|dinero|tiempo)\b/)
      // детерминированная пара ES/RU (жалоба «нет времени» ↔ poco tiempo):
      // «много/мало» и определённый артикль с tener не сочетаем —
      // «У меня есть/нет X» отвечает ровно одна фраза
      expect(es.toLowerCase(), es).not.toMatch(/\b(mucho|mucha|poco|poca)\b/)
      expect(es.toLowerCase(), es).not.toMatch(/\b(el|la|los|las) \w/)
    }
    expect(seen.some((es) => /tengo un problema/i.test(es))).toBe(true)
    expect(seen.some((es) => /tengo ropa/i.test(es))).toBe(true)
    expect(seen.some((es) => /tengo dinero/i.test(es))).toBe(true)
    expect(seen.some((es) => /no tengo tiempo/i.test(es))).toBe(true)
  })

  it('предлоги: голая форма только у sin/casa и «sobre + тема»', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-v-prep-np')!
    const seen: string[] = []
    walkFills(t, ALL, (fill, kind) => seen.push(t.render(fill, kind)), { maxLeaves: 120_000 })
    const nouns = new Set(ALL_WORDS.filter((w) => w.pos === 'noun').flatMap((w) => [w.es.toLowerCase(), ...(w.nounPlural ? [w.nounPlural.toLowerCase()] : [])]))
    const abstract = new Set(ALL_WORDS.filter((w) => w.pos === 'noun' && w.nounClass === 'abstract').map((w) => w.es.toLowerCase()))
    const preps = ['a', 'de', 'en', 'con', 'para', 'por', 'sobre', 'antes de', 'después de']
    for (const es of seen) {
      const words = es.toLowerCase().replace(/[¿?¡!.]/g, '').split(/\s+/)
      for (let i = 0; i < words.length - 1; i++) {
        if (!preps.includes(words[i]!)) continue
        const next = words[i + 1]!
        if (!nouns.has(next)) continue // артикль/определитель/глагол — ок
        if (words[i] === 'sin') continue
        if (next === 'casa') continue
        if (words[i] === 'sobre' && abstract.has(next)) continue
        expect.fail(`голая форма после предлога: «${es}»`)
      }
    }
    // идиоматичные голые формы работают (sin в шаблонах не участвует —
    // ни один глагол его не требует, поэтому «sin …» тут не проверяем)
    expect(seen.some((es) => / a casa| en casa| de casa/i.test(es))).toBe(true)
    expect(seen.some((es) => /sobre m[uú]sica/i.test(es))).toBe(true)
    // «salir de la escuela» / «voy al banco» — с определителем
    expect(seen.some((es) => /de la escuela/i.test(es))).toBe(true)
  })
})
