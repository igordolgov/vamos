// ============================================================
// test/unit/article-hints.spec.ts — подсказки артиклей и правки
// «странных выражений» из жалоб пользователя.
//
// 1. «El maestro quiere un pan pequeño» и «Un maestro quiere el pan pequeño»
//    отвечали одному и тому же промпту — теперь el/la → «(конкретный)»,
//    un/una → «(какой-то)» на месте артикля.
// 2. «Я нуждаюсь стол» → «Мне нужна машина» (necesitar + NP).
// 3. «Они не учатся русский язык» → «Они не изучают русский язык» (estudiar).
// 4. «Они платят хлеб» → «Они платят за хлеб» (pagar).
// 5. «Что ты нуждаешься?» → «Что тебе нужно?» (¿Qué necesitas?).
// 6. «Сестра — семья» больше не генерируется (familia — не профессия).
// 7. «Учительници» → «учительницы» (ц → ы в окончаниях).
// 8. «Какая машина?» → «Которая машина?» (¿Cuál es el carro? — выбор).
// 9. «Маленькая соль», «горячее окно» — коллокации.
// ============================================================

import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../shared/phrases/templates'
import { enumerateTemplate, walkFills } from '../../shared/phrases/engine'
import { getWord, ALL_WORDS } from '../../shared/data/words'
import { ruPlural } from '../../shared/phrases/ru-morph'
import type { Fill } from '../../shared/types'

const ALL = new Set(ALL_WORDS.map((w) => w.id))
const w = (id: string) => getWord(id)
const T = (id: string) => {
  const t = TEMPLATES.find((x) => x.id === id)
  expect(t, `шаблон ${id} существует`).toBeTruthy()
  return t!
}

