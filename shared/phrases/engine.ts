// ============================================================
// shared/phrases/engine.ts — комбинаторный движок фраз.
//
// Три операции поверх шаблонов (schema.ts):
// 1. count(template, known) — сколько фраз собирается из известных слов
//    (точная комбинаторика, аналитическая — не перебор);
// 2. gains(template, known) — сколько фраз добавит каждое новое слово
//    (дельта по одной оси — база для «выучишь X → будешь знать Y»);
// 3. enumerate / sample — детерминированное перечисление для пагинации
//    и случайный выбор для упражнений.
// ============================================================

import type { GramNumber, Word } from '../types'
import { getWord } from '../data/words'
import { esNounPhrase, needsPersonalA, joinPrepNP, conjugate, gerundOf } from './es'
import { ruNounPhrase, ruAdjForm } from './ru'
import { ruGenitive, ruPlural, ruAccusative, ruNumberWord } from './ru-morph'
import { adjSemCompatible, verbObjAllowedNouns, verbObjCompatible } from './collocations'
import type { Fill, PhraseKind, Template, Unit } from './schema'

// ============================================================
// Вспомогательные выборки слов
// ============================================================

/** Все существительные */
export const ALL_NOUNS: Word[] = []
// заполняются из templates (избегаем циклической зависимости)
/** Прямое дополнение: предметы, еда, напитки, абстрактное, языки */
const DO_CLASSES = ['thing', 'food', 'drink', 'abstract', 'language']

/** Определители для подлежащего: артикли + притяжательные + указательные */
const DET_SUBJECT_IDS = ['d-el', 'd-la', 'd-los', 'd-las', 'd-un', 'd-una', 'd-unos', 'd-unas', 'p-mi', 'p-tu-pos', 'p-su', 'p-nuestro', 'p-este', 'p-ese']
/** Определители для дополнения: всё выше + количество */
const DET_OBJECT_IDS = [...DET_SUBJECT_IDS, 'd-mucho', 'd-poco']

export function detWords(set: 'subject' | 'object'): Word[] {
  const ids = set === 'subject' ? DET_SUBJECT_IDS : DET_OBJECT_IDS
  return ids.map((id) => getWord(id))
}

/**
 * Совместимо ли определитель с существительным (род/число/семантика).
 * Притяжательные и указательные (mi, tu, su, nuestro, este, ese) —
 * местоимения-определители БЕЗ поля det: они согласуются формами
 * mi/mis, este/esta/estos/estas (рендер их умеет — detFormsOf),
 * поэтому совместимы с любым существительным в любом числе.
 * Без этого правила фразы «mi casa», «este libro» не генерировались:
 * detCompatible возвращала false для всех слов без det.det.
 */
export function detCompatible(det: Word, noun: Word, number: GramNumber): boolean {
  const d = det.det
  if (!d) {
    const role = det.pronoun?.role
    if (role !== 'possessive' && role !== 'demonstrative') return false
    // «en casa»/«a casa» шаблоны рендерят идиоматично (без артикля, «дома»):
    // определитель mi/este всё равно потерялся бы в испанской фразе —
    // для casa их не генерируем (артикли сохраняют прежнее поведение)
    return noun.id !== 'n-casa'
  }
  if (d.number && d.number !== number) return false
  if (d.gender && d.gender !== (noun.articleGender ?? noun.gender)) return false
  // «много/мало» — только неисчисляемое: много работы, но не «много двери».
  // Чисто неисчисляемые — только в ед.ч.: «много одежды», не «многие одежды»
  if (d.quantity) {
    const cls = noun.nounClass
    if (cls === 'food' || cls === 'drink') return true
    return UNCOUNTABLE_NOUNS.has(noun.id) && number === 'sg'
  }
  // Неисчисляемые не сочетаются с неопределённым артиклем:
  // «Tengo ropa/dinero/tiempo», но не «una ropa», «un dinero»
  if (d.indefinite && NO_INDEFINITE_NOUNS.has(noun.id)) return false
  return true
}

/** Неисчисляемые: допустимо «много/мало» (только ед.ч.) и голая форма,
 *  но не неопределённый артикль */
const UNCOUNTABLE_NOUNS = new Set([
  'n-tiempo', 'n-dinero', 'n-trabajo', 'n-musica', 'n-vida', 'n-amor',
  'n-agua', 'n-ropa',
  'n-leche', 'n-azucar', 'n-sal', 'n-arroz',
])

/** Существительные, никогда не сочетающиеся с un/una/unos/unas:
 *  «Tengo ropa», «Quiero dinero», «Hay leche» — без артикля.
 *  Молоко/сахар/соль/рис — неисчисляемые: «Te doy leche»,
 *  а «una leche» — неверно (пользовательская жалоба).
 *  Comida = «еда» (массовое): «No hay comida»,
 *  а «No hay una comida» — неверно (пользовательская жалоба).
 *  Agua: «un agua» допустимо по RAE (порция, «Un agua, por favor»),
 *  но в приложении вода — массовое, как молоко: «Hay agua», «Quiero agua»,
 *  а «No hay un agua» противоречит правилу, которое учит приложение */
const NO_INDEFINITE_NOUNS = new Set([
  'n-ropa', 'n-dinero', 'n-tiempo', 'n-musica',
  'n-leche', 'n-azucar', 'n-sal', 'n-arroz', 'n-comida', 'n-agua',
])

/** Неисчисляемые без реального мн.ч.: только ед.ч.
 *  («Te doy leche», а не «dos leches» — по-русски «молоки» не бывает);
 *  ropa — то же: «las ropas» — архаизм, по-русски «одежды» нет */
const SINGULAR_ONLY_NOUNS = new Set(['n-leche', 'n-azucar', 'n-sal', 'n-arroz', 'n-ropa'])

/** Числа существительного в оси: «any» → ед.+мн.,
 *  но неисчисляемые без мн.ч. остаются в ед.ч. на всех осях */
