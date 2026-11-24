// ============================================================
// shared/phrases/templates.ts — комбинаторные шаблоны фраз.
//
// Настоящее время, латиноамериканский испанский: утверждения,
// отрицания (no перед глаголом) и вопросы (¿…?), включая
// вопросительные слова. Русские переводы собираются с учётом
// падежей и согласования (см. ru-morph.ts и данные слов).
// ============================================================

import type { GramNumber, Word } from '../types'
import { getWord } from '../data/words'
import { ALL_WORDS, wordsByPos } from '../data/words'
import { capitalize, conjugate, gerundOf, joinPrepNP } from './es'
import { ruAdjForm, ruGustarForm, ruNounForm, ruNounPhrase } from './ru'
import { ruAccusative, ruGenitive } from './ru-morph'
import { initEngine, npEs, npNumber, npRu } from './engine'
import type { Fill, PhraseKind, Template } from './schema'

// ============================================================
// Пулы слов для шаблонов
// ============================================================

/** Местоимения-подлежащие */
export const SUBJECT_PRONOUNS: Word[] = ALL_WORDS.filter((w) => w.pronoun?.role === 'subject')

/** Местоимения косвенного дополнения (для gustar) */
export const IO_PRONOUNS: Word[] = ALL_WORDS.filter((w) => w.pronoun?.role === 'object' && w.pronoun?.io)

/** Переходные глаголы с семантикой дополнения (говорить стол — исключено) */
export const TRANSITIVE_VERBS: Word[] = wordsByPos('verb').filter((v) => v.verb?.transitive && (v.verb?.objClasses?.length ?? 0) > 0)

/** Глаголы с прямым дополнением — лицом (личное «a») */
export const PERSON_VERBS: Word[] = ['v-ver', 'v-ayudar', 'v-llamar', 'v-conocer', 'v-esperar', 'v-buscar'].map(getWord)

/** Ключ русской падежной формы для глаголов с личным «a» */
const PERSON_VERB_RU_CASE: Record<string, 'a' | 'dat'> = {
  'v-ver': 'a',
  'v-conocer': 'a',
  'v-esperar': 'a',
  'v-buscar': 'a',
  'v-ayudar': 'dat',
  'v-llamar': 'dat',
}

/** Глаголы, работающие с языками без предлога (hablo español) */
export const LANGUAGE_VERBS: Word[] = ['v-hablar', 'v-aprender', 'v-estudiar', 'v-saber'].map(getWord)

/** Модальные глаголы (сочетаются с инфинитивом) */
export const MODAL_VERBS: Word[] = wordsByPos('verb').filter((v) => v.verb?.modal)

/** Глаголы-места (сочетающиеся с aquí/allí) */
export const PLACE_ADV_VERBS: Word[] = wordsByPos('verb').filter((v) => v.verb?.placeAdv)

/** Все глаголы с русскими формами (ser/estar обрабатываются отдельно) */
export const CONJUGATED_VERBS: Word[] = wordsByPos('verb').filter((v) => !!v.verb?.ruForms)

/** Глаголы с предлогами (estar исключён — есть отдельный шаблон) */
export const PREP_VERBS: Word[] = wordsByPos('verb').filter((v) => !!v.verb?.withPrep && v.id !== 'v-estar')

/** Существительные по классам */
export const PERSON_NOUNS: Word[] = ALL_WORDS.filter((w) => w.nounClass === 'person' || w.nounClass === 'family')
export const THING_NOUNS: Word[] = ALL_WORDS.filter(
  (w) => w.nounClass === 'thing' || w.nounClass === 'food' || w.nounClass === 'drink' || w.nounClass === 'abstract' || w.nounClass === 'language',
)
export const PLACE_NOUNS: Word[] = ALL_WORDS.filter((w) => w.nounClass === 'place')
export const HUMAN_PLACE_NOUNS: Word[] = PLACE_NOUNS.filter((w) => !!w.ruCases?.en)
export const SURFACE_NOUNS: Word[] = ALL_WORDS.filter((w) => !!w.ruCases?.en && (w.nounClass === 'thing' || w.nounClass === 'food' || w.nounClass === 'drink' || w.nounClass === 'person' || w.nounClass === 'family'))

/** Числа 2–4 (для «dos hermanos», «hace dos años») */
export const NUMBERS_2_4: Word[] = ['num-dos', 'num-tres', 'num-cuatro'].map(getWord)

/** Существительные времени (hace dos años) */
export const TIME_NOUNS: Word[] = ['n-ano', 'n-mes', 'n-dia', 'n-semana', 'n-hora', 'n-minuto'].map(getWord)

/** Наречия перед глаголом */
export const PREVERB_ADVERBS: Word[] = ['adv-siempre', 'adv-tambien', 'adv-ya', 'adv-todavia', 'adv-casi', 'adv-apenas', 'adv-ahora'].map(getWord)

/** Наречия места и образа действия */
export const PLACE_ADVERBS: Word[] = ['adv-aqui', 'adv-alli'].map(getWord)
export const MANNER_ADVERBS: Word[] = ['adv-despacio', 'adv-rapido', 'adv-bien', 'adv-mal', 'adv-juntos'].map(getWord)

/** Глаголы для обстоятельств образа действия (без модальных) */
export const MANNER_VERBS: Word[] = CONJUGATED_VERBS.filter((v) => !v.verb?.modal && v.id !== 'v-tener')

/** Прилагательные состояния: для людей (с краткой формой) и для предметов */
export const STATE_ADJ_PEOPLE: Word[] = ALL_WORDS.filter((w) => w.adjState && !!w.ruShort)
export const STATE_ADJ_THINGS: Word[] = ALL_WORDS.filter((w) => w.adjState && !w.ruShort)

/** Прилагательные качества (не состояния) */
export const QUALITY_ADJECTIVES: Word[] = ALL_WORDS.filter((w) => w.pos === 'adjective' && !w.adjState)

/** Все прилагательные */
export const ALL_ADJECTIVES: Word[] = wordsByPos('adjective')

// Регистрируем прилагательные и существительные в движке
initEngine(ALL_ADJECTIVES, ALL_WORDS.filter((w) => w.pos === 'noun'))

// ============================================================
// Хелперы рендеринга
// ============================================================

/** Русское местоимение без скобок: «вы (мн.ч.)» → «вы» */
function ruPron(pron: Word): string {
  return (pron.ru[0] ?? pron.es).replace(/\s*\(.*\)\s*/, '')
}

