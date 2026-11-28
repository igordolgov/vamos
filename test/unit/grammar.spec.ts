// ============================================================
// test/unit/grammar.spec.ts — испанская и русская грамматика:
// спряжения, артикли, contracciones, согласование, падежи.
// ============================================================

import { describe, it, expect } from 'vitest'
import { regularForms } from '../../shared/data/words/helpers'
import { gerundOf } from '../../shared/phrases/es'
import { conjugate, esArticle, esNounPhrase, joinPrepNP } from '../../shared/phrases/es'
import { ruAdjForNoun, ruAdjForm, ruDetForm, ruNounPhrase } from '../../shared/phrases/ru'
import { ruAdjGenitive, ruDetGenitive, ruGenitive, ruPlural, ruAccusative } from '../../shared/phrases/ru-morph'
import { enumerateTemplate } from '../../shared/phrases/engine'
import { TEMPLATES, npRuAcc } from '../../shared/phrases/templates'
import type { Fill } from '../../shared/phrases/schema'
import { getWord, findWord } from '../../shared/data/words'

describe('Правильные спряжения (все лица, включая vosotros)', () => {
  it('-ar: hablar', () => {
    expect(regularForms('hablar')).toEqual({
      '1s': 'hablo', '2s': 'hablas', '3s': 'habla', '1p': 'hablamos', '2p': 'habláis', '3p': 'hablan',
    })
  })
  it('-er: comer', () => {
    expect(regularForms('comer')).toEqual({
      '1s': 'como', '2s': 'comes', '3s': 'come', '1p': 'comemos', '2p': 'coméis', '3p': 'comen',
    })
  })
  it('-ir: vivir', () => {
    expect(regularForms('vivir')).toEqual({
      '1s': 'vivo', '2s': 'vives', '3s': 'vive', '1p': 'vivimos', '2p': 'vivís', '3p': 'viven',
    })
  })
  it('ключевые неправильные', () => {
    expect(getWord('v-ser').verb!.forms).toEqual({
      '1s': 'soy', '2s': 'eres', '3s': 'es', '1p': 'somos', '2p': 'sois', '3p': 'son',
    })
    expect(getWord('v-estar').verb!.forms['1s']).toBe('estoy')
    expect(getWord('v-tener').verb!.forms['1s']).toBe('tengo')
    expect(getWord('v-tener').verb!.forms['2s']).toBe('tienes')
    expect(getWord('v-ir').verb!.forms['1s']).toBe('voy')
    expect(getWord('v-poder').verb!.forms['1s']).toBe('puedo')
    expect(getWord('v-dormir').verb!.forms['1s']).toBe('duermo')
    expect(getWord('v-pedir').verb!.forms['1s']).toBe('pido')
    expect(getWord('v-conocer').verb!.forms['1s']).toBe('conozco')
  })
  it('стем-чейндж e→ie / o→ue', () => {
    expect(getWord('v-querer').verb!.forms['2s']).toBe('quieres')
    expect(getWord('v-cerrar').verb!.forms['3s']).toBe('cierra')
    expect(getWord('v-volver').verb!.forms['1s']).toBe('vuelvo')
    expect(getWord('v-recordar').verb!.forms['3p']).toBe('recuerdan')
  })
  it('vosotros: чередование гласной не затрагивает 2p, у неправильных — своя форма', () => {
    // у стем-чейндж глаголов в vosotros гласная НЕ меняется
    expect(getWord('v-pensar').verb!.forms['2p']).toBe('pensáis')
    expect(getWord('v-querer').verb!.forms['2p']).toBe('queréis')
    expect(getWord('v-cerrar').verb!.forms['2p']).toBe('cerráis')
    expect(getWord('v-dormir').verb!.forms['2p']).toBe('dormís')
    expect(getWord('v-pedir').verb!.forms['2p']).toBe('pedís')
    expect(getWord('v-seguir').verb!.forms['2p']).toBe('seguís')
    // собственно неправильные формы
    expect(getWord('v-estar').verb!.forms['2p']).toBe('estáis')
    expect(getWord('v-ir').verb!.forms['2p']).toBe('vais')
    expect(getWord('v-tener').verb!.forms['2p']).toBe('tenéis')
    expect(getWord('v-dar').verb!.forms['2p']).toBe('dais')
    expect(getWord('v-ver').verb!.forms['2p']).toBe('veéis')
    expect(getWord('v-decir').verb!.forms['2p']).toBe('decís')
    expect(getWord('v-hacer').verb!.forms['2p']).toBe('hacéis')
    expect(getWord('v-saber').verb!.forms['2p']).toBe('sabéis')
  })
  it('герундий: правильный вычисляется, неправильный берётся из данных', () => {
    expect(gerundOf(getWord('v-hablar'))).toBe('hablando')
    expect(gerundOf(getWord('v-comer'))).toBe('comiendo')
    expect(gerundOf(getWord('v-vivir'))).toBe('viviendo')
    expect(gerundOf(getWord('v-ir'))).toBe('yendo')
    expect(gerundOf(getWord('v-dormir'))).toBe('durmiendo')
    expect(gerundOf(getWord('v-leer'))).toBe('leyendo')
    expect(gerundOf(getWord('v-decir'))).toBe('diciendo')
  })
})