export function unitNumbers(noun: Word, unitNumber: GramNumber | 'any'): GramNumber[] {
  if (SINGULAR_ONLY_NOUNS.has(noun.id)) return unitNumber === 'pl' ? [] : ['sg']
  return unitNumber === 'any' ? ['sg', 'pl'] : [unitNumber]
}

/** Совместимо ли прилагательное с существительным: формы (все имеют 4)
 *  + семантический белый список («уставшая кровать» исключена) */
export function adjCompatible(adj: Word, noun: Word): boolean {
  return !!adj.adj && adjSemCompatible(adj, noun)
}

/** Ось-именная группа (для точного подсчёта пар с запретом совпадения) */
type NPUnit = Extract<Unit, { kind: 'np' }>

/** Существительное оси совпадает с уже выбранным существительным оси notSameNounAs? */
function npNounBlocked(unit: NPUnit, noun: Word, chosen: Fill): boolean {
  if (!unit.notSameNounAs) return false
  const other = chosen[`${unit.notSameNounAs}#noun`]
  return !!other && typeof other === 'object' && 'id' in other && (other as Word).id === noun.id
}

/** Разрешена ли «голая» форма (без артикля) для существительного ед.ч.:
 *  неисчисляемые (комо pan, hay dinero) и casa (en casa).
 *  Счётные абстрактные — всегда с артиклем: «hay una idea»,
 *  «tengo un problema», но не «hay idea», «tengo problema» */
const COUNTABLE_ABSTRACT = new Set([
  'n-ano', 'n-cancion', 'n-dia', 'n-historia', 'n-hora', 'n-idea',
  'n-manana', 'n-manera', 'n-mes', 'n-minuto', 'n-momento', 'n-mundo',
  'n-noche', 'n-nombre', 'n-palabra', 'n-parte', 'n-pregunta',
  'n-problema', 'n-razon', 'n-respuesta', 'n-semana', 'n-tarde', 'n-verdad',
])

export function bareAllowed(noun: Word, number: GramNumber): boolean {
  if (number !== 'sg') return false
  const cls = noun.nounClass
  if (cls === 'food' || cls === 'drink' || cls === 'language') return true
  if (cls === 'abstract') return !COUNTABLE_ABSTRACT.has(noun.id)
  // «ropa» — неисчисляемое из класса «вещи»: «Tengo ropa», «Hay ropa»
  return noun.id === 'n-casa' || noun.id === 'n-ropa'
}

/** Определители, совместимые с существительным (без «голой» формы) */
function compatibleDets(dets: Word[], noun: Word, number: GramNumber, known: Set<string>): Word[] {
  return dets.filter((d) => known.has(d.id) && detCompatible(d, noun, number))
}

// ============================================================
// Операции над одним юнитом
// ============================================================

function freeWords(unit: Extract<Unit, { kind: 'free' }>, chosen: Fill): Word[] {
  return typeof unit.words === 'function' ? unit.words(chosen) : unit.words
}

/**
 * Число способов «определитель × прилагательное» для существительного.
 * Определители количества (mucho/poco) не сочетаются с прилагательным
 * (в переводе: «много работы»), остальные — сочетают.
 */
function npWaysPerNoun(
  unit: NPUnit,
  noun: Word,
  number: GramNumber,
  known: Set<string>,
): number {
  return npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, number, known, unit.withAdj, unit.detFilter)
}

/** Число определителей, сочетающихся с прилагательным (без quantity) */
function detsCountAdj(
  unit: NPUnit,
  noun: Word,
  number: GramNumber,
  known: Set<string>,
): number {
  if (unit.detSet === 'none') return 1
  let ways = 0
  for (const det of detWords(unit.detSet)) {
    if (known.has(det.id) && detCompatible(det, noun, number) && !det.det?.quantity) {
      if (!unit.detFilter || unit.detFilter(det)) ways++
    }
  }
  if (unit.bareAuto && bareAllowed(noun, number)) ways += 1
  return ways
}

/** Число вариантов прилагательного для np-юнита — только семантически
 *  совместимых с этим существительным (подсчёт согласован с перечислением) */
function npAdjWays(unit: NPUnit, noun: Word, known: Set<string>): number {
  if (!unit.withAdj) return 1
  return countWords(allAdjectives.filter((a) => adjCompatible(a, noun)), known)
}

// кэш прилагательных и существительных (заполняется init-ом из templates)
let allAdjectives: Word[] = []
let allNounsCache: Word[] = []

/** Инициализация кэшей частей речи (вызывается из templates.ts) */
export function initEngine(adjectives: Word[], nouns: Word[]): void {
  allAdjectives = adjectives
  allNounsCache = nouns
}

/** Глаголы, с которыми дополнение естественно звучит с «много/мало»:
 *  «como mucho arroz», «quiero poco tiempo», «llevo mucha ropa».
 *  С остальными количество ломает фразу: «hacen poco pollo» — нет */
const QUANTITY_OBJ_VERBS = new Set(['v-comer', 'v-beber', 'v-querer', 'v-necesitar', 'v-tener', 'v-llevar'])

/** Определители дополнения для глагола: «много/мало» — только с
 *  глаголами потребления/желания/наличия.
 *  tener — детерминированная пара ES/RU (жалоба «La hija no tiene poco
 *  tiempo»): «много/мало» и определённый артикль с ним не сочетаем
 *  (как в t-pron-tener-noun) — иначе русский «нет времени» требует
 *  угадать «poco/el», которых в переводе не видно */
function objDetsForVerb(verb: Word, detSet: 'subject' | 'object' | 'none'): Word[] {
  if (detSet === 'none') return []
  const dets = detWords(detSet)
  // tener — детерминированная пара ES/RU (жалоба «La hija no tiene poco
  // tiempo»): «много/мало», определённый артикль и мой/этот с ним не
  // сочетаем («no tengo mi tiempo» ↔ «нет моего времени» — угадайка)
  if (verb.id === 'v-tener') {
    return dets.filter((d) => !d.det?.quantity && !d.det?.definite && !d.pronoun?.role)
  }
  if (QUANTITY_OBJ_VERBS.has(verb.id)) return dets
  return dets.filter((d) => !d.det?.quantity)
}

