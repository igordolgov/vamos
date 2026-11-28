// ============================================================
// test/unit/numerals.spec.ts — уроки 34–37: числа 11–100,
// согласование числительное + существительное (RU/ES),
// дни недели, месяцы, «¿Cuánto cuesta?», «¿Qué hora es?».
// ============================================================

import { describe, it, expect } from 'vitest'
import { allTemplates, NUMBERS_ALL, NUMBERS_2_4 } from '../../shared/phrases/templates'
import { countTemplate } from '../../shared/phrases/engine'
import { getWord } from '../../shared/data/words'
import { ALL_WORDS } from '../../shared/data/words'
import type { Fill, PhraseKind } from '../../shared/phrases/schema'

const T = (id: string) => {
  const t = allTemplates().find((x) => x.id === id)
  expect(t, 'шаблон ' + id).toBeTruthy()
  return t!
}

/** Минимальное заполнение tener-num: подлежащее + число + существительное */
const tenerFill = (num: string, noun: string, s = 'p-yo') =>
  ({ s: getWord(s), num: getWord(num), 'o#noun': getWord(noun) }) as unknown as Fill

describe('Числа 11–100: словарь и пулы', () => {
  it('числа 11–100 на месте (урок 34)', () => {
    for (const id of [
      'num-once', 'num-doce', 'num-trece', 'num-catorce', 'num-quince',
      'num-dieciseis', 'num-diecisiete', 'num-dieciocho', 'num-diecinueve',
      'num-veinte', 'num-veintiuno', 'num-veintidos', 'num-veintinueve',
      'num-treinta', 'num-cuarenta', 'num-cincuenta', 'num-sesenta',
      'num-setenta', 'num-ochenta', 'num-noventa', 'num-cien',
    ]) {
      const w = getWord(id)
      expect(w.pos, id).toBe('number')
      expect(w.lesson, id).toBe(34)
      expect(w.ru[0], id).toBeTruthy()
    }
  })

  it('пул NUMBERS_ALL: 36 чисел от 2 до 100, без cero/uno', () => {
    expect(NUMBERS_ALL.length).toBe(36)
    expect(NUMBERS_ALL.some((w) => w.id === 'num-cero')).toBe(false)
    expect(NUMBERS_ALL.some((w) => w.id === 'num-uno')).toBe(false)
    expect(NUMBERS_ALL.some((w) => w.id === 'num-cien')).toBe(true)
    // 2–4 по-прежнему отдельно (собирательные/два-две)
    expect(NUMBERS_2_4.map((w) => w.id)).toEqual(['num-dos', 'num-tres', 'num-cuatro'])
  })
})

describe('Согласование: числительное + существительное (tener-num)', () => {
  const render = (num: string, noun: string) => {
    const t = T('t-pron-tener-num')
    return { es: t.render(tenerFill(num, noun), 'aff'), ru: t.ru(tenerFill(num, noun), 'aff') }
  }

  it('два/две по роду (регрессия)', () => {
    expect(render('num-dos', 'n-hermano')).toEqual({ es: 'Yo tengo dos hermanos', ru: 'У меня есть два брата' })
    expect(render('num-dos', 'n-hermana')).toEqual({ es: 'Yo tengo dos hermanas', ru: 'У меня есть две сестры' })
  })

  it('5+ → род.п. мн.ч.: veinte libros → «двадцать книг»', () => {
    expect(render('num-veinte', 'n-libro')).toEqual({ es: 'Yo tengo veinte libros', ru: 'У меня есть двадцать книг' })
    expect(render('num-cinco', 'n-mesa')).toEqual({ es: 'Yo tengo cinco mesas', ru: 'У меня есть пять столов' })
  })

  it('апокопа: veintiún (м.р.) / veintiuna (ж.р.)', () => {
    expect(render('num-veintiuno', 'n-libro').es).toBe('Yo tengo veintiún libros')
    expect(render('num-veintiuno', 'n-mesa').es).toBe('Yo tengo veintiuna mesas')
  })

  it('21 → им.п. ед.ч. по роду: «двадцать одна книга», «двадцать один стол»', () => {
    expect(render('num-veintiuno', 'n-libro').ru).toBe('У меня есть двадцать одна книга')
    expect(render('num-veintiuno', 'n-mesa').ru).toBe('У меня есть двадцать один стол')
  })

  it('22–24 → род.п. ед.ч.: «двадцать два стола», «двадцать две книги»', () => {
    expect(render('num-veintidos', 'n-mesa')).toEqual({
      es: 'Yo tengo veintidós mesas',
      ru: 'У меня есть двадцать два стола',
    })
    expect(render('num-veintidos', 'n-libro').ru).toBe('У меня есть двадцать две книги')
    expect(render('num-veinticuatro', 'n-casa').ru).toBe('У меня есть двадцать четыре дома')
  })

  it('11–19 → род.п. мн.ч. (несмотря на 1–4 в конце): «одиннадцать книг», «двенадцать столов»', () => {
    expect(render('num-once', 'n-libro').ru).toBe('У меня есть одиннадцать книг')
    expect(render('num-doce', 'n-mesa').ru).toBe('У меня есть двенадцать столов')
    expect(render('num-catorce', 'n-casa').ru).toBe('У меня есть четырнадцать домов')
  })

  it('cien → род.п. мн.ч.: «сто книг»', () => {
    expect(render('num-cien', 'n-libro')).toEqual({ es: 'Yo tengo cien libros', ru: 'У меня есть сто книг' })
  })

  it('plural-only (часы): двое часов / двадцать одни часы / пять часов', () => {
    expect(render('num-dos', 'n-reloj').ru).toBe('У меня есть двое часов')
    expect(render('num-veintiuno', 'n-reloj').ru).toBe('У меня есть двадцать одни часы')
    expect(render('num-cinco', 'n-reloj').ru).toBe('У меня есть пять часов')
  })

  it('все числа пула дают согласованную фразу без мусора', () => {
    const t = T('t-pron-tener-num')
    for (const num of NUMBERS_ALL) {
      const ru = t.ru(tenerFill(num.id, 'n-libro'), 'aff')
      expect(ru, ru).not.toMatch(/undefined|NaN/)
      expect(ru, ru).toMatch(/^У меня есть /)
    }
  })
})