describe('Артикли и contracciones', () => {
  it('el/la/los/las по роду и числу', () => {
    const casa = getWord('n-casa')      // ж.р.
    const libro = getWord('n-libro')    // м.р.
    expect(esArticle(libro, 'sg', true)).toBe('el')
    expect(esArticle(casa, 'sg', true)).toBe('la')
    expect(esArticle(libro, 'pl', true)).toBe('los')
    expect(esArticle(casa, 'pl', true)).toBe('las')
    expect(esArticle(libro, 'sg', false)).toBe('un')
    expect(esArticle(casa, 'sg', false)).toBe('una')
    expect(esArticle(libro, 'pl', false)).toBe('unos')
    expect(esArticle(casa, 'pl', false)).toBe('unas')
  })
  it('el agua — ж.р. с артиклем мужского рода', () => {
    const agua = getWord('n-agua')
    expect(agua.gender).toBe('f')
    expect(esArticle(agua, 'sg', true)).toBe('el')
    expect(esArticle(agua, 'pl', true)).toBe('las')
  })
  it('a + el = al, de + el = del', () => {
    expect(joinPrepNP('a', 'el banco')).toBe('al banco')
    expect(joinPrepNP('de', 'el mercado')).toBe('del mercado')
    expect(joinPrepNP('a', 'la escuela')).toBe('a la escuela')
    expect(joinPrepNP('con', 'el amigo')).toBe('con el amigo')
  })
})

describe('Именная группа по-испански', () => {
  it('артикль + сущ. + прилагательное: la casa blanca', () => {
    const casa = getWord('n-casa')
    const blanco = getWord('a-blanco')
    expect(esNounPhrase(casa, { number: 'sg', definite: true, adj: blanco })).toBe('la casa blanca')
    expect(esNounPhrase(casa, { number: 'pl', definite: true, adj: blanco })).toBe('las casas blancas')
    const libro = getWord('n-libro')
    expect(esNounPhrase(libro, { number: 'pl', definite: false, adj: blanco })).toBe('unos libros blancos')
  })
  it('голая форма для еды и языков: como pan, hablo español', () => {
    const pan = getWord('n-pan')
    expect(esNounPhrase(pan, { number: 'sg', definite: null })).toBe('pan')
    const esp = getWord('n-espanol')
    expect(esNounPhrase(esp, { number: 'sg', definite: null })).toBe('español')
  })
  it('определитель-притяжательное: mi casa', () => {
    const casa = getWord('n-casa')
    const mi = getWord('p-mi')
    expect(esNounPhrase(casa, { number: 'sg', definite: null, det: mi })).toBe('mi casa')
    expect(esNounPhrase(casa, { number: 'pl', definite: null, det: mi })).toBe('mis casas')
  })
})