function countWords(words: Word[], known: Set<string>): number {
  let n = 0
  for (const w of words) if (known.has(w.id)) n++
  return n
}

/** Число способов заполнения одного юнита известными словами */
export function unitWays(unit: Unit, known: Set<string>, chosen: Fill): number {
  switch (unit.kind) {
    case 'free':
      return countWords(freeWords(unit, chosen), known)
    case 'np': {
      let ways = 0
      for (const noun of unit.nouns) {
        if (unit.nounFilter && !unit.nounFilter(noun)) continue
        if (npNounBlocked(unit, noun, chosen)) continue
        if (!known.has(noun.id)) continue
        const numbers: GramNumber[] = unitNumbers(noun, unit.number)
        for (const num of numbers) {
          ways += npWaysPerNoun(unit, noun, num, known)
        }
      }
      return ways
    }
    case 'anchorDep': {
      let ways = 0
      for (const anchor of unit.anchors) {
        if (!known.has(anchor.id)) continue
        for (const dep of unit.deps) {
          if (known.has(dep.id) && unit.compat(anchor, dep)) ways++
        }
      }
      return ways
    }
    case 'verbPrep': {
      let ways = 0
      for (const verb of unit.verbs) {
        if (!known.has(verb.id) || !verb.verb?.withPrep) continue
        for (const prepId of verb.verb.withPrep) {
          const prep = tryWord(prepId)
          if (!prep || !known.has(prep.id)) continue
          ways += prepNounWays(prep, unit.nouns, known, unit.number, verb.id)
        }
      }
      return ways
    }
    case 'npDep': {
      let ways = 0
      for (const noun of unit.nouns) {
        if (!known.has(noun.id)) continue
        const depWays = unit.deps.filter((d) => known.has(d.id) && unit.compat(noun, d)).length
        if (depWays === 0) continue
        const numbers: GramNumber[] = unitNumbers(noun, unit.number)
        for (const num of numbers) {
          ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known) * depWays
        }
      }
      return ways
    }
    case 'verbObj': {
      let ways = 0
      for (const verb of unit.verbs) {
        if (!known.has(verb.id)) continue
        ways += objNounWays(verb, unit, known)
      }
      return ways
    }
  }
}

/** Существительные, семантически совместимые с глаголом:
 *  белый список сочетаемости (collocations.ts) поверх грубых objClasses */
function verbCompatibleNouns(verb: Word, nouns: Word[]): Word[] {
  return verbObjAllowedNouns(verb, nouns)
}

/** Способы «определитель × прилагательное» без привязки к np-юниту.
 *  detFilter ограничивает определители (hay: только un/una/mucho/poco). */
function npWaysPerNounFor(
  detSet: 'subject' | 'object' | 'none',
  bareAuto: boolean,
  noun: Word,
  number: GramNumber,
  known: Set<string>,
  withAdj = false,
  detFilter?: (d: Word) => boolean,
  detPool?: Word[],
): number {
  // прилагательные, совместимые с ЭТИМ существительным (белый список)
  const adjWays = withAdj ? countWords(allAdjectives.filter((a) => adjCompatible(a, noun)), known) : 1
  if (detSet === 'none') return adjWays
  let ways = 0
  for (const det of detPool ?? detWords(detSet)) {
    if (!known.has(det.id) || !detCompatible(det, noun, number)) continue
    if (detFilter && !detFilter(det)) continue
    ways += det.det?.quantity ? 1 : adjWays
  }
  if (bareAuto && bareAllowed(noun, number)) ways += adjWays
  return ways
}

/** Способы заполнения одной np-оси конкретным существительным (все числа) */
function npNounWays(unit: NPUnit, noun: Word, known: Set<string>): number {
  const numbers: GramNumber[] = unitNumbers(noun, unit.number)
  let ways = 0
  for (const num of numbers) ways += npWaysPerNoun(unit, noun, num, known)
  return ways
}

/** То же по id слова (для поправок прироста: слово может быть не существительным оси) */
function npNounWaysById(unit: NPUnit, wordId: string, known: Set<string>): number {
  const noun = unit.nouns.find((n) => n.id === wordId)
  if (!noun) return 0
  if (unit.nounFilter && !unit.nounFilter(noun)) return 0
  return npNounWays(unit, noun, known)
}

/** Способы заполнения дополнения для глагола */
function objNounWays(
  verb: Word,
  unit: Extract<Unit, { kind: 'verbObj' }>,
  known: Set<string>,
): number {
  let ways = 0
  for (const noun of verbCompatibleNouns(verb, unit.nouns)) {
    if (!known.has(noun.id)) continue
    const numbers: GramNumber[] = unitNumbers(noun, unit.number)
    for (const num of numbers) {
      ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, unit.withAdj, undefined, objDetsForVerb(verb, unit.detSet))
    }
  }
  return ways
}

/** Способы заполнения существительного для конкретного предлога */
function prepNounWays(prep: Word, nouns: Word[], known: Set<string>, number: GramNumber | 'any', verbId?: string): number {
  let ways = 0
  for (const noun of nouns) {
    if (!known.has(noun.id)) continue
    if (!nounMatchesPrep(prep, noun, verbId)) continue
    const numbers: GramNumber[] = unitNumbers(noun, number)
    for (const num of numbers) {
      // «без» — всегда без артикля («sin azúcar»), остальные — с определителем
      if (prep.id === 'prep-sin') {
        ways += 1
        continue
      }
      let w = compatibleDets(detWords('object'), noun, num, known).filter((d) => !d.det?.quantity).length
      // «sobre + абстрактное» — тема без артикля: «hablar sobre música»;
      // остальные предлоги требуют определитель: «al trabajo», «de la comida»
      if (prep.id === 'prep-sobre' && noun.nounClass === 'abstract' && num === 'sg') w += 1
      ways += w
    }
  }
  return ways
}

