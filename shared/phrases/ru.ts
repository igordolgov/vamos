// ============================================================
// shared/phrases/ru.ts — русское согласование для переводов фраз.
//
// Русские прилагательные согласуются с существительным в роде и числе:
// «белый дом», «белая машина», «белое окно», «белые столы».
// Формы вычисляются от мужского рода (все наши прилагательные
// заканчиваются на -ый / -ой / -ий — правило регулярное).
// ============================================================

import type { GramNumber, Word } from '../types'
import { ruGenitive, ruPlural } from './ru-morph'

/**
 * Род и число для русского согласования:
 * — ruGender переопределяет род (проблема — ж.р.);
 * — ruPluralOnly (часы, деньги) — прилагательное всегда во мн.ч.
 */
function ruAgreement(noun: Word, number: GramNumber): { gender: 'm' | 'f' | 'n'; number: GramNumber } {
  return {
    gender: noun.ruGender ?? 'm',
    number: noun.ruPluralOnly ? 'pl' : number,
  }
}

/**
 * Форма русского прилагательного: белый → белая / белое / белые.
 * caseForm = 'acc' — винительный неодушевлённых: отличается от именительного
 * только в ж.р. ед.ч. (дешёвая музыка → дешёвую музыку).
 */
export function ruAdjForm(
  adjRaw: string,
  gender: 'm' | 'f' | 'n',
  number: GramNumber,
  caseForm: 'nom' | 'acc' = 'nom',
): string {
  // пояснение в скобках («дорогой (цена)») — не часть словоформы
  const adjMasculine = adjRaw.replace(/\s*\(.*\)\s*/, '')
  if (number === 'pl') {
    // вин. мн.ч. неодушевлённых = им. мн.ч.
    return ruAdjPlural(adjMasculine)
  }
  const stem = adjMasculine.slice(0, -2)
  const end = adjMasculine.slice(-2)
  if (end === 'ий') {
    const last = stem.slice(-1)
    // к/г/х — твёрдая основа: высокая/высокое/высокую
    if ('кгх'.includes(last)) {
      if (gender === 'f') return stem + (caseForm === 'acc' ? 'ую' : 'ая')
      if (gender === 'n') return stem + 'ое'
      return adjMasculine
    }
    // шипящие ж/ш/ч/щ: хорошая/хорошее/хорошую
    if ('жшщч'.includes(last)) {
      if (gender === 'f') return stem + (caseForm === 'acc' ? 'ую' : 'ая')
      if (gender === 'n') return stem + 'ее'
      return adjMasculine
    }
    // мягкая основа: синяя/синее/синюю
    if (gender === 'f') return stem + (caseForm === 'acc' ? 'юю' : 'яя')
    if (gender === 'n') return stem + 'ее'
    return adjMasculine
  }
  // -ый и -ой: ж.р. -ая (вин. -ую), с.р. -ое
  if (gender === 'f') return stem + (caseForm === 'acc' ? 'ую' : 'ая')
  if (gender === 'n') return stem + 'ое'
  return adjMasculine
}

/** Мн.ч. русского прилагательного: -ий → -ие, иначе -ые,
 *  но после к/г/х/ж/ш/ч/щ — «-ие» (правило жи-ши:
 *  большие, плохие, дорогие, какие — не «большые», «какые») */
function ruAdjPlural(adjMasculine: string): string {
  const stem = adjMasculine.slice(0, -2)
  const end = adjMasculine.slice(-2)
  if (end === 'ий') return stem + 'ие'
  if ('кгхжшщч'.includes(stem.slice(-1))) return stem + 'ие'
  return stem + 'ые'
}

/**
 * Русская форма определителя: мой → моё / моя / мою (вин. ж.р.) / мои.
 * Формы заданы в данных слова (ruDet); без них — базовый перевод.
 */
export function ruDetForm(
  det: Word,
  gender: 'm' | 'f' | 'n',
  number: GramNumber,
  caseForm: 'nom' | 'acc' = 'nom',
): string {
  const f = det.ruDet
  if (!f) return det.ru[0] ?? ''
  if (number === 'pl') return f.pl
  if (gender === 'f') return caseForm === 'acc' ? f.accF : f.f
  if (gender === 'n') return f.n
  return f.m
}

/** Русская форма существительного (мн.ч. вычисляется механически) */
export function ruNounForm(noun: Word, number: GramNumber): string {
  const w = (noun.ru[0] ?? noun.es).replace(/\s*\(.*\)\s*/, '')
  if (number === 'pl') return ruPlural(noun)
  return w
}

/**
 * Русская именная группа: [определитель] [прилагательное] [существительное].
 * Артикли в русском переводе не передаются (у русского нет артиклей).
 * «много/мало» требуют родительного падежа: много работы.
 */
export function ruNounPhrase(
  noun: Word,
  opts: { number?: GramNumber; det?: Word; adj?: Word } = {},
): string {
  const number = opts.number ?? 'sg'
  const { gender, number: ruNum } = ruAgreement(noun, number)
  const parts: string[] = []

  const det = opts.det
  const isQuantity = !!det?.det?.quantity
  const isArticle = !!det?.det?.definite || !!det?.det?.indefinite

  if (det && !isArticle) {
    parts.push(ruDetForm(det, gender, ruNum))
  }

  if (opts.adj && !isQuantity) {
    const masc = opts.adj.ruByClass?.[noun.nounClass ?? 'thing'] ?? (opts.adj.ru[0] ?? opts.adj.adj!.m)
    parts.push(ruAdjForm(masc, gender, ruNum))
  }

  // «много/мало» + родительный падеж: «много работы»
  parts.push(isQuantity ? ruGenitive(noun) : ruNounForm(noun, number))
  return parts.join(' ')
}

/**
 * Русское прилагательное, согласованное с существительным:
 * «Молоко — дорогое» (с.р.), «Деньги — большие» (plural-only).
 * Учитывает ruByClass («богатый/вкусный») и пояснения в скобках.
 */
export function ruAdjForNoun(noun: Word, adj: Word, number: GramNumber = 'sg'): string {
  const { gender, number: ruNum } = ruAgreement(noun, number)
  const masc = adj.ruByClass?.[noun.nounClass ?? 'thing'] ?? (adj.ru[0] ?? adj.adj!.m)
  return ruAdjForm(masc, gender, ruNum)
}

/** Форма глагола «нравиться» в русском: нравится / нравятся */
export function ruGustarForm(noun: Word, number: GramNumber): string {
  return number === 'pl' ? 'нравятся' : 'нравится'
}

/** Заглавная первая буква (для начала русского предложения) */
export function ruCapitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
