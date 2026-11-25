// ============================================================
// test/unit/diff-hint.spec.ts — целевые подсказки при неверной сборке:
// одна ошибка-правило → объяснение именно про неё; несколько ошибок
// или словарная ошибка → null (общий tip шаблона).
// ============================================================

import { describe, it, expect } from 'vitest'
import { targetedHint } from '../../shared/phrases/diff-hint'

describe('targetedHint — артикли', () => {
  it('пропущен определённый артикль → подсказка именно про артикль', () => {
    const h = targetedHint(['mujer', 'come', 'pan'], ['La', 'mujer', 'come', 'pan'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/артикл/i)
    expect(h).toContain('la mujer')
  })

  it('пропущен неопределённый артикль (hay una idea — счётное абстрактное)', () => {
    const h = targetedHint(['hay', 'idea'], ['Hay', 'una', 'idea'])
    expect(h).toBeTruthy()
    expect(h).toContain('una idea')
    expect(h).toMatch(/неопределённ/)
  })

  it('не тот род артикля: el mujer → la mujer (согласование в роде)', () => {
    const h = targetedHint(['el', 'mujer'], ['la', 'mujer'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/ж\.р\.|род/)
    expect(h).toContain('la mujer')
  })

  it('не то число артикля: la casas → las casas', () => {
    const h = targetedHint(['la', 'casas'], ['las', 'casas'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/числ/)
    expect(h).toContain('las casas')
  })

  it('определённый вместо неопределённого (un ↔ el)', () => {
    const h = targetedHint(['el', 'libro'], ['un', 'libro'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/не взаимозаменяемы|неопределённ/)
    expect(h).toContain('un libro')
  })

  it('артикль вместо притяжательного (la mi casa → mi casa)', () => {
    const h = targetedHint(['la', 'mi', 'casa'], ['mi', 'casa'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/определитель «mi»|мой/)
  })

  it('mucho → mucha (согласование количества)', () => {
    const h = targetedHint(['tengo', 'mucho', 'ropa'], ['tengo', 'mucha', 'ropa'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/согласуется|mucha/)
  })
})

describe('targetedHint — лишний артикль (ответ без артикля)', () => {
  it('неисчисляемое: tengo la ropa → tengo ropa', () => {
    const h = targetedHint(['tengo', 'la', 'ropa'], ['tengo', 'ropa'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/без артикля|не нужен/)
  })

  it('после hay: hay la comida → hay comida', () => {
    const h = targetedHint(['hay', 'la', 'comida'], ['hay', 'comida'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/hay/i)
    expect(h).toMatch(/без артикля/)
  })

  it('en casa — без артикля', () => {
    const h = targetedHint(['estoy', 'en', 'la', 'casa'], ['estoy', 'en', 'casa'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/En casa|устойчив/)
  })

  it('sin azúcar — после sin артикля нет', () => {
    const h = targetedHint(['sin', 'el', 'azucar'], ['sin', 'azucar'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/sin/i)
  })
})

describe('targetedHint — le/les (получатель)', () => {
  it('lo вместо le → правило получателя с dar', () => {
    const h = targetedHint(['lo', 'doy', 'el', 'libro'], ['Le', 'doy', 'el', 'libro'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/получател/)
    expect(h).toMatch(/le/)
  })

  it('пропущено le → получатель обязателен', () => {
    const h = targetedHint(['doy', 'el', 'libro'], ['Le', 'doy', 'el', 'libro'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/получател/)
    expect(h).toContain('le')
  })

  it('le вместо les — число получателей', () => {
    const h = targetedHint(['le', 'doy', 'el', 'libro'], ['les', 'doy', 'el', 'libro'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/les/)
    expect(h).toMatch(/несколько|им/)
  })

  it('me/te перепутаны — таблица местоимений', () => {
    const h = targetedHint(['te', 'das', 'un', 'regalo'], ['me', 'das', 'un', 'regalo'])
    expect(h).toBeTruthy()
    expect(h).toContain('me')
    expect(h).toMatch(/мне/)
  })
})

describe('targetedHint — контракции и предлоги', () => {
  it('a + el → al (контракция, работает даже через выравнивание)', () => {
    const h = targetedHint(['voy', 'a', 'el', 'banco'], ['voy', 'al', 'banco'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/al/)
    expect(h).toMatch(/слив|a \+ el/i)
  })

  it('пропущено al', () => {
    const h = targetedHint(['voy', 'banco'], ['voy', 'al', 'banco'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/al/)
  })

  it('пропущено личное a перед человеком', () => {
    const h = targetedHint(['veo', 'la', 'maestra'], ['veo', 'a', 'la', 'maestra'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/предлог «a»/)
  })

  it('пропущен предлог en', () => {
    const h = targetedHint(['vivo', 'moscú'], ['vivo', 'en', 'moscú'])
    // «moscú» не в словаре noun-поиска — но предлог en классифицируется
    expect(h).toBeTruthy()
    expect(h).toMatch(/en/)
  })
})

describe('targetedHint — глаголы и местоимения', () => {
  it('son вместо es — согласование формы глагола', () => {
    const h = targetedHint(['son'], ['es'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/es/)
    expect(h).toMatch(/соглас|кто делает|форма/)
  })

  it('tiene vs tienen — объяснение лиц', () => {
    const h = targetedHint(['tienen', 'un', 'gato'], ['tiene', 'un', 'gato'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/tienen|tiene/)
    expect(h).toMatch(/кто делает|«он|«они/)
  })

  it('лишнее подлежащее-местоимение → опускается', () => {
    const h = targetedHint(['yo', 'tengo', 'un', 'gato'], ['tengo', 'un', 'gato'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/местоимение|опуск/)
  })

  it('пропущено подлежащее при неоднозначной форме (es)', () => {
    const h = targetedHint(['es', 'alta'], ['él', 'es', 'alta'])
    expect(h).toBeTruthy()
    expect(h).toContain('él')
  })

  it('пропущен глагол', () => {
    const h = targetedHint(['la', 'mujer', 'pan'], ['la', 'mujer', 'come', 'pan'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/глагол/)
  })
})

describe('targetedHint — порядок слов', () => {
  it('слова те же, порядок другой → про порядок', () => {
    const h = targetedHint(['come', 'la', 'mujer', 'pan'], ['la', 'mujer', 'come', 'pan'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/порядок/)
  })

  it('le после глагола — порядок: le ставится перед глаголом', () => {
    const h = targetedHint(['doy', 'le', 'el', 'libro'], ['le', 'doy', 'el', 'libro'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/порядок|перед глаголом/i)
  })
})

describe('targetedHint — границы применимости', () => {
  it('две ошибки → null (показывается общий tip)', () => {
    // замена la→un + лишний артикль… здесь: la→un (sub) и лишнего нет:
    // ['tengo','la','gato'] vs ['tengo','un','gato'] — 1 sub (la→un).
    // Возьмём честные две ошибки: лишний артикль + не тот глагол
    const h = targetedHint(['tengo', 'la', 'ropa', 'vieja'], ['tengo', 'ropa'])
    expect(h).toBeNull()
  })

  it('не то слово (словарная ошибка) → null', () => {
    const h = targetedHint(['tengo', 'un', 'perro'], ['tengo', 'un', 'gato'])
    expect(h).toBeNull()
  })

  it('пропущено существительное → null', () => {
    const h = targetedHint(['quiero', 'un'], ['quiero', 'un', 'libro'])
    expect(h).toBeNull()
  })

  it('alt-ответы участвуют в выравнивании: пропуск местоимения в alt-варианте', () => {
    // Ответ «Tú eres alto», alt «eres alto»: сборка «eres la alta» содержит
    // лишний артикль относительно alt-варианта
    const h = targetedHint(['eres', 'la', 'alta'], ['Tú', 'eres', 'alta'], ['eres alta'])
    expect(h).toBeTruthy()
    expect(h).toMatch(/артикл|не нужен/)
  })

  it('пустая сборка → null', () => {
    expect(targetedHint([], ['la', 'mujer'])).toBeNull()
  })

  it('correct answer (совпадение) → null', () => {
    expect(targetedHint(['la', 'mujer'], ['La', 'mujer'])).toBeNull()
  })
})
