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
 * Русская именная группа: [подсказка артикля] [определитель] [прилагательное] [существительное].
 * Артикли в русском переводе не передаются (у русского нет артиклей).
 * «много/мало» требуют родительного падежа: много работы.
 * opts.hint — подсказка в скобках на месте артикля: «(какой-то) маленький хлеб»
 * (el/la → «известный», un/una → «какой-то») — иначе промпт «Учитель хочет
 * маленький хлеб» отвечает и «El maestro…», и «Un maestro…» (жалоба пользователя).
 */
export function ruNounPhrase(
  noun: Word,
  opts: { number?: GramNumber; det?: Word; adj?: Word; hint?: boolean } = {},
): string {
  const number = opts.number ?? 'sg'
  const { gender, number: ruNum } = ruAgreement(noun, number)
  const parts: string[] = []

  const det = opts.det
  const isQuantity = !!det?.det?.quantity
  const isArticle = !!det?.det?.definite || !!det?.det?.indefinite

  if (opts.hint) {
    const hint = ruArticleHint(noun, det, number)
    // hint с ведущим пробелом — для вставки внутрь «в (какой-то) школе»;
    // здесь parts.join(' ') сам ставит пробел — обрезаем
    if (hint) parts.push(hint.trim())
  }

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

// ============================================================
// Подсказка артикля в русском промпте
// ============================================================
// Русский не передаёт el/un — один и тот же промпт «Учитель хочет маленький
// хлеб» отвечает и «El maestro quiere un pan pequeño», и «Un maestro quiere
// el pan pequeño» (жалоба пользователя). На месте артикля ставим подсказку:
// el/la → «(известный)», un/una → «(какой-то)». Форма согласуется с
// существительным и падежом: «вижу (какую-то) учительницу».
// «известный» вместо «конкретный» (просьба пользователя): проще по смыслу —
// «тот самый, уже знакомый». Подсказки НЕТ, когда артикля во фразе и не
// может быть: мой/твой/наш, этот/тот и «много/мало» сами заменяют артикль
// и видны в переводе.

type HintCase = 'nom' | 'acc' | 'gen' | 'dat' | 'instr' | 'prep'

const HINT_DEF: Record<'m' | 'f' | 'n' | 'pl', Record<HintCase, string>> = {
  m: { nom: 'известный', acc: 'известный', gen: 'известного', dat: 'известному', instr: 'известным', prep: 'известном' },
  f: { nom: 'известная', acc: 'известную', gen: 'известной', dat: 'известной', instr: 'известной', prep: 'известной' },
  n: { nom: 'известное', acc: 'известное', gen: 'известного', dat: 'известному', instr: 'известным', prep: 'известном' },
  pl: { nom: 'известные', acc: 'известные', gen: 'известных', dat: 'известным', instr: 'известными', prep: 'известных' },
}

const HINT_INDEF: Record<'m' | 'f' | 'n' | 'pl', Record<HintCase, string>> = {
  m: { nom: 'какой-то', acc: 'какой-то', gen: 'какого-то', dat: 'какому-то', instr: 'каким-то', prep: 'каком-то' },
  f: { nom: 'какая-то', acc: 'какую-то', gen: 'какой-то', dat: 'какой-то', instr: 'какой-то', prep: 'какой-то' },
  n: { nom: 'какое-то', acc: 'какое-то', gen: 'какого-то', dat: 'какому-то', instr: 'каким-то', prep: 'каком-то' },
  pl: { nom: 'какие-то', acc: 'какие-то', gen: 'каких-то', dat: 'каким-то', instr: 'какими-то', prep: 'каких-то' },
}

/**
 * Подсказка артикля: el/la → «(известный)», un/una → «(какой-то)».
 * Возвращает строку с ведущим пробелом или '' — не артикль (мой/этот/
 * много видны в переводе сами). caseForm — падежный ключ русской фразы.
 */
export function ruArticleHint(
  noun: Word,
  det: Word | null | undefined,
  number: GramNumber,
  caseForm: HintCase = 'nom',
): string {
  if (!det?.det) return ''
  const isDef = !!det.det.definite
  if (!isDef && !det.det.indefinite) return ''
  const key = noun.ruPluralOnly || number === 'pl' ? 'pl' : (noun.ruGender ?? 'm')
  const table = isDef ? HINT_DEF : HINT_INDEF
  return ` (${table[key][caseForm]})`
}

/** Ключ падежа русской падежной аннотации → падеж подсказки артикля */
export function ruHintCaseFor(caseKey: string): HintCase {
  switch (caseKey) {
    case 'a': return 'acc'
    case 'de': case 'desde': case 'hasta': case 'sin': case 'para': return 'gen'
    case 'dat': return 'dat'
    case 'con': return 'instr'
    case 'en': case 'sobre': return 'prep'
    default: return 'nom'
  }
}

// ============================================================
// Рендер промпта: подсказки в скобках — приглушённым шрифтом.
// Подсказка — служебная метка (в испанском фразу различает сам
// артикль), а не слова для сборки, поэтому в интерфейсе она серая
// и не жирная: «Она ждёт (известный) автобус».
// ============================================================

export type RuPromptPart = { text: string; hint: boolean }

/** Разбить русский промпт на части: обычный текст и подсказки «(…)».
 *  Соседние части одного типа склеиваются — меньше DOM-узлов. */
export function splitRuPrompt(prompt: string): RuPromptPart[] {
  const parts: RuPromptPart[] = []
  for (const chunk of prompt.split(/(\([^)]*\))/g)) {
    if (!chunk) continue
    const isHint = chunk.startsWith('(') && chunk.endsWith(')')
    const last = parts[parts.length - 1]
    if (last && last.hint === isHint) last.text += chunk
    else parts.push({ text: chunk, hint: isHint })
  }
  return parts
}

/**
 * Вставить подсказку в русскую падежную форму с предлогом:
 * «в школе» + « (какая-то)» → «в (какая-то) школе».
 */
export function ruLocWithHint(loc: string, hint: string): string {
  if (!hint) return loc
  const i = loc.indexOf(' ')
  if (i < 0) return loc + hint
  return loc.slice(0, i) + hint + ' ' + loc.slice(i + 1)
}

/** Заглавная первая буква (для начала русского предложения) */
export function ruCapitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