describe('Русская морфология', () => {
  it('родительный: дом→дома, машина→машины, время→времени, деньги→денег', () => {
    expect(ruGenitive(makeNoun('дом', 'm'))).toBe('дома')
    expect(ruGenitive(makeNoun('машина', 'f'))).toBe('машины')
    expect(ruGenitive(makeNoun('время', 'n'))).toBe('времени')
    expect(ruGenitive(makePluralOnly('деньги'))).toBe('денег')
    expect(ruGenitive(makePluralOnly('часы'))).toBe('часов')
    expect(ruGenitive(makeNoun('отец', 'm'))).toBe('отца')
    expect(ruGenitive(makeNoun('день', 'm'))).toBe('дня')
    expect(ruGenitive(makeNoun('ночь', 'f'))).toBe('ночи')
  })
  it('родительный прилагательного при «нет»: нет большого стола, хорошей одежды', () => {
    // род берём по РУССКОМУ слову: libro = «книга» (ж.р.), mesa = «стол» (м.р.)
    expect(ruAdjGenitive(getWord('a-grande'), getWord('n-mesa'))).toBe('большого')
    expect(ruAdjGenitive(getWord('a-grande'), getWord('n-libro'))).toBe('большой')
    expect(ruAdjGenitive(getWord('a-bueno'), getWord('n-ropa'))).toBe('хорошей')
    expect(ruAdjGenitive(getWord('a-nuevo'), getWord('n-tiempo'))).toBe('нового')
  })
  it('родительный определителя «нет моего ключа, нет этой книги» (артикли — null)', () => {
    expect(ruDetGenitive(getWord('p-mi'), getWord('n-llave'))).toBe('моего')
    expect(ruDetGenitive(getWord('p-mi'), getWord('n-libro'))).toBe('моей')
    expect(ruDetGenitive(getWord('p-este'), getWord('n-libro'))).toBe('этой')
    expect(ruDetGenitive(getWord('p-este'), getWord('n-llave'))).toBe('этого')
    expect(ruDetGenitive(getWord('d-el'), getWord('n-libro'))).toBeNull()
    expect(ruDetGenitive(getWord('d-mucho'), getWord('n-tiempo'))).toBeNull()
  })
  it('мн.ч.: книга→книги, город→города, брат→братья, человек→люди', () => {
    expect(ruPlural(makeNoun('книга', 'f'))).toBe('книги')
    expect(ruPlural(makeNoun('город', 'm'))).toBe('города')
    expect(ruPlural(makeNoun('брат', 'm'))).toBe('братья')
    expect(ruPlural(makeNoun('человек', 'm'))).toBe('люди')
    expect(ruPlural(makeNoun('время', 'n'))).toBe('времена')
  })
  it('винительный неодушевлённых: машину, фильм, время', () => {
    expect(ruAccusative(makeNoun('машина', 'f'))).toBe('машину')
    expect(ruAccusative(makeNoun('фильм', 'm'))).toBe('фильм')
    expect(ruAccusative(makeNoun('время', 'n'))).toBe('время')
  })
  it('согласование русских прилагательных', () => {
    expect(ruAdjForm('белый', 'm', 'sg')).toBe('белый')
    expect(ruAdjForm('белый', 'f', 'sg')).toBe('белая')
    expect(ruAdjForm('белый', 'n', 'sg')).toBe('белое')
    expect(ruAdjForm('белый', 'm', 'pl')).toBe('белые')
    expect(ruAdjForm('синий', 'f', 'sg')).toBe('синяя')
    expect(ruAdjForm('синий', 'n', 'sg')).toBe('синее')
    expect(ruAdjForm('синий', 'm', 'pl')).toBe('синие')
    expect(ruAdjForm('большой', 'f', 'sg')).toBe('большая')
  })

  it('жи-ши и родственные: мн.ч. на «-ие» после к/г/х/ж/ш/ч/щ', () => {
    // «большие», «плохие», «какие» — не «большые», «плохые», «какые»
    expect(ruAdjForm('большой', 'm', 'pl')).toBe('большие')
    expect(ruAdjForm('плохой', 'm', 'pl')).toBe('плохие')
    expect(ruAdjForm('дорогой', 'm', 'pl')).toBe('дорогие')
    expect(ruAdjForm('какой', 'm', 'pl')).toBe('какие')
    expect(ruAdjForm('новый', 'm', 'pl')).toBe('новые')
    expect(ruAdjForm('дешёвый', 'm', 'pl')).toBe('дешёвые')
    // пояснение в скобках — не часть словоформы
    expect(ruAdjForm('дорогой (цена)', 'f', 'sg')).toBe('дорогая')
    expect(ruAdjForm('дорогой (цена)', 'n', 'sg')).toBe('дорогое')
  })

  it('ruAdjForNoun: «Молоко — дорогое», «Деньги — большие», «Еда — очень вкусная»', () => {
    const leche = getWord('n-leche')
    const dinero = getWord('n-dinero')
    const comida = getWord('n-comida')
    expect(ruAdjForNoun(leche, getWord('a-caro'))).toBe('дорогое')
    expect(ruAdjForNoun(leche, getWord('a-delicioso'))).toBe('очень вкусное')
    // plural-only (деньги, часы) — прилагательное во мн.ч.
    expect(ruAdjForNoun(dinero, getWord('a-bueno'))).toBe('хорошие')
    expect(ruAdjForNoun(comida, getWord('a-barato'), 'pl')).toBe('дешёвые')
  })
  it('русская именная группа: белый дом, белая машина, много работы', () => {
    const blanco = findWord('a-blanco')!
    const casa = getWord('n-casa')
    const carro = getWord('n-carro')
    expect(ruNounPhrase(casa, { adj: blanco })).toBe('белый дом')
    expect(ruNounPhrase(carro, { adj: blanco })).toBe('белая машина')
    const trabajo = getWord('n-trabajo')
    const mucho = getWord('d-mucho')
    expect(ruNounPhrase(trabajo, { det: mucho })).toBe('много работы')
  })

  it('-ий после к/г/х/ж/ш/щ/ч: высокая/высокое/высокую, а не «высокяя»', () => {
    expect(ruAdjForm('высокий', 'f', 'sg')).toBe('высокая')
    expect(ruAdjForm('высокий', 'n', 'sg')).toBe('высокое')
    expect(ruAdjForm('высокий', 'm', 'pl')).toBe('высокие')
    expect(ruAdjForm('хороший', 'f', 'sg')).toBe('хорошая')
    expect(ruAdjForm('хороший', 'n', 'sg')).toBe('хорошее')
    expect(ruAdjForm('хороший', 'f', 'sg', 'acc')).toBe('хорошую')
    expect(ruAdjForm('маленький', 'f', 'sg')).toBe('маленькая')
    expect(ruAdjForm('горячий', 'f', 'sg')).toBe('горячая')
  })

  it('винительный прилагательных: дешёвую музыку, синюю, мягкие -юю', () => {
    expect(ruAdjForm('дешёвый', 'f', 'sg', 'acc')).toBe('дешёвую')
    expect(ruAdjForm('белый', 'f', 'sg', 'acc')).toBe('белую')
    expect(ruAdjForm('синий', 'f', 'sg')).toBe('синяя')
    expect(ruAdjForm('синий', 'f', 'sg', 'acc')).toBe('синюю')
    expect(ruAdjForm('высокий', 'f', 'sg', 'acc')).toBe('высокую')
    // м.р./с.р./мн.ч. неодушевлённых = именительный
    expect(ruAdjForm('дешёвый', 'm', 'sg', 'acc')).toBe('дешёвый')
    expect(ruAdjForm('дешёвый', 'n', 'sg', 'acc')).toBe('дешёвое')
    expect(ruAdjForm('дешёвый', 'f', 'pl', 'acc')).toBe('дешёвые')
  })

  it('русские определители: мой/моё/моя/мою/мои', () => {
    const mi = getWord('p-mi')
    expect(ruDetForm(mi, 'm', 'sg')).toBe('мой')
    expect(ruDetForm(mi, 'n', 'sg')).toBe('моё')
    expect(ruDetForm(mi, 'f', 'sg')).toBe('моя')
    expect(ruDetForm(mi, 'f', 'sg', 'acc')).toBe('мою')
    expect(ruDetForm(mi, 'm', 'pl')).toBe('мои')
    expect(ruDetForm(getWord('p-nuestro'), 'f', 'sg')).toBe('наша')
    expect(ruDetForm(getWord('p-este'), 'f', 'sg', 'acc')).toBe('эту')
    expect(ruDetForm(getWord('p-ese'), 'f', 'sg')).toBe('та')
  })

  it('«Ellos hacen música barata» → «Они делают (вообще) дешёвую музыку»', () => {
    const t = TEMPLATES.find((x) => x.id === 't-pron-v-do-adj')!
    const known = new Set(['p-ellos', 'v-hacer', 'n-musica', 'a-barato'])
    const { phrases } = enumerateTemplate(t, known, 0, 100)
    const rus = phrases.map((p) => p.ru)
    // hacer есть и в estar+герундии → маркер «(вообще)» отличает
    // «hacen» от «están haciendo»
    expect(rus).toContain('Они (муж.) делают (вообще) дешёвую музыку')
    expect(rus.some((r) => /дешёвая музык/.test(r))).toBe(false)
  })

  it('вин.п. именной группы с определителем и прилагательным', () => {
    // «Veo mi carro (barato)» → «вижу мою машину», «вижу мою дешёвую машину»
    const carro = getWord('n-carro')
    const mi = getWord('p-mi')
    const barato = getWord('a-barato')
    const acc = npRuAcc({ 'x#noun': carro, 'x#det': mi, 'x#adj': null, 'x#num': 'sg' }, 'x')
    expect(acc).toBe('мою машину')
    const accAdj = npRuAcc({ 'x#noun': carro, 'x#det': mi, 'x#adj': barato, 'x#num': 'sg' }, 'x')
    expect(accAdj).toBe('мою дешёвую машину')
  })

  it('им.п. с определителем: «моя музыка», «моё время»', () => {
    const musica = getWord('n-musica')
    const tiempo = getWord('n-tiempo')
    const mi = getWord('p-mi')
    expect(ruNounPhrase(musica, { det: mi })).toBe('моя музыка')
    expect(ruNounPhrase(tiempo, { det: mi })).toBe('моё время')
  })

  it('после «есть» — именительный: «У меня есть новая книга»', () => {
    // «tener + еда/музыка» исключены коллокациями («мало курицы»);
    // морфологию проверяем на естественном сочетании
    const t = TEMPLATES.find((x) => x.id === 't-pron-v-do-adj')!
    const known = new Set(['p-yo', 'v-tener', 'n-libro', 'a-nuevo', 'd-un'])
    const { phrases } = enumerateTemplate(t, known, 0, 200)
    const rus = phrases.map((p) => p.ru)
    expect(rus).toContain('У меня есть новая книга')
    expect(rus.some((r) => /есть новую/.test(r))).toBe(false)
  })
})

