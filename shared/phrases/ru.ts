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
 */
export function ruAdjForm(adjMasculine: string, gender: 'm' | 'f' | 'n', number: GramNumber): string {
  if (number === 'pl') {
    return ruAdjPlural(adjMasculine)
  }
  const stem = adjMasculine.slice(0, -2)
  const end = adjMasculine.slice(-2)
  if (end === 'ий') {
    if (gender === 'f') return stem + 'яя'
    if (gender === 'n') return stem + 'ее'
    return adjMasculine
  }
  // -ый и -ой: ж.р. -ая, с.р. -ое
  if (gender === 'f') return stem + 'ая'
  if (gender === 'n') return stem + 'ое'
  return adjMasculine
}

/** Мн.ч. русского прилагательного: -ий → -ие, иначе -ые */
function ruAdjPlural(adjMasculine: string): string {
  const stem = adjMasculine.slice(0, -2)
  const end = adjMasculine.slice(-2)
  if (end === 'ий') return stem + 'ие'
  return stem + 'ые'
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
    parts.push(det.ru[0] ?? '')
  }

  if (opts.adj && !isQuantity) {
    const masc = opts.adj.ruByClass?.[noun.nounClass ?? 'thing'] ?? (opts.adj.ru[0] ?? opts.adj.adj!.m)
    parts.push(ruAdjForm(masc, gender, ruNum))
  }

  // «много/мало» + родительный падеж: «много работы»
  parts.push(isQuantity ? ruGenitive(noun) : ruNounForm(noun, number))
  return parts.join(' ')
}

/** Форма глагола «нравиться» в русском: нравится / нравятся */
export function ruGustarForm(noun: Word, number: GramNumber): string {
  return number === 'pl' ? 'нравятся' : 'нравится'
}

/** Заглавная первая буква (для начала русского предложения) */
export function ruCapitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