/** Подходит ли существительное к предлогу (класс + русская аннотация).
 *  Русский ключ падежа зависит от глагола: pensar en → «думаю о…» (sobre);
 *  проверяется именно тот ключ, по которому будет рендериться перевод. */
export function nounMatchesPrep(prep: Word, noun: Word, verbId?: string): boolean {
  if (!(prep.nounClasses ?? []).includes(noun.nounClass as never)) return false
  // русская падежная аннотация обязательна (перевод без неё не собрать)
  const key = verbId ? verbPrepRuKey(verbId, prep.id) : prep.id.replace('prep-', '')
  return !!noun.ruCases?.[key as 'a']
}

/** Карта русских падежных ключей для связок глагол+предлог */
const VERB_PREP_RU: Record<string, Record<string, string>> = {
  'v-pensar': { 'prep-en': 'sobre' },
}

/** Русский ключ падежной аннотации для связки глагол+предлог */
export function verbPrepRuKey(verbId: string, prepId: string): string {
  return VERB_PREP_RU[verbId]?.[prepId] ?? prepId.replace('prep-', '')
}

function tryWord(id: string): Word | undefined {
  try {
    return getWord(id)
  } catch {
    return undefined
  }
}

// ============================================================
// 1. Подсчёт фраз шаблона
// ============================================================

/** Требования шаблона выполнены (все requires известны)? */
export function templateReady(t: Template, known: Set<string>): boolean {
  return t.requires.every((id) => known.has(id))
}

/** Пара np-осей с запретом одинаковых существительных (notSameNounAs) */
function npExclusionPair(
  t: Template,
): { src: NPUnit; dep: NPUnit; srcIdx: number; depIdx: number } | null {
  for (let i = 0; i < t.units.length; i++) {
    const u = t.units[i]!
    if (u.kind !== 'np' || !u.notSameNounAs) continue
    const srcIdx = t.units.findIndex(
      (x) => x.kind === 'np' && x.role === u.notSameNounAs && !x.notSameNounAs,
    )
    if (srcIdx >= 0 && srcIdx !== i) {
      return { src: t.units[srcIdx] as NPUnit, dep: u, srcIdx, depIdx: i }
    }
  }
  return null
}

/**
 * Сколько фраз (с учётом вариантов) собирается из известных слов.
 * Аналитическая комбинаторика: произведение способов по юнитам × варианты.
 * Для осей с запретом одинаковых существительных — точная сумма по паре
 * (произведение завышало бы счёт: «Una maestra ve a la maestra» исключена).
 */
export function countTemplate(t: Template, known: Set<string>): number {
  if (!templateReady(t, known)) return 0
  const pair = npExclusionPair(t)
  if (pair) {
    const { src, dep, srcIdx, depIdx } = pair
    let rest = t.variants.length
    for (let k = 0; k < t.units.length; k++) {
      if (k !== srcIdx && k !== depIdx) rest *= unitWays(t.units[k]!, known, {})
    }
    let sum = 0
    for (const s of src.nouns) {
      if (src.nounFilter && !src.nounFilter(s)) continue
      if (!known.has(s.id)) continue
      const ws = npNounWays(src, s, known)
      if (ws === 0) continue
      let wDep = 0
      for (const o of dep.nouns) {
        if (dep.nounFilter && !dep.nounFilter(o)) continue
        if (o.id === s.id) continue
        if (!known.has(o.id)) continue
        wDep += npNounWays(dep, o, known)
      }
      sum += ws * wDep
    }
    return rest * sum
  }
  let ways = 1
  const chosen: Fill = {}
  for (const unit of t.units) {
    ways *= unitWays(unit, known, chosen)
  }
  return ways * t.variants.length
}

// ============================================================
// 2. Проекции «выучишь X → +Y»
// ============================================================

/**
 * Прирост фраз по каждому слову: сколько фраз добавит изучение слова.
 * Возвращает Map<wordId, count>. Слова, не входящие в шаблон, дают 0.
 */
export function gainsTemplate(t: Template, known: Set<string>): Map<string, number> {
  const result = new Map<string, number>()
  if (!templateReady(t, known)) return result
  // Способы заполнения остальных юнитов (× варианты фразы —
  // каждое заполнение даёт t.variants.length фраз)
  const restWays = new Map<number, number>()
  for (let i = 0; i < t.units.length; i++) {
    let p = t.variants.length
    for (let j = 0; j < t.units.length; j++) {
      if (j !== i) p *= unitWays(t.units[j]!, known, {})
    }
    restWays.set(i, p)
  }
  const pair = npExclusionPair(t)
  for (let i = 0; i < t.units.length; i++) {
    const unit = t.units[i]
    const rest = restWays.get(i) ?? 0
    for (const [wordId, gain] of unitGains(unit, known)) {
      let g = gain * rest
      // Поправка на запрет одинаковых существительных в паре осей:
      // выучить «maestra» не даёт фраз вида «Una maestra ve a la maestra»
      if (pair && (i === pair.srcIdx || i === pair.depIdx)) {
        const other = i === pair.depIdx ? pair.src : pair.dep
        const wOther = unitWays(other, known, {})
        if (wOther > 0) {
          const excl = npNounWaysById(other, wordId, known)
          g *= (wOther - excl) / wOther
        }
      }
      result.set(wordId, (result.get(wordId) ?? 0) + g)
    }
  }
  // Для существительных, входящих в ОБЕ оси пары, поправка выше считает
  // каждую ось независимо — вычитаем двойно исключённые заполнения
  if (pair) {
    const { src, dep, srcIdx, depIdx } = pair
    const restDep = restWays.get(depIdx) ?? 0
    const wSrc = unitWays(src, known, {})
    if (wSrc > 0 && restDep > 0) {
      const vu = restDep / wSrc // варианты × способы остальных осей
      for (const s of src.nouns) {
        if (known.has(s.id)) continue
        if (!dep.nouns.some((o) => o.id === s.id)) continue
        if (dep.nounFilter && !dep.nounFilter(s)) continue
        const ws = npNounWays(src, s, known)
        const wo = npNounWays(dep, s, known)
        if (ws > 0 && wo > 0) {
          result.set(s.id, (result.get(s.id) ?? 0) - ws * wo * vu)
        }
      }
    }
  }
  return result
}

