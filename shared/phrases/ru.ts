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
 * Одушевлённые (людьми/роднёй — nounClass person/family) в винительном
 * падеже выглядят как родительный: «вижу (известного) брата», у
 * мн.ч. так же («вижу (известных) отцов») — форма берётся из колонки
 * родительного, как это делает ruDetCaseForm для «мой/этот».
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
  // одушевлённое м.р./мн.ч.: винительный = родительный
  const animate = noun.nounClass === 'person' || noun.nounClass === 'family'
  const effCase: HintCase =
    caseForm === 'acc' && animate && (key === 'm' || key === 'pl') ? 'gen' : caseForm
  const table = isDef ? HINT_DEF : HINT_INDEF
  return ` (${table[key][effCase]})`
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

// ============================================================
// Определители-местоимения (мой/этот) в косвенных падежах.
// Падежная форма с предлогом хранится готовой строкой
// (noun.ruCases: «в школе», «с мамой»); «мой/этот» вставляются
// внутрь неё согласуемой формой: «в моей школе», «с моей мамой».
// ============================================================

/** Русский падеж по ключу предлога (общий с подсказками артикля) */
export type RuDetCase = 'acc' | 'gen' | 'dat' | 'instr' | 'prep'

/**
 * Форма определителя-местоимения (мой/этот/наш…) в падеже.
 * Возвращает '' — слово не определитель-местоимение или падежных
 * форм нет (тогда вставка не делается — остаётся базовая строка).
 * Одушевлённые (папа, мама): винительный м.р./мн.ч. — форма родительного
 * («вижу МОЕГО папу», «вижу МОИХ родителей»); ж.р. — «мою» (accF).
 */
export function ruDetCaseForm(
  det: Word | null | undefined,
  noun: Word,
  ruKey: string,
  number: GramNumber = 'sg',
): string {
  const role = det?.pronoun?.role
  if (!det || (role !== 'possessive' && role !== 'demonstrative')) return ''
  const key = ruHintCaseFor(ruKey) // 'a' → acc, 'de' → gen, 'con' → instr…
  const cases = det.ruDetCases
  const gender = noun.ruGender ?? 'm'
  if (key === 'acc') {
    const ru = det.ruDet
    if (!ru) return ''
    const animate = noun.nounClass === 'person' || noun.nounClass === 'family'
    if (number === 'pl') return animate ? cases?.gen?.pl ?? ru.pl : ru.pl
    if (gender === 'f') return ru.accF
    if (animate) return cases?.gen?.m ?? ru.m
    return ru.m
  }
  const table = cases?.[key as 'gen']
  if (!table) return ''
  if (number === 'pl') return table.pl
  return gender === 'f' ? table.f : table.m
}

/** Предлог в начале падежной формы (в школе, с мамой) — вставляем
 *  определитель сразу после него; без предлога («маме») — перед словом */
const RU_PREP_RE = /^(в|во|на|с|со|без|для|о|об|обо|из|до|к|ко|у|по|от|при|про)\s+/

/** Вставить форму определителя внутрь падежной формы с предлогом */
function ruInsertDet(loc: string, form: string): string {
  const m = loc.match(RU_PREP_RE)
  if (m) return `${m[1]} ${form} ${loc.slice(m[0].length)}`
  return `${form} ${loc}`
}

/**
 * Русская падежная форма существительного с определителем:
 * «в школе» + mi → «в моей школе»; артикль → подсказка
 * «в (известной) школе»; без определителя — базовая строка.
 * base — готовая падежная форма (noun.ruCases[ключ] или запасная).
 */
export function ruNounCaseWithDet(
  noun: Word,
  det: Word | null | undefined,
  ruKey: string,
  base: string,
  number: GramNumber = 'sg',
): string {
  const role = det?.pronoun?.role
  if (role === 'possessive' || role === 'demonstrative') {
    const form = ruDetCaseForm(det, noun, ruKey, number)
    // без падежных форм определитель в косвенном падеже не вставляем:
    // «в школе» без «моей» лучше, чем «в мою школе»
    return form ? ruInsertDet(base, form) : base
  }
  // артикль → подсказка на месте артикля: после предлога
  // («в (какой-то) школе») или перед словом без предлога
  // («вижу (какую-то) учительницу»)
  const hint = ruArticleHint(noun, det, number, ruHintCaseFor(ruKey))
  return hint ? ruInsertDet(base, hint.trim()) : base
}

/** Заглавная первая буква (для начала русского предложения) */
export function ruCapitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