/** Индекс русской формы [я, ты, он, мы, вы, они] для местоимения-подлежащего */
const RU_INDEX: Record<string, number> = {
  'p-yo': 0, 'p-tu': 1, 'p-usted': 4, 'p-el': 2, 'p-ella': 2,
  'p-nosotros': 3, 'p-ustedes': 4, 'p-ellos': 5, 'p-ellas': 5,
}
function ruIndexFor(pron: Word): number {
  return RU_INDEX[pron.id] ?? 2
}

/** Русский субъект во мн.ч. или вежливый «вы» (для должны/будут) */
function ruPluralSubject(pron: Word): boolean {
  return pron.id === 'p-usted' || pron.id === 'p-ustedes' ||
    pron.pronoun?.impliedNumber === 'pl'
}

/** Форма русского глагола для местоимения-подлежащего */
function ruVerbP(verb: Word, pron: Word): string {
  return verb.verb?.ruForms?.[ruIndexFor(pron)] ?? (verb.verb?.ruInf ?? verb.ru[0] ?? verb.es)
}

/** Форма русского глагола по индексу */
function ruVerbI(verb: Word, idx: number): string {
  return verb.verb?.ruForms?.[idx] ?? (verb.verb?.ruInf ?? verb.ru[0] ?? verb.es)
}

/** Лицо местоимения-подлежащего */
function pronPerson(pron: Word): '1s' | '2s' | '3s' | '1p' | '3p' {
  return pron.pronoun?.person ?? '3s'
}

/** Род/число местоимения для согласования */
function pronGender(pron: Word): 'm' | 'f' {
  return pron.pronoun?.impliedGender ?? 'm'
}
function pronNumber(pron: Word): 'sg' | 'pl' {
  return pron.pronoun?.impliedNumber ?? 'sg'
}

/** «по-испански»: испанский → по-испански (без слова «язык») */
function ruLanguageAdverb(lang: Word): string {
  const w = (lang.ru[0] ?? lang.es).split(' ')[0] ?? lang.es
  return 'по-' + w.replace(/(ый|ий)$/, '') + 'и'
}

/** Согласованное русское прилагательное для местоимения */
function ruAdjForPron(adj: Word, pron: Word): string {
  return ruAdjForm(adj.ru[0] ?? adj.adj!.m, pronGender(pron), pronNumber(pron))
}

/** Краткая форма состояния (устал / устала / устали) для местоимения */
function ruShortFor(adj: Word, pron: Word): string {
  const s = adj.ruShort
  if (!s) return adj.ru[0] ?? adj.adj!.m
  if (ruPluralSubject(pron)) return s.pl
  return pronGender(pron) === 'f' ? s.f : s.m
}

/** Русская именная группа в винительном падеже (вижу курицу) */
function npRuAcc(fill: Fill, role: string): string {
  const noun = fill[role + '#noun'] as Word
  const det = fill[role + '#det'] as Word | null
  const adj = fill[role + '#adj'] as Word | null
  const numRaw = (fill[role + '#num'] as 'sg' | 'pl') ?? 'sg'
  const isQuantity = !!det?.det?.quantity
  const isArticle = !!det?.det?.definite || !!det?.det?.indefinite
  // русские plural-only существительные (часы, деньги) согласуются во мн.ч.
  const num = noun.ruPluralOnly ? 'pl' : numRaw
  const parts: string[] = []
  if (det && !isArticle && !isQuantity) parts.push(det.ru[0] ?? '')
  if (adj && !isQuantity) {
    const masc = adj.ruByClass?.[noun.nounClass ?? 'thing'] ?? (adj.ru[0] ?? adj.adj!.m)
    parts.push(ruAdjForm(masc, noun.ruGender ?? 'm', num))
  }
  if (isQuantity) {
    // «много/мало» + родительный: много работы
    parts.push(det!.ru[0] ?? '', ruGenitive(noun))
    return parts.join(' ')
  }
  // винительный: ж.р. -а→-у/-я→-ю, остальное = именительный
  parts.push(ruAccusative(noun))
  return parts.join(' ')
}

/** Русская форма числа (два/две; двое/трое/четверо для plural-only) */
function ruNumWord(num: Word, noun: Word): string {
  if (noun.ruPluralOnly) {
    const coll: Record<string, string> = { 'num-dos': 'двое', 'num-tres': 'трое', 'num-cuatro': 'четверо' }
    return coll[num.id] ?? (num.ru[0] ?? num.es)
  }
  if (num.id === 'num-dos') return (noun.ruGender ?? 'm') === 'f' ? 'две' : 'два'
  return num.ru[0] ?? num.es
}

// ============================================================
// Общие render-хелперы для утверждение/отрицание/вопрос
// ============================================================

// ============================================================
// Шаблоны
// ============================================================