/** Прирост способов заполнения одного юнита при изучении конкретного слова */
function unitGains(unit: Unit, known: Set<string>): Map<string, number> {
  const gains = new Map<string, number>()
  switch (unit.kind) {
    case 'free': {
      const words = typeof unit.words === 'function' ? unit.words({}) : unit.words
      for (const w of words) {
        if (!known.has(w.id)) gains.set(w.id, 1)
      }
      break
    }
    case 'np': {
      for (const noun of unit.nouns) {
        if (unit.nounFilter && !unit.nounFilter(noun)) continue
        if (known.has(noun.id)) continue
        let ways = 0
        const numbers: GramNumber[] = unitNumbers(noun, unit.number)
        for (const num of numbers) {
          ways += npWaysPerNoun(unit, noun, num, known)
        }
        if (ways > 0) gains.set(noun.id, ways)
      }
      // Прилагательное: Σ по известным существительным, совместимым с ним
      if (unit.withAdj) {
        for (const adj of allAdjectives) {
          if (known.has(adj.id)) continue
          let ways = 0
          for (const noun of unit.nouns) {
            if (unit.nounFilter && !unit.nounFilter(noun)) continue
            if (!known.has(noun.id) || !adjCompatible(adj, noun)) continue
            const numbers: GramNumber[] = unitNumbers(noun, unit.number)
            for (const num of numbers) ways += detsCountAdj(unit, noun, num, known)
          }
          if (ways > 0) gains.set(adj.id, ways)
        }
      }
      // Определитель: Σ по известным существительным, с которыми совместим
      if (unit.detSet !== 'none') {
        for (const det of detWords(unit.detSet)) {
          if (known.has(det.id)) continue
          if (unit.detFilter && !unit.detFilter(det)) continue
          let ways = 0
          for (const noun of unit.nouns) {
            if (unit.nounFilter && !unit.nounFilter(noun)) continue
            if (!known.has(noun.id)) continue
            const numbers: GramNumber[] = unitNumbers(noun, unit.number)
            for (const num of numbers) {
              if (!detCompatible(det, noun, num)) continue
              ways += det.det?.quantity ? 1 : npAdjWays(unit, noun, known)
            }
          }
          if (ways > 0) gains.set(det.id, ways)
        }
      }
      break
    }
    case 'anchorDep': {
      for (const anchor of unit.anchors) {
        if (!known.has(anchor.id)) {
          const deps = unit.deps.filter((d) => known.has(d.id) && unit.compat(anchor, d)).length
          if (deps > 0) gains.set(anchor.id, deps)
        }
      }
      for (const dep of unit.deps) {
        if (known.has(dep.id)) continue
        const anchors = unit.anchors.filter((a) => known.has(a.id) && unit.compat(a, dep)).length
        if (anchors > 0) gains.set(dep.id, anchors)
      }
      break
    }
    case 'verbPrep': {
      for (const verb of unit.verbs) {
        if (known.has(verb.id) || !verb.verb?.withPrep) continue
        let ways = 0
        for (const prepId of verb.verb.withPrep) {
          const prep = tryWord(prepId)
          if (prep && known.has(prep.id)) ways += prepNounWays(prep, unit.nouns, known, unit.number, verb.id)
        }
        if (ways > 0) gains.set(verb.id, ways)
      }
      // Предлог: Σ по глаголам, которые с ним сочетаются
      for (const prep of unit.preps) {
        if (known.has(prep.id)) continue
        let ways = 0
        for (const verb of unit.verbs) {
          if (!known.has(verb.id) || !verb.verb?.withPrep?.includes(prep.id)) continue
          ways += prepNounWays(prep, unit.nouns, known, unit.number)
        }
        if (ways > 0) gains.set(prep.id, ways)
      }
      // Существительное: Σ по глаголам × совместимым предлогам
      for (const noun of unit.nouns) {
        if (known.has(noun.id)) continue
        let ways = 0
        for (const verb of unit.verbs) {
          if (!known.has(verb.id) || !verb.verb?.withPrep) continue
          for (const prepId of verb.verb.withPrep) {
            const prep = tryWord(prepId)
            if (prep && known.has(prep.id) && nounMatchesPrep(prep, noun, verb.id)) ways += 1
          }
        }
        if (ways > 0) gains.set(noun.id, ways)
      }
      break
    }
    case 'npDep': {
      for (const noun of unit.nouns) {
        if (known.has(noun.id)) continue
        const depWays = unit.deps.filter((d) => known.has(d.id) && unit.compat(noun, d)).length
        if (depWays === 0) continue
        let ways = 0
        const numbers: GramNumber[] = unitNumbers(noun, unit.number)
        for (const num of numbers) {
          ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known)
        }
        gains.set(noun.id, ways * depWays)
      }
      for (const dep of unit.deps) {
        if (known.has(dep.id)) continue
        let ways = 0
        for (const noun of unit.nouns) {
          if (!known.has(noun.id) || !unit.compat(noun, dep)) continue
          const numbers: GramNumber[] = unitNumbers(noun, unit.number)
          for (const num of numbers) {
            ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known)
          }
        }
        if (ways > 0) gains.set(dep.id, ways)
      }
      break
    }
    case 'verbObj': {
      // Глагол: новые дополнения (неивестный глагол даёт все свои классы)
      for (const verb of unit.verbs) {
        if (known.has(verb.id)) continue
        const ways = objNounWays(verb, unit, known)
        if (ways > 0) gains.set(verb.id, ways)
      }
      // Существительное: Σ по известным глаголам, совместимым с ним
      for (const noun of unit.nouns) {
        if (known.has(noun.id)) continue
        let ways = 0
        for (const verb of unit.verbs) {
          if (!known.has(verb.id)) continue
          if (!verbObjCompatible(verb, noun)) continue
          const numbers: GramNumber[] = unitNumbers(noun, unit.number)
          for (const num of numbers) {
            ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, unit.withAdj, undefined, objDetsForVerb(verb, unit.detSet))
          }
        }
        if (ways > 0) gains.set(noun.id, ways)
      }
      // Прилагательное: Σ по известным глаголам × совместимым существительным
      if (unit.withAdj) {
        for (const adj of allAdjectives) {
          if (known.has(adj.id)) continue
          let ways = 0
          for (const verb of unit.verbs) {
            if (!known.has(verb.id)) continue
            for (const noun of verbCompatibleNouns(verb, unit.nouns)) {
              if (!known.has(noun.id) || !adjCompatible(adj, noun)) continue
              const numbers: GramNumber[] = unitNumbers(noun, unit.number)
              for (const num of numbers) {
                ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, false, undefined, objDetsForVerb(verb, unit.detSet))
              }
            }
          }
          if (ways > 0) gains.set(adj.id, ways)
        }
      }
      // Определитель: Σ по глаголам × совместимым существительным
      if (unit.detSet !== 'none') {
        for (const det of detWords(unit.detSet)) {
          if (known.has(det.id)) continue
          let ways = 0
          for (const verb of unit.verbs) {
            if (!known.has(verb.id)) continue
            // тот же пул, что при семплинге: «много/мало» — только с
            // глаголами потребления/желания; у tener — без «много/мало»
            // и без определённого артикля
            if (!objDetsForVerb(verb, unit.detSet).includes(det)) continue
            for (const noun of verbCompatibleNouns(verb, unit.nouns)) {
              if (!known.has(noun.id)) continue
              const numbers: GramNumber[] = unitNumbers(noun, unit.number)
              for (const num of numbers) {
                if (!detCompatible(det, noun, num)) continue
                ways += det.det?.quantity ? 1 : npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, false, undefined, objDetsForVerb(verb, unit.detSet))
              }
            }
          }
          if (ways > 0) gains.set(det.id, ways)
        }
      }
      break
    }
  }
  return gains
}