describe('Подсказки артиклей в русском промпте', () => {
  it('«El maestro quiere un pan pequeño» → «(Конкретный) учитель хочет (какой-то) маленький хлеб»', () => {
    const t = T('t-noun-v-do-adj')
    const fill = {
      v: w('v-querer'),
      's#noun': w('n-maestro'), 's#num': 'sg', 's#det': w('d-el'), 's#adj': null,
      'o#noun': w('n-pan'), 'o#num': 'sg', 'o#det': w('d-un'), 'o#adj': w('a-pequeno'),
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('El maestro quiere un pan pequeño')
    expect(t.ru(fill, 'aff')).toBe('(Конкретный) учитель хочет (какой-то) маленький хлеб')
  })

  it('«Un maestro quiere el pan pequeño» → «(Какой-то) учитель хочет (конкретный) маленький хлеб»', () => {
    const t = T('t-noun-v-do-adj')
    const fill = {
      v: w('v-querer'),
      's#noun': w('n-maestro'), 's#num': 'sg', 's#det': w('d-un'), 's#adj': null,
      'o#noun': w('n-pan'), 'o#num': 'sg', 'o#det': w('d-el'), 'o#adj': w('a-pequeno'),
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Un maestro quiere el pan pequeño')
    expect(t.ru(fill, 'aff')).toBe('(Какой-то) учитель хочет (конкретный) маленький хлеб')
  })

  it('падеж подсказки: «Veo a una maestra» → «вижу (какую-то) учительницу»', () => {
    const t = T('t-pron-v-person')
    const fill = {
      s: w('p-yo'), v: w('v-ver'),
      'o#noun': w('n-maestra'), 'o#num': 'sg', 'o#det': w('d-una'), 'o#adj': null,
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Yo veo a una maestra')
    expect(t.ru(fill, 'aff')).toBe('Я вижу (какую-то) учительницу')
  })

  it('мн.ч. подсказки: «Unos padres» → «(Какие-то) отцы»', () => {
    const t = T('t-noun-v-do')
    const fill = {
      v: w('v-comer'),
      's#noun': w('n-padre'), 's#num': 'pl', 's#det': w('d-unos'), 's#adj': null,
      'o#noun': w('n-comida'), 'o#num': 'sg', 'o#det': null, 'o#adj': null,
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Unos padres comen comida')
    expect(t.ru(fill, 'aff')).toBe('(Какие-то) отцы едят еду')
  })

  it('предлог: «Trabajo en una escuela» → «работаю в (какой-то) школе»', () => {
    const t = T('t-pron-v-prep-np')
    const fill = {
      s: w('p-yo'), v: w('v-trabajar'), prep: w('prep-en'),
      'o#noun': w('n-escuela'), 'o#num': 'sg', 'o#det': w('d-una'), 'o#adj': null,
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Yo trabajo en una escuela')
    expect(t.ru(fill, 'aff')).toBe('Я работаю в (какой-то) школе')
  })

  it('tener — детерминированная пара БЕЗ подсказки («У меня есть семья»)', () => {
    const t = T('t-pron-tener-noun')
    const { phrases, total } = enumerateTemplate(t, ALL, 0, 20_000)
    expect(phrases.length).toBe(total)
    expect(phrases.some((p) => p.ru.startsWith('У меня есть семья'))).toBe(true)
    for (const p of phrases) {
      expect(p.ru, p.ru).not.toMatch(/\((конкретн|как[а-яё]*-то)/)
    }
  })

  it('casa — голая форма без подсказки («Я дома», не «Я дома (конкретном)»)', () => {
    const t = T('t-pron-estar-place')
    const fill = {
      s: w('p-yo'),
      'o#noun': w('n-casa'), 'o#num': 'sg', 'o#det': w('d-el'), 'o#adj': null,
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Yo estoy en casa')
    expect(t.ru(fill, 'aff')).toBe('Я дома')
  })

  it('gustar: «(вообще)» у el/la остаётся', () => {
    const t = T('t-pron-gustar-np')
    const fill = {
      io: w('p-me'),
      'o#noun': w('n-arroz'), 'o#num': 'sg', 'o#det': w('d-el'), 'o#adj': null,
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Me gusta el arroz')
    expect(t.ru(fill, 'aff')).toBe('Мне нравится рис (вообще)')
  })
})

describe('necesitar — «Мне нужна машина» (не «Я нуждаюсь машина»)', () => {
  const need = (noun: string, det: string | null) => ({
    s: w('p-yo'), v: w('v-necesitar'),
    'o#noun': w(noun), 'o#num': 'sg', 'o#det': det ? w(det) : null, 'o#adj': null,
  }) as unknown as Fill

  it('род/число «нужен/нужна/нужно» и «нужно много хлеба»', () => {
    const t = T('t-pron-v-do')
    expect(t.ru(need('n-mesa', 'd-un'), 'aff')).toBe('Мне нужен (какой-то) стол')
    expect(t.ru(need('n-cama', 'd-una'), 'aff')).toBe('Мне нужна (какая-то) кровать')
    expect(t.ru(need('n-tiempo', null), 'aff')).toBe('Мне нужно время')
    expect(t.ru(need('n-pan', 'd-mucho'), 'aff')).toBe('Мне нужно много хлеба')
    expect(t.ru(need('n-mesa', 'd-la'), 'neg')).toBe('Мне не нужен (конкретный) стол')
  })

  it('«¿Qué necesitas?» → «Что тебе нужно?»', () => {
    const t = T('t-qw-que')
    const fill = { v: w('v-necesitar') } as unknown as Fill
    expect(t.render(fill, 'qw')).toBe('¿Qué necesitas?')
    expect(t.ru(fill, 'qw')).toBe('Что тебе нужно?')
  })

  it('necesitar без объекта в наречных/вопросных шаблонах не генерируется', () => {
    for (const id of ['t-pron-v-adverb', 't-pron-v-adverb2', 't-qw-cuando', 't-qw-porque', 't-qw-quien']) {
      const t = T(id)
      walkFills(t, ALL, (fill, kind) => {
        expect(t.ru(fill, kind), `${id}`).not.toMatch(/нужда/)
      }, { maxLeaves: 30_000 })
    }
  })

  it('«No necesito nada» → «Мне ничего не нужно»', () => {
    const t = T('t-pron-v-nada')
    const fill = { s: w('p-yo'), v: w('v-necesitar') } as unknown as Fill
    expect(t.render(fill, 'neg')).toBe('Yo no necesito nada')
    expect(t.ru(fill, 'neg')).toBe('Мне ничего не нужно')
  })

  it('ir a / hay que — без «нуждаться»', () => {
    for (const id of ['t-pron-ir-a-inf', 't-hay-que-inf']) {
      const t = T(id)
      walkFills(t, ALL, (fill, kind) => {
        expect(t.ru(fill, kind), `${id}`).not.toMatch(/нуждаться/)
        expect(t.render(fill, kind), `${id}`).not.toMatch(/necesitar/)
      }, { maxLeaves: 20_000 })
    }
  })
})

describe('estudiar — «изучаю» с дополнением, «учусь» без', () => {
  it('«Ellos no estudian ruso» → «Они не изучают русский язык»', () => {
    const t = T('t-pron-v-lang')
    const fill = {
      s: w('p-ellos'), v: w('v-estudiar'),
      'o#noun': w('n-ruso'), 'o#num': 'sg', 'o#det': null, 'o#adj': null,
    } as unknown as Fill
    expect(t.render(fill, 'neg')).toBe('Ellos no estudian ruso')
    expect(t.ru(fill, 'neg')).toBe('Они не изучают русский язык')
  })

  it('«¿Qué estudias?» → «Что ты изучаешь?»', () => {
    const t = T('t-qw-que')
    const fill = { v: w('v-estudiar') } as unknown as Fill
    expect(t.render(fill, 'qw')).toBe('¿Qué estudias?')
    expect(t.ru(fill, 'qw')).toBe('Что ты изучаешь?')
  })

  it('без дополнения остаётся «учусь» («Yo estudio» → «Я учусь»)', () => {
    const t = T('t-pron-v-bare')
    const fill = { s: w('p-yo'), v: w('v-estudiar') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Yo estudio')
    expect(t.ru(fill, 'aff')).toBe('Я учусь')
  })
})

describe('pagar — «платить за …»', () => {
  it('«Ellos pagan pan» → «Они платят за хлеб»', () => {
    const t = T('t-noun-v-do')
    const fill = {
      v: w('v-pagar'),
      's#noun': w('n-hombre'), 's#num': 'pl', 's#det': w('d-los'), 's#adj': null,
      'o#noun': w('n-pan'), 'o#num': 'sg', 'o#det': null, 'o#adj': null,
    } as unknown as Fill
    expect(t.ru(fill, 'aff')).toBe('(Конкретные) мужчины платят за хлеб')
  })

  it('«¿Qué pagas?» больше не генерируется', () => {
    const t = T('t-qw-que')
    walkFills(t, ALL, (fill, kind) => {
      expect(t.render(fill, kind), t.render(fill, kind)).not.toMatch(/\bpagas?\b/)
    }, { maxLeaves: 30_000 })
  })
})

describe('ser-профессии — собирательные исключены', () => {
  it('«Сестра — семья», «Она — семья» больше не генерируются', () => {
    const nounT = T('t-noun-ser-prof')
    const { phrases } = enumerateTemplate(nounT, ALL, 0, 120_000)
    for (const p of phrases) {
      expect(p.ru, p.ru).not.toMatch(/— семья|не семья/)
    }
    const pronT = T('t-pron-ser-prof')
    for (const p of enumerateTemplate(pronT, ALL, 0, 120_000).phrases) {
      expect(p.ru, p.ru).not.toMatch(/семья/)
    }
    // обычные профессии работают (с подсказкой артикля подлежащего)
    const t = nounT
    const fill = {
      n: w('n-maestra'),
      's#noun': w('n-hermana'), 's#num': 'sg', 's#det': w('d-la'), 's#adj': null,
    } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('La hermana es maestra')
    expect(t.ru(fill, 'aff')).toBe('(Конкретная) сестра — учительница')
  })
})

describe('русские мн.ч. после «ц» — «ы» (не «и»)', () => {
  it('«учительницы», «улицы» (не «учительници», «улици»)', () => {
    expect(ruPlural(w('n-maestra'))).toBe('учительницы')
    expect(ruPlural(w('n-calle'))).toBe('улицы')
    // шипящие и к/г/х по-прежнему «и»
    expect(ruPlural(w('n-nina'))).toBe('девочки')
    expect(ruPlural(w('n-libro'))).toBe('книги')
  })

  it('«Они — учительницы» во фразах', () => {
    const t = T('t-pron-ser-prof')
    const { phrases } = enumerateTemplate(t, ALL, 0, 120_000)
    expect(phrases.some((p) => p.ru === 'Они — учительницы')).toBe(true)
  })
})

describe('cuál es — «Которая машина?» для конкретного', () => {
  it('конкретное → «который», абстрактное → «какой»', () => {
    const t = T('t-qw-cual-es')
    const { phrases } = enumerateTemplate(t, ALL, 0, 120_000)
    expect(phrases.some((p) => p.es === '¿Cuál es el carro?' && p.ru === 'Которая машина?')).toBe(true)
    expect(phrases.some((p) => p.es === '¿Cuál es la respuesta?' && p.ru === 'Какой ответ?')).toBe(true)
    for (const p of phrases) {
      expect(p.ru, p.ru).not.toBe('Какая машина?')
    }
  })
})

describe('коллокации — абсурдные пары исключены', () => {
  it('«маленькая соль», «маленькое мясо», «горячее окно» не генерируются', () => {
    expect(w('a-pequeno').adj).toBeTruthy()
    const t = T('t-pron-v-do-adj')
    walkFills(t, ALL, (fill, kind) => {
      const ru = t.ru(fill, kind)
      expect(ru, ru).not.toMatch(/маленьк[а-яё]+ (соль|мясо)/)
      expect(ru, ru).not.toMatch(/(горяч|холодн)[а-яё]+ окно/)
    }, { maxLeaves: 150_000 })
  })
})