export const TEMPLATES: Template[] = [
  // ==========================================================
  // СЕР: профессии и качества (безглагольный русский перевод)
  // ==========================================================
  {
    id: 't-pron-ser-prof',
    lesson: 3,
    group: 'ser/estar',
    requires: ['v-ser'],
    // Якорь — местоимение, зависимость — профессия того же рода
    units: [
      {
        kind: 'anchorDep',
        anchorRole: 's',
        anchors: SUBJECT_PRONOUNS,
        depRole: 'n',
        deps: PERSON_NOUNS,
        compat: (a, d) => !a.pronoun?.impliedGender || a.pronoun.impliedGender === d.gender,
      },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const n = fill.n as Word
      // Мн.ч. подлежащего: Ellos son hermanas (не «son hermana»)
      const noun = pronNumber(p) === 'pl' ? (n.nounPlural ?? n.es) : n.es
      const core = `${p.es} ${conjugate(getWord('v-ser'), pronPerson(p))} ${noun}`
      if (kind === 'neg') return capitalize(`${p.es} no ${conjugate(getWord('v-ser'), pronPerson(p))} ${noun}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${conjugate(getWord('v-ser'), pronPerson(p))} ${noun}`)}?`
      return capitalize(core)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const n = fill.n as Word
      // Согласование в числе: «Они — сёстры» (не «Они — сестра»)
      const ruNoun = ruNounForm(n, pronNumber(p))
      const core = `${capitalize(ruPron(p))} — ${ruNoun}`
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruNoun}`
      return kind === 'yesno' ? `${capitalize(ruPron(p))} — ${ruNoun}?` : core
    },
  },
  {
    id: 't-pron-ser-adj',
    lesson: 13,
    group: 'ser/estar',
    requires: ['v-ser'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'adj', words: QUALITY_ADJECTIVES },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const a = fill.adj as Word
      const adjForm = a.adj![pronGender(p) === 'f' ? (pronNumber(p) === 'pl' ? 'fp' : 'f') : pronNumber(p) === 'pl' ? 'mp' : 'm']
      const verb = conjugate(getWord('v-ser'), pronPerson(p))
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${adjForm}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${adjForm}`)}?`
      return capitalize(`${p.es} ${verb} ${adjForm}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const a = fill.adj as Word
      const adj = ruAdjForPron(a, p)
      const core = `${capitalize(ruPron(p))} — ${adj}`
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${adj}`
      return kind === 'yesno' ? `${capitalize(ruPron(p))} — ${adj}?` : core
    },
  },
  {
    id: 't-noun-ser-prof',
    lesson: 7,
    group: 'ser/estar',
    requires: ['v-ser'],
    // Подлежащее + профессия того же рода («El hombre es maestro»)
    units: [
      {
        kind: 'npDep',
        role: 's',
        nouns: PERSON_NOUNS,
        number: 'sg',
        detSet: 'subject',
        bareAuto: false,
        depRole: 'n',
        deps: PERSON_NOUNS,
        compat: (noun, dep) => noun.gender === dep.gender && noun.id !== dep.id,
      },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const np = npEs(fill, 's')
      const n = fill.n as Word
      const verb = conjugate(getWord('v-ser'), npNumber(fill, 's') === 'pl' ? '3p' : '3s')
      if (kind === 'neg') return capitalize(`${np} no ${verb} ${n.es}`)
      if (kind === 'yesno') return `¿${capitalize(`${np} ${verb} ${n.es}`)}?`
      return capitalize(`${np} ${verb} ${n.es}`)
    },
    ru: (fill, kind) => {
      const np = npRu(fill, 's')
      const n = fill.n as Word
      const core = `${capitalize(np)} — ${n.ru[0]}`
      if (kind === 'neg') return `${capitalize(np)} не ${n.ru[0]}`
      return kind === 'yesno' ? `${capitalize(np)} — ${n.ru[0]}?` : core
    },
  },
  {
    id: 't-noun-ser-adj',
    lesson: 13,
    group: 'ser/estar',
    requires: ['v-ser'],
    units: [
      { kind: 'np', role: 's', nouns: ALL_WORDS.filter((w) => w.pos === 'noun'), number: 'sg', detSet: 'subject', bareAuto: false, withAdj: false },
      { kind: 'free', role: 'adj', words: QUALITY_ADJECTIVES },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const np = npEs(fill, 's')
      const a = fill.adj as Word
      const num = npNumber(fill, 's')
      const g = (fill['s#noun'] as Word).gender ?? 'm'
      const adjForm = a.adj![num === 'pl' ? (g === 'm' ? 'mp' : 'fp') : g === 'm' ? 'm' : 'f']
      const verb = conjugate(getWord('v-ser'), num === 'pl' ? '3p' : '3s')
      if (kind === 'neg') return capitalize(`${np} no ${verb} ${adjForm}`)
      if (kind === 'yesno') return `¿${capitalize(`${np} ${verb} ${adjForm}`)}?`
      return capitalize(`${np} ${verb} ${adjForm}`)
    },
    ru: (fill, kind) => {
      const np = npRu(fill, 's')
      const a = fill.adj as Word
      const adj = ruNounPhrase(fill['s#noun'] as Word, { adj: a }).split(' ')[0]
      const core = `${capitalize(np)} — ${adj}`
      if (kind === 'neg') return `${capitalize(np)} не ${adj}`
      return kind === 'yesno' ? `${capitalize(np)} — ${adj}?` : core
    },
  },

  // ==========================================================
  // ЭСТАР: место и состояние
  // ==========================================================
  {
    id: 't-pron-estar-place',
    lesson: 17,
    group: 'ser/estar',
    requires: ['v-estar', 'prep-en'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'np', role: 'o', nouns: HUMAN_PLACE_NOUNS, number: 'sg', detSet: 'subject', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const verb = conjugate(getWord('v-estar'), pronPerson(p))
      const np = npEs(fill, 'o')
      const noun = fill['o#noun'] as Word
      // «en casa» — без артикля; «en la escuela» — с артиклем
      const place = noun.id === 'n-casa' ? 'casa' : np
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} en ${place}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} en ${place}`)}?`
      return capitalize(`${p.es} ${verb} en ${place}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const noun = fill['o#noun'] as Word
      const loc = noun.ruCases?.en ?? `в ${ruNounPhrase(noun)}`
      const core = `${capitalize(ruPron(p))} ${loc}`
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${loc}`
      return kind === 'yesno' ? `${capitalize(ruPron(p))} ${loc}?` : core
    },
  },
  {
    id: 't-pron-estar-state',
    lesson: 14,
    group: 'ser/estar',
    requires: ['v-estar'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'adj', words: STATE_ADJ_PEOPLE },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const a = fill.adj as Word
      const verb = conjugate(getWord('v-estar'), pronPerson(p))
      const adjForm = a.adj![pronGender(p) === 'f' ? (pronNumber(p) === 'pl' ? 'fp' : 'f') : pronNumber(p) === 'pl' ? 'mp' : 'm']
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${adjForm}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${adjForm}`)}?`
      return capitalize(`${p.es} ${verb} ${adjForm}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const a = fill.adj as Word
      const adj = ruShortFor(a, p)
      const core = `${capitalize(ruPron(p))} ${adj}`
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${adj}`
      return kind === 'yesno' ? `${capitalize(ruPron(p))} ${adj}?` : core
    },
  },
  {
    id: 't-noun-estar-place',
    lesson: 8,
    group: 'ser/estar',
    requires: ['v-estar', 'prep-en'],
    units: [
      { kind: 'np', role: 's', nouns: SURFACE_NOUNS, number: 'sg', detSet: 'subject', bareAuto: false, withAdj: false },
      { kind: 'np', role: 'o', nouns: HUMAN_PLACE_NOUNS, number: 'sg', detSet: 'subject', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const np = npEs(fill, 's')
      const verb = conjugate(getWord('v-estar'), npNumber(fill, 's') === 'pl' ? '3p' : '3s')
      const noun = fill['o#noun'] as Word
      const place = noun.id === 'n-casa' ? 'casa' : npEs(fill, 'o')
      if (kind === 'neg') return capitalize(`${np} no ${verb} en ${place}`)
      if (kind === 'yesno') return `¿${capitalize(`${np} ${verb} en ${place}`)}?`
      return capitalize(`${np} ${verb} en ${place}`)
    },
    ru: (fill, kind) => {
      const np = npRu(fill, 's')
      const noun = fill['o#noun'] as Word
      const loc = noun.ruCases?.en ?? `в ${ruNounPhrase(noun)}`
      const core = `${capitalize(np)} ${loc}`
      if (kind === 'neg') return `${capitalize(np)} не ${loc}`
      return kind === 'yesno' ? `${capitalize(np)} ${loc}?` : core
    },
  },

  // ==========================================================
  // ИМЕТЬ: tener + существительное
  // ==========================================================
  {
    id: 't-pron-tener-noun',
    lesson: 5,
    group: 'глагол + дополнение',
    requires: ['v-tener'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'np', role: 'o', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const verb = conjugate(getWord('v-tener'), pronPerson(p))
      const np = npEs(fill, 'o')
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${np}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${np}`)}?`
      return capitalize(`${p.es} ${verb} ${np}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const np = npRu(fill, 'o')
      const noun = fill['o#noun'] as Word
      const gen = ruGenitive(noun)
      // «У меня есть…» / «У меня нет…»
      if (kind === 'neg') return `У ${p.pronoun?.ruGen} нет ${gen}`
      if (kind === 'yesno') return `У ${p.pronoun?.ruGen} есть ${np}?`
      return `У ${p.pronoun?.ruGen} есть ${np}`
    },
  },
  {
    id: 't-pron-tener-num',
    lesson: 23,
    group: 'числа и время',
    requires: ['v-tener'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'num', words: NUMBERS_2_4 },
      {
        kind: 'np',
        role: 'o',
        nouns: ALL_WORDS.filter((w) => w.nounClass === 'family' || w.nounClass === 'thing'),
        number: 'pl',
        detSet: 'none',
        bareAuto: false,
        withAdj: false,
      },
    ],
    variants: ['aff', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const num = fill.num as Word
      const noun = fill['o#noun'] as Word
      const verb = conjugate(getWord('v-tener'), pronPerson(p))
      const core = `${p.es} ${verb} ${num.es} ${noun.nounPlural}`
      return kind === 'yesno' ? `¿${capitalize(core)}?` : capitalize(core)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const num = fill.num as Word
      const noun = fill['o#noun'] as Word
      const ruNum = ruNumWord(num, noun)
      const core = `У ${p.pronoun?.ruGen} есть ${ruNum} ${ruGenitive(noun)}`
      return kind === 'yesno' ? `${core}?` : core
    },
  },

  // ==========================================================
  // HAY: есть/имеется
  // ==========================================================
  {
    id: 't-hay-noun',
    lesson: 26,
    group: 'there is/are (hay)',
    requires: ['cstr-hay'],
    units: [
      { kind: 'np', role: 'o', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg'],
    render: (fill, kind) => {
      const np = npEs(fill, 'o')
      return kind === 'neg' ? `No hay ${np}` : capitalize(`hay ${np}`)
    },
    ru: (fill, kind) => {
      const noun = fill['o#noun'] as Word
      const det = fill['o#det'] as Word | null
      const np = npRu(fill, 'o')
      // «мало/много» уже согласуются внутри npRu
      return kind === 'neg' ? capitalize(`нет ${ruGenitive(noun)}`) : capitalize(`есть ${np}`)
    },
  },
  {
    id: 't-hay-place',
    lesson: 26,
    group: 'there is/are (hay)',
    requires: ['cstr-hay', 'prep-en'],
    units: [
      { kind: 'np', role: 's', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: false },
      { kind: 'np', role: 'o', nouns: HUMAN_PLACE_NOUNS, number: 'sg', detSet: 'subject', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg'],
    render: (fill, kind) => {
      const noun = fill['o#noun'] as Word
      const npS = npEs(fill, 's')
      const place = noun.id === 'n-casa' ? 'casa' : npEs(fill, 'o')
      const core = `hay ${npS} en ${place}`
      return kind === 'neg' ? `No ${core}` : capitalize(core)
    },
    ru: (fill, kind) => {
      const placeN = fill['o#noun'] as Word
      const thingN = fill['s#noun'] as Word
      const loc = placeN.ruCases?.en ?? `в ${ruNounPhrase(placeN)}`
      return kind === 'neg'
        ? capitalize(`${loc} нет ${ruGenitive(thingN)}`)
        : capitalize(`${loc} есть ${ruNounPhrase(thingN)}`)
    },
  },

  // ==========================================================
  // ГЛАГОЛ + ДОПОЛНЕНИЕ: местоимение-подлежащее
  // ==========================================================
  {
    id: 't-pron-v-do',
    lesson: 4,
    group: 'глагол + дополнение',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'verbObj', verbRole: 'v', verbs: TRANSITIVE_VERBS, nounRole: 'o', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const verb = conjugate(v, pronPerson(p))
      const np = npEs(fill, 'o')
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${np}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${np}`)}?`
      return capitalize(`${p.es} ${verb} ${np}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      // tener → «У меня есть…»: после «есть» — именительный падеж
      if (v.id === 'v-tener') {
        const noun = fill['o#noun'] as Word
        const npNom = npRu(fill, 'o')
        if (kind === 'neg') return `У ${p.pronoun?.ruGen} нет ${ruGenitive(noun)}`
        if (kind === 'yesno') return `У ${p.pronoun?.ruGen} есть ${npNom}?`
        return `У ${p.pronoun?.ruGen} есть ${npNom}`
      }
      const np = npRuAcc(fill, 'o')
      const core = `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${np}`
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${np}`
      return kind === 'yesno' ? `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${np}?` : core
    },
  },
  {
    id: 't-pron-v-do-adj',
    lesson: 13,
    group: 'глагол + дополнение',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'verbObj', verbRole: 'v', verbs: TRANSITIVE_VERBS, nounRole: 'o', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: true },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const verb = conjugate(v, pronPerson(p))
      const np = npEs(fill, 'o')
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${np}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${np}`)}?`
      return capitalize(`${p.es} ${verb} ${np}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const np = npRuAcc(fill, 'o')
      if (v.id === 'v-tener') {
        const noun = fill['o#noun'] as Word
        if (kind === 'neg') return `У ${p.pronoun?.ruGen} нет ${ruGenitive(noun)}`
        if (kind === 'yesno') return `У ${p.pronoun?.ruGen} есть ${np}?`
        return `У ${p.pronoun?.ruGen} есть ${np}`
      }
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${np}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${np}?`
      return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${np}`
    },
  },
  {
    // Глагол + дополнение-лицо (личное «a»): Veo a mi madre
    id: 't-pron-v-person',
    lesson: 6,
    group: 'глагол + дополнение',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v', words: PERSON_VERBS },
      { kind: 'np', role: 'o', nouns: PERSON_NOUNS, number: 'sg', detSet: 'subject', bareAuto: false, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const verb = conjugate(v, pronPerson(p))
      const noun = fill['o#noun'] as Word
      const det = fill['o#det'] as Word | null
      // Личное «a» + именная группа; contraction a+el → al
      const np = npEs(fill, 'o')
      const withA = joinPrepNP('a', np)
      const hasDet = !!det
      if (!hasDet) return capitalize(`${p.es} ${verb} ${withA}`)
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${withA}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${withA}`)}?`
      return capitalize(`${p.es} ${verb} ${withA}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const noun = fill['o#noun'] as Word
      const ruCaseKey = PERSON_VERB_RU_CASE[v.id] ?? 'a'
      const ruNoun = noun.ruCases?.[ruCaseKey] ?? ruAccusative(noun)
      const ruCore = `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${ruNoun}`
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${ruNoun}`
      return kind === 'yesno' ? `${ruCore}?` : ruCore
    },
  },
  {
    // Глагол + язык без предлога: hablo español
    id: 't-pron-v-lang',
    lesson: 32,
    group: 'глагол + дополнение',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v', words: LANGUAGE_VERBS },
      {
        kind: 'np',
        role: 'o',
        nouns: ALL_WORDS.filter((w) => w.nounClass === 'language'),
        number: 'sg',
        detSet: 'none',
        bareAuto: false,
        withAdj: false,
      },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const lang = fill['o#noun'] as Word
      const verb = conjugate(v, pronPerson(p))
      const core = `${p.es} ${verb} ${lang.es}`
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${lang.es}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${lang.es}`)}?`
      return capitalize(core)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const lang = fill['o#noun'] as Word
      // hablar/saber → «по-испански», aprender/estudiar → «испанский»
      const langRu = v.id === 'v-hablar' || v.id === 'v-saber' ? ruLanguageAdverb(lang) : ruAccusative(lang)
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${langRu}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${langRu}?`
      return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${langRu}`
    },
  },
  {
    // Отрицание + nada: «No veo nada» — Я ничего не вижу
    id: 't-pron-v-nada',
    lesson: 25,
    group: 'глагол + дополнение',
    requires: ['p-nada'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v', words: TRANSITIVE_VERBS },
    ],
    variants: ['neg'],
    render: (fill) => {
      const p = fill.s as Word
      const v = fill.v as Word
      return capitalize(`${p.es} no ${conjugate(v, pronPerson(p))} nada`)
    },
    ru: (fill) => {
      const p = fill.s as Word
      const v = fill.v as Word
      return `${capitalize(ruPron(p))} ничего не ${ruVerbP(v, p)}`
    },
  },

  // ==========================================================
  // ГЛАГОЛ + ДОПОЛНЕНИЕ: существительное-подлежащее
  // ==========================================================
  {
    id: 't-noun-v-do',
    lesson: 6,
    group: 'глагол + дополнение',
    requires: [],
    units: [
      { kind: 'np', role: 's', nouns: PERSON_NOUNS, number: 'any', detSet: 'subject', bareAuto: false, withAdj: false },
      { kind: 'verbObj', verbRole: 'v', verbs: TRANSITIVE_VERBS, nounRole: 'o', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const np = npEs(fill, 's')
      const v = fill.v as Word
      const verb = conjugate(v, npNumber(fill, 's') === 'pl' ? '3p' : '3s')
      const npO = npEs(fill, 'o')
      if (kind === 'neg') return capitalize(`${np} no ${verb} ${npO}`)
      if (kind === 'yesno') return `¿${capitalize(`${np} ${verb} ${npO}`)}?`
      return capitalize(`${np} ${verb} ${npO}`)
    },
    ru: (fill, kind) => {
      const np = npRu(fill, 's')
      const v = fill.v as Word
      const subj = fill['s#noun'] as Word
      const ruForm = npNumber(fill, 's') === 'pl' ? ruVerbI(v, 5) : ruVerbI(v, 2)
      const npO = npRuAcc(fill, 'o')
      if (v.id === 'v-tener') {
        const noun = fill['o#noun'] as Word
        // после «есть» — именительный падеж («У мужчины есть идея»)
        const npNom = npRu(fill, 'o')
        if (kind === 'neg') return `У ${ruGenitive(subj)} нет ${ruGenitive(noun)}`
        return kind === 'yesno' ? `У ${ruGenitive(subj)} есть ${npNom}?` : `У ${ruGenitive(subj)} есть ${npNom}`
      }
      if (kind === 'neg') return `${capitalize(np)} не ${ruForm} ${npO}`
      if (kind === 'yesno') return `${capitalize(np)} ${ruForm} ${npO}?`
      return `${capitalize(np)} ${ruForm} ${npO}`
    },
  },
  {
    id: 't-noun-v-do-adj',
    lesson: 13,
    group: 'глагол + дополнение',
    requires: [],
    units: [
      { kind: 'np', role: 's', nouns: PERSON_NOUNS, number: 'sg', detSet: 'subject', bareAuto: false, withAdj: false },
      { kind: 'verbObj', verbRole: 'v', verbs: TRANSITIVE_VERBS, nounRole: 'o', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: true },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const np = npEs(fill, 's')
      const v = fill.v as Word
      const verb = conjugate(v, '3s')
      const npO = npEs(fill, 'o')
      if (kind === 'neg') return capitalize(`${np} no ${verb} ${npO}`)
      if (kind === 'yesno') return `¿${capitalize(`${np} ${verb} ${npO}`)}?`
      return capitalize(`${np} ${verb} ${npO}`)
    },
    ru: (fill, kind) => {
      const np = npRu(fill, 's')
      const v = fill.v as Word
      const npO = npRuAcc(fill, 'o')
      const ruForm = ruVerbI(v, 2)
      if (v.id === 'v-tener') {
        const subj = fill['s#noun'] as Word
        const noun = fill['o#noun'] as Word
        if (kind === 'neg') return `У ${ruGenitive(subj)} нет ${ruGenitive(noun)}`
        return kind === 'yesno' ? `У ${ruGenitive(subj)} есть ${npO}?` : `У ${ruGenitive(subj)} есть ${npO}`
      }
      if (kind === 'neg') return `${capitalize(np)} не ${ruForm} ${npO}`
      if (kind === 'yesno') return `${capitalize(np)} ${ruForm} ${npO}?`
      return `${capitalize(np)} ${ruForm} ${npO}`
    },
  },
  {
    // Существительное-подлежащее + глагол с лицом: El niño ve a la maestra
    id: 't-noun-v-person',
    lesson: 7,
    group: 'глагол + дополнение',
    requires: [],
    units: [
      { kind: 'np', role: 's', nouns: PERSON_NOUNS, number: 'sg', detSet: 'subject', bareAuto: false, withAdj: false },
      { kind: 'free', role: 'v', words: PERSON_VERBS },
      { kind: 'np', role: 'o', nouns: PERSON_NOUNS, number: 'sg', detSet: 'subject', bareAuto: false, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const np = npEs(fill, 's')
      const v = fill.v as Word
      const verb = conjugate(v, '3s')
      const npO = joinPrepNP('a', npEs(fill, 'o'))
      if (kind === 'neg') return capitalize(`${np} no ${verb} ${npO}`)
      if (kind === 'yesno') return `¿${capitalize(`${np} ${verb} ${npO}`)}?`
      return capitalize(`${np} ${verb} ${npO}`)
    },
    ru: (fill, kind) => {
      const np = npRu(fill, 's')
      const v = fill.v as Word
      const noun = fill['o#noun'] as Word
      const ruCaseKey = PERSON_VERB_RU_CASE[v.id] ?? 'a'
      const ruNoun = noun.ruCases?.[ruCaseKey] ?? ruAccusative(noun)
      const ruForm = ruVerbI(v, 2)
      if (kind === 'neg') return `${capitalize(np)} не ${ruForm} ${ruNoun}`
      if (kind === 'yesno') return `${capitalize(np)} ${ruForm} ${ruNoun}?`
      return `${capitalize(np)} ${ruForm} ${ruNoun}`
    },
  },

  // ==========================================================
  // ГЛАГОЛ + ПРЕДЛОГ + СУЩЕСТВИТЕЛЬНОЕ
  // ==========================================================
  {
    id: 't-pron-v-prep-np',
    lesson: 17,
    group: 'глагол + предлог',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'verbPrep', verbRole: 'v', verbs: PREP_VERBS, prepRole: 'prep', preps: wordsByPos('preposition'), nounRole: 'o', nouns: ALL_WORDS.filter((w) => w.pos === 'noun'), number: 'sg' },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const prep = fill.prep as Word
      const verb = conjugate(v, pronPerson(p))
      const noun = fill['o#noun'] as Word
      // «en casa» и «a casa» без артикля
      const bare = noun.id === 'n-casa' && (prep.id === 'prep-en' || prep.id === 'prep-a')
      const np = bare ? 'casa' : npEs(fill, 'o')
      const es = joinPrepNP(prep.es, np)
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${es}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${es}`)}?`
      return capitalize(`${p.es} ${verb} ${es}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const prep = fill.prep as Word
      const noun = fill['o#noun'] as Word
      // Русская падежная форма по предлогу (с учётом pensar en → «о»)
      const ruKey = verbPrepRuKey(v.id, prep.id)
      const ruNoun = noun.ruCases?.[ruKey as import('../types').RuCaseKey] ?? `? ${noun.ru[0] ?? noun.es}`
      // estar → без глагола: «Я в школе»
      if (v.id === 'v-estar') {
        if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruNoun}`
        if (kind === 'yesno') return `${capitalize(ruPron(p))} ${ruNoun}?`
        return `${capitalize(ruPron(p))} ${ruNoun}`
      }
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${ruNoun}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${ruNoun}?`
      return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${ruNoun}`
    },
  },

  // ==========================================================
  // МОДАЛЬНЫЕ ГЛАГОЛЫ И КОНСТРУКЦИИ + ИНФИНИТИВ
  // ==========================================================
  {
    id: 't-pron-modal-inf',
    lesson: 5,
    group: 'модальные глаголы',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v', words: MODAL_VERBS },
      { kind: 'free', role: 'v2', words: CONJUGATED_VERBS },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const v2 = fill.v2 as Word
      const verb = conjugate(v, pronPerson(p))
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${v2.es}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${v2.es}`)}?`
      return capitalize(`${p.es} ${verb} ${v2.es}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const v2 = fill.v2 as Word
      const inf = v2.verb?.ruInf ?? v2.ru[0]
      // necesitar → «Мне нужно…», остальные → «Я могу/хочу…»
      let core: string
      if (v.id === 'v-necesitar') {
        core = `${capitalize(p.pronoun?.ruDat ?? '')} нужно ${inf}`
        if (kind === 'neg') core = `${capitalize(p.pronoun?.ruDat ?? '')} не нужно ${inf}`
      } else {
        core = `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${inf}`
        if (kind === 'neg') core = `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${inf}`
      }
      return kind === 'yesno' ? `${core.replace('?', '')}?`.replace('..', '.') : core
    },
  },
  {
    id: 't-pron-tener-que-inf',
    lesson: 26,
    group: 'модальные глаголы',
    requires: ['v-tener', 'cstr-tener-que'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v2', words: CONJUGATED_VERBS },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v2 = fill.v2 as Word
      const verb = conjugate(getWord('v-tener'), pronPerson(p))
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} que ${v2.es}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} que ${v2.es}`)}?`
      return capitalize(`${p.es} ${verb} que ${v2.es}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v2 = fill.v2 as Word
      const inf = v2.verb?.ruInf ?? v2.ru[0]
      // должны (мн.ч. и вежливое «вы») / должен / должна
      const must = ruPluralSubject(p) ? 'должны' : pronGender(p) === 'f' ? 'должна' : 'должен'
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${must} ${inf}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${must} ${inf}?`
      return `${capitalize(ruPron(p))} ${must} ${inf}`
    },
  },
  {
    id: 't-pron-ir-a-inf',
    lesson: 26,
    group: 'модальные глаголы',
    requires: ['v-ir', 'cstr-ir-a'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v2', words: CONJUGATED_VERBS },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v2 = fill.v2 as Word
      const verb = conjugate(getWord('v-ir'), pronPerson(p))
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} a ${v2.es}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} a ${v2.es}`)}?`
      return capitalize(`${p.es} ${verb} a ${v2.es}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v2 = fill.v2 as Word
      const inf = v2.verb?.ruInf ?? v2.ru[0]
      // ir a + инфинитив = будущее время: «Я буду есть»
      const fut = ruFuture(p)
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${fut} ${inf}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${fut} ${inf}?`
      return `${capitalize(ruPron(p))} ${fut} ${inf}`
    },
  },
  {
    id: 't-hay-que-inf',
    lesson: 26,
    group: 'модальные глаголы',
    requires: ['cstr-hay-que'],
    units: [{ kind: 'free', role: 'v2', words: CONJUGATED_VERBS }],
    variants: ['aff', 'neg'],
    render: (fill, kind) => {
      const v2 = fill.v2 as Word
      return kind === 'neg' ? `No hay que ${v2.es}` : capitalize(`hay que ${v2.es}`)
    },
    ru: (fill, kind) => {
      const v2 = fill.v2 as Word
      const inf = v2.verb?.ruInf ?? v2.ru[0]
      return kind === 'neg' ? capitalize(`не нужно ${inf}`) : capitalize(`нужно ${inf}`)
    },
  },

  // ==========================================================
  // GUSTAR: нравиться
  // ==========================================================
  {
    id: 't-pron-gustar-np',
    lesson: 26,
    group: 'gustar',
    requires: ['v-gustar'],
    units: [
      { kind: 'free', role: 'io', words: IO_PRONOUNS },
      { kind: 'np', role: 'o', nouns: THING_NOUNS, number: 'any', detSet: 'object', bareAuto: false, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const io = fill.io as Word
      const num = npNumber(fill, 'o')
      const verb = conjugate(getWord('v-gustar'), num === 'pl' ? '3p' : '3s')
      const np = npEs(fill, 'o')
      if (kind === 'neg') return `No ${io.es} ${verb} ${np}`
      if (kind === 'yesno') return `¿${capitalize(`${io.es} ${verb} ${np}`)}?`
      return capitalize(`${io.es} ${verb} ${np}`)
    },
    ru: (fill, kind) => {
      const io = fill.io as Word
      const det = fill['o#det'] as Word | null
      const num = det?.det?.quantity ? 'sg' : npNumber(fill, 'o')
      const np = npRu(fill, 'o')
      const g = ruGustarForm(fill['o#noun'] as Word, num)
      if (kind === 'neg') return `${capitalize(io.ru[0] ?? '')} не ${g} ${np}`
      if (kind === 'yesno') return `${capitalize(io.ru[0] ?? '')} ${g} ${np}?`
      return `${capitalize(io.ru[0] ?? '')} ${g} ${np}`
    },
  },

  // ==========================================================
  // НАРЕЧИЯ
  // ==========================================================
  {
    id: 't-pron-v-adverb',
    lesson: 19,
    group: 'наречия',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'adv', words: PREVERB_ADVERBS },
      { kind: 'free', role: 'v', words: CONJUGATED_VERBS },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const adv = fill.adv as Word
      const v = fill.v as Word
      const verb = conjugate(v, pronPerson(p))
      // nunca + no: «Nunca como» / отрицание: «No siempre como»
      const neg = kind === 'neg' ? 'no ' : ''
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${adv.es} ${verb}`)}?`
      return capitalize(`${p.es} ${neg}${adv.es} ${verb}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const adv = fill.adv as Word
      const v = fill.v as Word
      const ruForm = ruVerbP(v, p)
      // nunca → «никогда не…», остальные — как есть
      const neg = kind === 'neg' ? 'не ' : ''
      const core = `${capitalize(ruPron(p))} ${neg}${adv.ru[0]} ${ruForm}`.replace('не ', 'не  ')
      return kind === 'yesno' ? `${core}?` : core.replace('  ', ' ')
    },
  },
  {
    // «Nunca como» — никогда не ем (отдельно: никогда не сочетается с «no»)
    id: 't-pron-nunca-v',
    lesson: 19,
    group: 'наречия',
    requires: ['adv-nunca'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v', words: CONJUGATED_VERBS },
    ],
    variants: ['aff', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const verb = conjugate(v, pronPerson(p))
      const core = `${p.es} nunca ${verb}`
      return kind === 'yesno' ? `¿${capitalize(core)}?` : capitalize(core)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const core = `${capitalize(ruPron(p))} никогда не ${ruVerbP(v, p)}`
      return kind === 'yesno' ? `${core}?` : core
    },
  },
  {
    id: 't-pron-v-place-adv',
    lesson: 19,
    group: 'наречия',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v', words: PLACE_ADV_VERBS },
      { kind: 'free', role: 'adv', words: PLACE_ADVERBS },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const adv = fill.adv as Word
      const verb = conjugate(v, pronPerson(p))
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${adv.es}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${adv.es}`)}?`
      return capitalize(`${p.es} ${verb} ${adv.es}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const adv = fill.adv as Word
      // estar → «Я здесь» (без глагола)
      if (v.id === 'v-estar') {
        const core = `${capitalize(ruPron(p))} ${adv.ru[0]}`
        if (kind === 'neg') return `${capitalize(ruPron(p))} не ${adv.ru[0]}`
        return kind === 'yesno' ? `${core}?` : core
      }
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${adv.ru[0]}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${adv.ru[0]}?`
      return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${adv.ru[0]}`
    },
  },
  {
    id: 't-pron-v-manner',
    lesson: 19,
    group: 'наречия',
    requires: [],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'free', role: 'v', words: MANNER_VERBS },
      { kind: 'free', role: 'adv', words: MANNER_ADVERBS },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const adv = fill.adv as Word
      const verb = conjugate(v, pronPerson(p))
      if (kind === 'neg') return capitalize(`${p.es} no ${verb} ${adv.es}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${verb} ${adv.es}`)}?`
      return capitalize(`${p.es} ${verb} ${adv.es}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const adv = fill.adv as Word
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${ruVerbP(v, p)} ${adv.ru[0]}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${adv.ru[0]}?`
      return `${capitalize(ruPron(p))} ${ruVerbP(v, p)} ${adv.ru[0]}`
    },
  },

  // ==========================================================
  // ЭСТАР + ГЕРУНДИЙ: «Я (сейчас) ем»
  // ==========================================================
  {
    id: 't-pron-estar-gerund',
    lesson: 26,
    group: 'модальные глаголы',
    requires: ['v-estar', 'cstr-estar-gerundio'],
    units: [
      { kind: 'free', role: 's', words: SUBJECT_PRONOUNS },
      { kind: 'verbObj', verbRole: 'v', verbs: TRANSITIVE_VERBS, nounRole: 'o', nouns: THING_NOUNS, number: 'sg', detSet: 'object', bareAuto: true, withAdj: false },
    ],
    variants: ['aff', 'neg', 'yesno'],
    render: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const ger = gerundOf(v)
      const np = npEs(fill, 'o')
      const estar = conjugate(getWord('v-estar'), pronPerson(p))
      if (kind === 'neg') return capitalize(`${p.es} no ${estar} ${ger} ${np}`)
      if (kind === 'yesno') return `¿${capitalize(`${p.es} ${estar} ${ger} ${np}`)}?`
      return capitalize(`${p.es} ${estar} ${ger} ${np}`)
    },
    ru: (fill, kind) => {
      const p = fill.s as Word
      const v = fill.v as Word
      const np = npRuAcc(fill, 'o')
      // estar + герундий ≈ русское настоящее: «Я (сейчас) ем хлеб»
      const form = ruVerbP(v, p)
      if (kind === 'neg') return `${capitalize(ruPron(p))} не ${form} ${np}`
      if (kind === 'yesno') return `${capitalize(ruPron(p))} ${form} ${np}?`
      return `${capitalize(ruPron(p))} ${form} ${np}`
    },
  },

  // ==========================================================
  // ЧИСЛА И ВРЕМЯ
  // ==========================================================
  {
    id: 't-hace-tiempo',
    lesson: 30,
    group: 'числа и время',
    requires: ['cstr-hace-tiempo'],
    units: [
      { kind: 'free', role: 'num', words: NUMBERS_2_4 },
      { kind: 'np', role: 'o', nouns: TIME_NOUNS, number: 'pl', detSet: 'none', bareAuto: false, withAdj: false },
    ],
    variants: ['aff'],
    render: (fill) => {
      const num = fill.num as Word
      const noun = fill['o#noun'] as Word
      return capitalize(`hace ${num.es} ${noun.nounPlural}`)
    },
    ru: (fill) => {
      const num = fill.num as Word
      const noun = fill['o#noun'] as Word
      return `${capitalize(ruNumWord(num, noun))} ${ruGenitive(noun)} назад`
    },
  },

  // ==========================================================
  // ВОПРОСЫ С ВОПРОСИТЕЛЬНЫМИ СЛОВАМИ
  // ==========================================================
  qwTemplate('t-qw-que', 'qw-que', 'что', TRANSITIVE_VERBS),
  qwTemplate('t-qw-donde', 'qw-donde', 'где', PLACE_ADV_VERBS),
  qwTemplate('t-qw-cuando', 'qw-cuando', 'когда', CONJUGATED_VERBS),
  qwTemplate('t-qw-porque', 'qw-por-que', 'почему', CONJUGATED_VERBS),
  {
    id: 't-qw-quien',
    lesson: 21,
    group: 'вопросы',
    // «Quién» — тоже слово: появляется только после изучения
    requires: ['qw-quien'],
    questionWord: getWord('qw-quien'),
    units: [{ kind: 'free', role: 'v', words: CONJUGATED_VERBS }],
    variants: ['qw'],
    render: (fill) => `¿Quién ${(fill.v as Word).verb!.forms['3s']}?`,
    ru: (fill) => `Кто ${(fill.v as Word).verb!.ruForms![2]}?`,
  },
  {
    id: 't-qw-como-estar',
    lesson: 3,
    group: 'вопросы',
    // без изученного «cómo» фраза не собирается (раньше «¿Cómo estás?»
    // выдавалось до изучения вопросительного слова)
    requires: ['v-estar', 'qw-como'],
    questionWord: getWord('qw-como'),
    units: [{ kind: 'free', role: 's', words: ['p-tu', 'p-usted'].map(getWord) }],
    variants: ['qw'],
    render: (fill) => `¿Cómo está${(fill.s as Word).id === 'p-tu' ? 's' : ''} ${(fill.s as Word).es}?`,
    ru: (fill) => `Как ${ruPron(fill.s as Word)}?`,
  },
  {
    id: 't-qw-cuantos-anos',
    lesson: 30,
    group: 'вопросы',
    requires: ['v-tener', 'n-ano', 'qw-cuanto'],
    questionWord: getWord('qw-cuanto'),
    units: [{ kind: 'free', role: 's', words: ['p-tu', 'p-usted'].map(getWord) }],
    variants: ['qw'],
    render: (fill) => `¿Cuántos años tiene${(fill.s as Word).id === 'p-tu' ? 's' : ''} ${(fill.s as Word).es}?`,
    ru: () => `Сколько тебе лет?`,
  },
  {
    id: 't-qw-cual-es',
    lesson: 21,
    group: 'вопросы',
    requires: ['v-ser', 'qw-cual'],
    questionWord: getWord('qw-cual'),
    units: [
      { kind: 'np', role: 'o', nouns: ALL_WORDS.filter((w) => w.nounClass === 'thing' || w.nounClass === 'abstract'), number: 'sg', detSet: 'subject', bareAuto: false, withAdj: false },
    ],
    variants: ['qw'],
    render: (fill) => `¿Cuál es ${npEs(fill, 'o')}?`,
    ru: (fill) => {
      const noun = fill['o#noun'] as Word
      const g = noun.ruGender ?? 'm'
      const q = ruAdjForm('какой', g, 'sg')
      return capitalize(`${q} ${npRu(fill, 'o')}?`)
    },
  },
]