describe('Будущее время и уточнения местоимений (пакет правок)', () => {
  it('«он будет жить» — будущее с «он» в ЕД.Ч. (не «будут»)', () => {
    // Ошибка пользователя: «он будут жить», «он не будут учить» —
    // p-el попадал в общий «будут»
    const t = TEMPLATES.find((x) => x.id === 't-pron-ir-a-inf')!
    const fill = { s: getWord('p-el'), v2: getWord('v-vivir') } as unknown as Fill
    expect(t.render(fill, 'aff')).toBe('Él va a vivir')
    expect(t.ru(fill, 'aff')).toBe('Он будет жить')
    expect(t.ru(fill, 'neg')).toBe('Он не будет жить')
  })

  it('уточнения местоимений-омонимов в скобках: Вы (вежл.)/(мн. ч.), Они (муж.)/(жен.)', () => {
    // Просьба пользователя: после слова «Вы» уточнять вежл. или мн. ч.
    // (в скобках и серым); «они» — омоним ellos/ellas
    const t = TEMPLATES.find((x) => x.id === 't-pron-v-bare')!
    expect(t.ru({ s: getWord('p-usted'), v: getWord('v-trabajar') } as unknown as Fill, 'aff')).toBe('Вы (вежл.) работаете')
    expect(t.ru({ s: getWord('p-ustedes'), v: getWord('v-trabajar') } as unknown as Fill, 'aff')).toBe('Вы (мн. ч.) работаете')
    expect(t.ru({ s: getWord('p-ellos'), v: getWord('v-trabajar') } as unknown as Fill, 'aff')).toBe('Они (муж.) работают')
    expect(t.ru({ s: getWord('p-ellas'), v: getWord('v-trabajar') } as unknown as Fill, 'aff')).toBe('Они (жен.) работают')
  })

  it('вежливое «Вы/Вас/Вам» — всегда с большой буквы (usted и ustedes)', () => {
    // Просьба пользователя: в русском вежливое обращение пишется «Вы»
    // в единственном и множественном числе (usted / ustedes)
    const tener = TEMPLATES.find((x) => x.id === 't-pron-tener-noun')!
    const tenerFill = (s: string) =>
      ({ s: getWord(s), 'o#noun': getWord('n-casa'), 'o#det': null, 'o#num': 'sg', 'o#adj': null } as unknown as Fill)
    expect(tener.ru(tenerFill('p-usted'), 'aff')).toBe('У Вас есть дом')
    expect(tener.ru(tenerFill('p-ustedes'), 'aff')).toBe('У Вас есть дом')
    expect(tener.ru(tenerFill('p-usted'), 'neg')).toBe('У Вас нет дома')
    const como = TEMPLATES.find((x) => x.id === 't-qw-como-estar')!
    expect(como.ru({ s: getWord('p-usted') } as unknown as Fill, 'qw')).toBe('Как Вы (вежл.)?')
    // слово в словаре тоже с большой буквы (карточка, варианты тест-выбора)
    expect(getWord('p-usted').ru[0]).toBe('Вы (вежл.)')
    expect(getWord('p-ustedes').ru[0]).toBe('Вы (мн. ч.)')
    expect(getWord('p-usted').pronoun?.ruGen).toBe('Вас')
    expect(getWord('p-usted').pronoun?.ruDat).toBe('Вам')
    expect(getWord('p-le').ru).toContain('Вам')
  })
})