// ============================================================
// 3. Перечисление (пагинация «страницы фраз»)
// ============================================================

export interface EnumeratedPhrase {
  key: string
  templateId: string
  kind: PhraseKind
  es: string
  ru: string
  /** Все слова фразы (для озвучки и практики) */
  words: Word[]
}

/**
 * Детерминированное перечисление фраз шаблона с пропуском (offset).
 * Порядок стабилен между вызовами — основа пагинации.
 */
export function enumerateTemplate(
  t: Template,
  known: Set<string>,
  offset: number,
  limit: number,
): { phrases: EnumeratedPhrase[]; total: number } {
  const phrases: EnumeratedPhrase[] = []
  const perFillKinds = t.variants
  const collected = { count: 0, total: 0 }
  const chosen: Fill = {}

  // Рекурсивный обход юнитов
  const walk = (unitIdx: number) => {
    if (phrases.length >= limit) return
    if (unitIdx === t.units.length) {
      // Собрано заполнение — раскрываем варианты
      for (const kind of perFillKinds) {
        if (collected.total >= offset) {
          phrases.push(makePhrase(t, chosen, kind, known))
        }
        collected.total++
        if (phrases.length >= limit) return
      }
      return
    }
    const unit = t.units[unitIdx]
    for (const [opt] of unitOptionsWithIndexes(unit, chosen, known)) {
      applyOption(chosen, unit, opt)
      walk(unitIdx + 1)
      undoOption(chosen, unit)
      if (phrases.length >= limit) return
    }
  }

  walk(0)
  return { phrases, total: countTemplate(t, known) }
}

// хелпер перечисления использует makePhrase без индексов