describe('hace N años с числами 11–100', () => {
  const hace = (num: string, noun: string) => {
    const t = T('t-hace-tiempo')
    const fill = { num: getWord(num), 'o#noun': getWord(noun) } as unknown as Fill
    return { es: t.render(fill, 'aff'), ru: t.ru(fill, 'aff') }
  }

  it('«Двадцать лет назад» (год → лет!) и «hace veinte años»', () => {
    expect(hace('num-veinte', 'n-ano')).toEqual({ es: 'Hace veinte años', ru: 'Двадцать лет назад' })
  })

  it('«Двадцать один месяц назад» и апокопа hace veintiún meses', () => {
    expect(hace('num-veintiuno', 'n-mes')).toEqual({
      es: 'Hace veintiún meses',
      ru: 'Двадцать один месяц назад',
    })
  })

  it('«Два дня назад» (регрессия) и «сто недель назад»', () => {
    expect(hace('num-dos', 'n-dia')).toEqual({ es: 'Hace dos días', ru: 'Два дня назад' })
    expect(hace('num-cien', 'n-semana').ru).toBe('Сто недель назад')
  })
})

describe('Дни недели (урок 35)', () => {
  it('Hoy es lunes → «Сегодня понедельник»', () => {
    const t = T('t-hoy-es-dia')
    const fill = { day: getWord('n-lunes') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Hoy es lunes')
    expect(t.ru(fill, 'aff')).toBe('Сегодня понедельник')
  })

  it('¿Qué día es hoy? → «Какой сегодня день?»', () => {
    const t = T('t-hoy-es-dia')
    expect(t.render({}, 'qw')).toBe('¿Qué día es hoy?')
    expect(t.ru({}, 'qw')).toBe('Какой сегодня день?')
  })

  it('El viernes trabajo / no trabajo → «В пятницу я (не) работаю»', () => {
    const t = T('t-dia-el')
    const fill = { day: getWord('n-viernes'), v: getWord('v-trabajar') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('El viernes trabajo')
    expect(t.ru(fill, 'aff')).toBe('В пятницу я работаю')
    expect(t.render(fill, 'neg')).toBe('El viernes no trabajo')
    expect(t.ru(fill, 'neg')).toBe('В пятницу я не работаю')
  })

  it('Los miércoles trabajo → «По средам я работаю»', () => {
    const t = T('t-dia-los')
    const fill = { day: getWord('n-miercoles'), v: getWord('v-trabajar') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Los miércoles trabajo')
    expect(t.ru(fill, 'aff')).toBe('По средам я работаю')
    expect(t.ru({ ...fill, day: getWord('n-sabado') } as unknown as Fill, 'aff')).toBe('По субботам я работаю')
  })
})

describe('Месяцы и день рождения (урок 36)', () => {
  it('Mi cumpleaños es en mayo → «Мой день рождения в мае»', () => {
    const t = T('t-cumpleanos-mes')
    const fill = { mes: getWord('n-mayo') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Mi cumpleaños es en mayo')
    expect(t.ru(fill, 'aff')).toBe('Мой день рождения в мае')
  })

  it('«в марте», «в августе» — предложный падеж всех месяцев', () => {
    const t = T('t-cumpleanos-mes')
    for (const [id, prep] of [
      ['n-marzo', 'в марте'], ['n-agosto', 'в августе'], ['n-febrero', 'в феврале'],
      ['n-septiembre', 'в сентябре'],
    ] as const) {
      expect(t.ru({ mes: getWord(id) } as unknown as Fill, 'aff')).toBe(`Мой день рождения ${prep}`)
    }
  })

  it('¿Cuándo es tu cumpleaños? → «Когда твой день рождения?»', () => {
    const t = T('t-qw-cuando-cumpleanos')
    expect(t.render({}, 'qw')).toBe('¿Cuándo es tu cumpleaños?')
    expect(t.ru({}, 'qw')).toBe('Когда твой день рождения?')
  })
})

describe('Цены (урок 37)', () => {
  it('¿Cuánto cuesta el pan? → «Сколько стоит (известный) хлеб?»', () => {
    const t = T('t-qw-cuanto-cuesta')
    const fill = { 's#noun': getWord('n-pan'), 's#det': getWord('d-el'), 's#num': 'sg', 's#adj': null } as unknown as Fill
    expect(t.render(fill, 'qw')).toBe('¿Cuánto cuesta el pan?')
    expect(t.ru(fill, 'qw')).toBe('Сколько стоит (известный) хлеб?')
  })

  it('мн.ч.: ¿Cuánto cuestan los libros? → «Сколько стоят (известные) книги?»', () => {
    const t = T('t-qw-cuanto-cuesta')
    const fill = { 's#noun': getWord('n-libro'), 's#det': getWord('d-los'), 's#num': 'pl', 's#adj': null } as unknown as Fill
    expect(t.render(fill, 'qw')).toBe('¿Cuánto cuestan los libros?')
    expect(t.ru(fill, 'qw')).toBe('Сколько стоят (известные) книги?')
  })

  it('Cuesta veinte pesos → «Стоит двадцать песо» (песо не склоняется)', () => {
    const t = T('t-cuesta-num')
    const fill = { num: getWord('num-veinte'), 'o#noun': getWord('n-peso') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Cuesta veinte pesos')
    expect(t.ru(fill, 'aff')).toBe('Стоит двадцать песо')
    expect(t.render(fill, 'yesno')).toBe('¿Cuesta veinte pesos?')
    expect(t.ru(fill, 'yesno')).toBe('Стоит двадцать песо?')
  })

  it('доллары: Cuesta treinta dólares → «Стоит тридцать долларов»', () => {
    const t = T('t-cuesta-num')
    const fill = { num: getWord('num-treinta'), 'o#noun': getWord('n-dolar') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Cuesta treinta dólares')
    expect(t.ru(fill, 'aff')).toBe('Стоит тридцать долларов')
  })
})

describe('Который час (урок 37)', () => {
  it('¿Qué hora es? → «Сколько времени?»', () => {
    const t = T('t-qw-que-hora')
    expect(t.render({}, 'qw')).toBe('¿Qué hora es?')
    expect(t.ru({}, 'qw')).toBe('Сколько времени?')
  })

  it('Es la una / Son las N en punto → «Сейчас ровно час/два часа/пять часов»', () => {
    const t = T('t-es-la-hora')
    const hour = (id: string) => ({ num: getWord(id) }) as unknown as Fill
    expect(t.render(hour('num-uno'), 'aff')).toBe('Es la una en punto')
    expect(t.ru(hour('num-uno'), 'aff')).toBe('Сейчас ровно час')
    expect(t.render(hour('num-dos'), 'aff')).toBe('Son las dos en punto')
    expect(t.ru(hour('num-dos'), 'aff')).toBe('Сейчас ровно два часа')
    expect(t.ru(hour('num-cinco'), 'aff')).toBe('Сейчас ровно пять часов')
    expect(t.ru(hour('num-doce'), 'aff')).toBe('Сейчас ровно двенадцать часов')
  })
})

describe('Подсчёт и готовность новых шаблонов', () => {
  it('новые шаблоны дают фразы при полном словаре', () => {
    const ALL = new Set(ALL_WORDS.map((w) => w.id))
    for (const id of [
      't-pron-tener-num', 't-hace-tiempo', 't-hoy-es-dia', 't-dia-el', 't-dia-los',
      't-cumpleanos-mes', 't-qw-cuando-cumpleanos', 't-qw-que-hora', 't-es-la-hora',
      't-qw-cuanto-cuesta', 't-cuesta-num',
    ]) {
      const t = T(id)
      expect(countTemplate(t, ALL), id).toBeGreaterThan(0)
    }
  })

  it('после урока 33 числа 34+ ещё не дают фраз (гейтинг по словам)', () => {
    const upto33 = new Set(ALL_WORDS.filter((w) => w.lesson <= 33).map((w) => w.id))
    expect(countTemplate(T('t-es-la-hora'), upto33)).toBe(0)
    expect(countTemplate(T('t-cuesta-num'), upto33)).toBe(0)
    // дни известны только после урока 35
    const upto34 = new Set(ALL_WORDS.filter((w) => w.lesson <= 34).map((w) => w.id))
    expect(countTemplate(T('t-hoy-es-dia'), upto34)).toBe(0)
    expect(countTemplate(T('t-qw-que-hora'), upto34)).toBeGreaterThan(0)
  })
})