describe('tener с подлежащим-существительным (t-noun-v-do)', () => {
  const tenerFill = (sdet: string, snoun: string, snum: 'sg' | 'pl') =>
    ({
      's#noun': getWord(snoun),
      's#det': getWord(sdet),
      's#num': snum,
      v: getWord('v-tener'),
      'o#noun': getWord('n-mesa'),
      'o#det': getWord('d-una'),
      'o#num': 'sg',
      'o#adj': null,
    }) as unknown as Fill

  it('мн.ч. подлежащего: «У (известных) отцов есть стол» (не «У отца»)', () => {
    // Раньше «Los padres tienen una mesa» → «У отца есть стол» —
    // мн.ч. терялся
    const t = TEMPLATES.find((x) => x.id === 't-noun-v-do')!
    const fill = tenerFill('d-los', 'n-padre', 'pl')
    expect(t.render(fill, 'aff')).toBe('Los padres tienen una mesa')
    expect(t.ru(fill, 'aff')).toBe('У (известных) отцов есть стол')
    expect(t.ru(fill, 'neg')).toBe('У (известных) отцов нет стола')
  })

  it('определитель подлежащего виден в промпте: «У той девочки есть стол»', () => {
    // «Esa niña tiene una mesa» без пометки отвечал бы и «Una niña…»
    const t = TEMPLATES.find((x) => x.id === 't-noun-v-do')!
    expect(t.ru(tenerFill('p-ese', 'n-nina', 'sg'), 'aff')).toBe('У той девочки есть стол')
    expect(t.ru(tenerFill('d-una', 'n-nina', 'sg'), 'aff')).toBe('У (какой-то) девочки есть стол')
  })
})

/** Заглушка существительного для проверки морфологии */
function makeNoun(ru: string, ruGender: 'm' | 'f' | 'n'): import('../../shared/types').Word {
  return { id: 'test-' + ru, pos: 'noun', es: 'x', ru: [ru], lesson: 1, gender: 'm', nounPlural: 'x', nounClass: 'thing', ruGender }
}

function makePluralOnly(ru: string): import('../../shared/types').Word {
  return { id: 'test-' + ru, pos: 'noun', es: 'x', ru: [ru], lesson: 1, gender: 'm', nounPlural: 'x', nounClass: 'thing', ruGender: 'm', ruPluralOnly: true }
}