/** Вопросительный шаблон: ¿QW + глагол (2-е лицо ед.ч.)? */
function qwTemplate(id: string, qwId: string, ruQw: string, verbs: Word[]): Template {
  return {
    id,
    lesson: 21,
    group: 'вопросы',
    requires: [qwId],
    questionWord: getWord(qwId),
    units: [{ kind: 'free', role: 'v', words: verbs }],
    variants: ['qw'],
    render: (fill) => {
      const qw = getWord(qwId)
      const v = fill.v as Word
      return `¿${capitalize(qw.es)} ${v.verb!.forms['2s']}?`
    },
    ru: (fill) => {
      const v = fill.v as Word
      // estar → «Где ты?» (в русском без глагола)
      if (v.id === 'v-estar') return `${capitalize(ruQw)} ты?`
      return `${capitalize(ruQw)} ты ${ruVerbI(v, 1)}?`
    },
  }
}

/** Карта русских падежных ключей для связок глагол+предлог */
const VERB_PREP_RU: Record<string, Record<string, string>> = {
  'v-pensar': { 'prep-en': 'sobre' },
}

function verbPrepRuKey(verbId: string, prepId: string): string {
  return VERB_PREP_RU[verbId]?.[prepId] ?? prepId.replace('prep-', '')
}

/** Русское будущее время: буду/будешь/будет/будем/будете/будут */
function ruFuture(pron: Word): string {
  const id = pron.id
  if (id === 'p-yo') return 'буду'
  if (id === 'p-tu') return 'будешь'
  if (id === 'p-usted' || id === 'p-ustedes') return 'будете'
  if (id === 'p-nosotros') return 'будем'
  if (id === 'p-ella') return 'будет'
  return 'будут'
}

// Экспорт для тестов и страниц
export function allTemplates(): Template[] {
  return TEMPLATES
}

void ruAdjForm