/** Варианты юнита с индексами для ключа фразы (детерминированный порядок) */
function unitOptionsWithIndexes(unit: Unit, chosen: Fill, known: Set<string>): Array<[Record<string, Word | GramNumber | null>, number]> {
  const options: Array<[Record<string, Word | GramNumber | null>, number]> = []
  switch (unit.kind) {
    case 'free': {
      let i = 0
      for (const w of freeWords(unit, chosen)) {
        if (known.has(w.id)) options.push([{ [unit.role]: w }, i])
        i++
      }
      break
    }
    case 'np': {
      let i = 0
      for (const noun of unit.nouns) {
        if (unit.nounFilter && !unit.nounFilter(noun)) continue
        if (npNounBlocked(unit, noun, chosen)) continue
        if (!known.has(noun.id)) { i++; continue }
        const numbers: GramNumber[] = unitNumbers(noun, unit.number)
        for (const num of numbers) {
          // «голая» форма — первый вариант, затем определители
          const dets: Array<Word | null> = []
          if (unit.detSet === 'none') {
            dets.push(null)
          } else {
            if (unit.bareAuto && bareAllowed(noun, num)) dets.push(null)
            for (const d of detWords(unit.detSet)) {
              if (known.has(d.id) && detCompatible(d, noun, num)) {
                if (unit.detFilter && !unit.detFilter(d)) continue
                dets.push(d)
              }
            }
          }
          for (const det of dets) {
            const withAdj = unit.withAdj && !det?.det?.quantity
            const adjs: Array<Word | null> = withAdj
              ? allAdjectives.filter((a) => known.has(a.id) && adjCompatible(a, noun))
              : [null]
            for (const adj of adjs) {
              options.push([
                {
                  [`${unit.role}#noun`]: noun,
                  [`${unit.role}#num`]: num,
                  [`${unit.role}#det`]: det,
                  [`${unit.role}#adj`]: adj,
                },
                i,
              ])
            }
          }
          i++
        }
      }
      break
    }
    case 'verbObj': {
      let i = 0
      for (const verb of unit.verbs) {
        if (!known.has(verb.id)) { i++; continue }
        for (const noun of verbCompatibleNouns(verb, unit.nouns)) {
          if (!known.has(noun.id)) continue
          const numbers: GramNumber[] = unitNumbers(noun, unit.number)
          for (const num of numbers) {
            const dets: Array<Word | null> = []
            if (unit.detSet === 'none') {
              dets.push(null)
            } else {
              if (unit.bareAuto && bareAllowed(noun, num)) dets.push(null)
              for (const d of objDetsForVerb(verb, unit.detSet)) {
                if (known.has(d.id) && detCompatible(d, noun, num)) dets.push(d)
              }
            }
            for (const det of dets) {
              const withAdj = unit.withAdj && !det?.det?.quantity
              const adjs: Array<Word | null> = withAdj
                ? allAdjectives.filter((a) => known.has(a.id) && adjCompatible(a, noun))
                : [null]
              for (const adj of adjs) {
                options.push([
                  {
                    [unit.verbRole]: verb,
                    [`${unit.nounRole}#noun`]: noun,
                    [`${unit.nounRole}#num`]: num,
                    [`${unit.nounRole}#det`]: det,
                    [`${unit.nounRole}#adj`]: adj,
                  },
                  i,
                ])
              }
            }
          }
        }
        i++
      }
      break
    }
    case 'anchorDep': {
      let i = 0
      for (const anchor of unit.anchors) {
        if (!known.has(anchor.id)) { i++; continue }
        for (const dep of unit.deps) {
          if (known.has(dep.id) && unit.compat(anchor, dep)) {
            options.push([{ [unit.anchorRole]: anchor, [unit.depRole]: dep }, i])
          }
        }
        i++
      }
      break
    }
    case 'verbPrep': {
      let i = 0
      for (const verb of unit.verbs) {
        if (!known.has(verb.id) || !verb.verb?.withPrep) { i++; continue }
        for (const prepId of verb.verb.withPrep) {
          const prep = tryWord(prepId)
          if (!prep || !known.has(prep.id)) continue
          const nouns = unit.nouns.filter((n) => known.has(n.id) && nounMatchesPrep(prep, n, verb.id))
          for (const noun of nouns) {
            const numbers: GramNumber[] = unitNumbers(noun, unit.number)
            for (const num of numbers) {
              // «sin» — всегда без артикля («sin azúcar»); «casa» — идиоматично
              // голая с любым предлогом («en casa», «de casa», «a casa»);
              // «sobre + абстрактное» — тема без артикля («hablar sobre música»);
              // остальные предлоги — с определителем («al trabajo», «de la comida»)
              const dets: Array<Word | null> = []
              if (prep.id === 'prep-sin' || noun.id === 'n-casa') {
                dets.push(null)
              } else {
                if (prep.id === 'prep-sobre' && noun.nounClass === 'abstract' && num === 'sg') dets.push(null)
                for (const d of detWords('object')) {
                  if (known.has(d.id) && detCompatible(d, noun, num) && !d.det?.quantity) dets.push(d)
                }
              }
              for (const det of dets) {
                options.push([
                  {
                    [unit.verbRole]: verb,
                    [unit.prepRole]: prep,
                    [`${unit.nounRole}#noun`]: noun,
                    [`${unit.nounRole}#num`]: num,
                    [`${unit.nounRole}#det`]: det,
                  },
                  i,
                ])
              }
            }
          }
        }
        i++
      }
      break
    }
    case 'npDep': {
      let i = 0
      for (const noun of unit.nouns) {
        if (!known.has(noun.id)) { i++; continue }
        const deps = unit.deps.filter((d) => known.has(d.id) && unit.compat(noun, d))
        if (deps.length === 0) { i++; continue }
        const numbers: GramNumber[] = unitNumbers(noun, unit.number)
        for (const num of numbers) {
          const dets: Array<Word | null> = []
          if (unit.bareAuto && bareAllowed(noun, num) && unit.detSet !== 'none') dets.push(null)
          for (const d of detWords(unit.detSet === 'none' ? 'subject' : unit.detSet)) {
            if (known.has(d.id) && detCompatible(d, noun, num)) dets.push(d)
          }
          for (const det of dets) {
            for (const dep of deps) {
              options.push([
                {
                  [`${unit.role}#noun`]: noun,
                  [`${unit.role}#num`]: num,
                  [`${unit.role}#det`]: det,
                  [`${unit.role}#adj`]: null,
                  [unit.depRole]: dep,
                },
                i,
              ])
            }
          }
        }
        i++
      }
      break
    }
  }
  return options
}

function applyOption(chosen: Fill, unit: Unit, opt: Record<string, Word | GramNumber | null>): void {
  for (const [k, v] of Object.entries(opt)) chosen[k] = v
}
function undoOption(chosen: Fill, unit: Unit): void {
  const roles: string[] = []
  switch (unit.kind) {
    case 'free':
      roles.push(unit.role)
      break
    case 'np':
      roles.push(`${unit.role}#noun`, `${unit.role}#num`, `${unit.role}#det`, `${unit.role}#adj`)
      break
    case 'anchorDep':
      roles.push(unit.anchorRole, unit.depRole)
      break
    case 'verbPrep':
      roles.push(unit.verbRole, unit.prepRole, `${unit.nounRole}#noun`, `${unit.nounRole}#num`)
      break
    case 'npDep':
      roles.push(`${unit.role}#noun`, `${unit.role}#num`, `${unit.role}#det`, `${unit.role}#adj`, unit.depRole)
      break
    case 'verbObj':
      roles.push(unit.verbRole, `${unit.nounRole}#noun`, `${unit.nounRole}#num`, `${unit.nounRole}#det`, `${unit.nounRole}#adj`)
      break
  }
  for (const r of roles) delete chosen[r]
}

/** Сборка EnumeratedPhrase из заполнения */
function makePhrase(
  t: Template,
  fill: Fill,
  kind: PhraseKind,
  known: Set<string>,
): EnumeratedPhrase {
  const words: Word[] = []
  for (const v of Object.values(fill)) {
    if (v && typeof v === 'object' && 'id' in v) {
      const w = v as Word
      if (!words.some((x) => x.id === w.id)) words.push(w)
    }
  }
  for (const id of t.requires) {
    const w = tryWord(id)
    if (w && !words.some((x) => x.id === w.id)) words.push(w)
  }
  return {
    key: phraseKeyWithIndexes(t, fill, kind),
    templateId: t.id,
    kind,
    es: t.render(fill, kind),
    ru: t.ru(fill, kind),
    words,
  }
}

/** Ключ фразы: template + сумма индексов юнитов + вариант */
function phraseKeyWithIndexes(t: Template, fill: Fill, kind: PhraseKind): string {
  // Индексы детерминированы порядком перечисления; для простоты ключ = t.id + все id слов
  const ids = Object.values(fill)
    .filter((v): v is Word => !!v && typeof v === 'object' && 'id' in v)
    .map((w) => w.id)
    .sort()
  return `${t.id}|${ids.join(',')}|${kind}`
}

// ============================================================
// 4. Случайная фраза для упражнений
// ============================================================

/** Случайное заполнение шаблона из известных слов (для упражнений) */
export function sampleFill(t: Template, known: Set<string>, rand: () => number = Math.random): Fill | null {
  if (!templateReady(t, known)) return null
  const fill: Fill = {}
  for (const unit of t.units) {
    const opts = unitOptionsWithIndexes(unit, fill, known)
    if (opts.length === 0) return null
    const picked = opts[Math.floor(rand() * opts.length)]![0]
    for (const [k, v] of Object.entries(picked)) fill[k] = v
  }
  return fill
}

// ============================================================
// 5. Обход заполнений с ограничением (для скана качества переводов)
// ============================================================

/**
 * Систематический обход заполнений шаблона, вызывающий visit(fill, kind)
 * не более maxLeaves раз. Если пространство комбинаторики больше бюджета,
 * на каждом уровне перебираются варианты с шагом (stride) — выборка
 * остаётся детерминированной и покрывает всё пространство понемногу.
 * Возвращает число вызовов visit.
 */
export function walkFills(
  t: Template,
  known: Set<string>,
  visit: (fill: Fill, kind: PhraseKind) => void,
  opts: { maxLeaves?: number } = {},
): number {
  if (!templateReady(t, known)) return 0
  const maxLeaves = opts.maxLeaves ?? 100_000

  // Произведение способов заполнения юнитов после i-го (пулы статичны)
  const suffix: number[] = new Array(t.units.length + 1)
  suffix[t.units.length] = 1
  for (let i = t.units.length - 1; i >= 0; i--) {
    suffix[i] = unitWays(t.units[i]!, known, {}) * suffix[i + 1]!
  }

  let budget = maxLeaves
  let visited = 0
  const fill: Fill = {}

  const walk = (unitIdx: number): void => {
    if (budget <= 0) return
    if (unitIdx === t.units.length) {
      for (const kind of t.variants) {
        visit(fill, kind)
        visited++
      }
      budget -= t.variants.length
      return
    }
    const unit = t.units[unitIdx]!
    const options = unitOptionsWithIndexes(unit, fill, known)
    if (options.length === 0) return
    // Листьев под этим узлом: варианты × остаток пути × варианты фразы
    const subtreeLeaves = options.length * suffix[unitIdx + 1]! * t.variants.length
    const stride = Math.max(1, Math.ceil(subtreeLeaves / Math.max(1, budget)))
    for (let i = 0; i < options.length; i += stride) {
      applyOption(fill, unit, options[i]![0])
      walk(unitIdx + 1)
      undoOption(fill, unit)
      if (budget <= 0) return
    }
  }

  walk(0)
  return visited
}

// ============================================================
// Хелперы для render-функций шаблонов
// ============================================================

/** Испанская именная группа по заполнению np-юнита */
export function npEs(fill: Fill, role: string): string {
  const noun = fill[`${role}#noun`] as Word
  const det = fill[`${role}#det`] as Word | null
  const adj = fill[`${role}#adj`] as Word | null
  const num = (fill[`${role}#num`] as GramNumber) ?? 'sg'
  // Артикль ставится только для настоящих артиклей;
  // притяжательные/указательные/количество заменяют его собой
  const isArticle = !!det?.det?.definite || !!det?.det?.indefinite
  return esNounPhrase(noun, {
    number: num,
    definite: det ? (isArticle ? !!det.det?.definite : null) : null,
    det: det && !isArticle ? det : undefined,
    adj: adj ?? undefined,
  })
}

/** Русская именная группа по заполнению np-юнита.
 *  opts.articleHint — подсказка артикля в промпте: «(какой-то) маленький хлеб»
 *  (el/la → «известный», un/una → «какой-то» — жалобa: промпт не отличает
 *  «El maestro quiere un pan pequeño» от «Un maestro quiere el pan pequeño») */
export function npRu(fill: Fill, role: string, opts: { articleHint?: boolean } = {}): string {
  const noun = fill[`${role}#noun`] as Word
  const det = fill[`${role}#det`] as Word | null
  const adj = fill[`${role}#adj`] as Word | null
  const num = (fill[`${role}#num`] as GramNumber) ?? 'sg'
  return ruNounPhrase(noun, { number: num, det: det ?? undefined, adj: adj ?? undefined, hint: opts.articleHint })
}

/** Число np-юнита из заполнения */
export function npNumber(fill: Fill, role: string): GramNumber {
  return (fill[`${role}#num`] as GramNumber) ?? 'sg'
}

export { esNounPhrase, needsPersonalA, joinPrepNP, conjugate, gerundOf, ruNounPhrase, ruAdjForm, ruGenitive, ruPlural, ruAccusative, ruNumberWord }
