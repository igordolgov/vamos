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

/** Совместим ли определитель с существительным (род/число/семантика) */
export function detCompatible(det: Word, noun: Word, number: GramNumber): boolean {
  const d = det.det
  if (!d) return false
  if (d.number && d.number !== number) return false
  if (d.gender && d.gender !== (noun.articleGender ?? noun.gender)) return false
  // «много/мало» — только неисчисляемое: много работы, но не «много двери»
  if (d.quantity) {
    const cls = noun.nounClass
    if (cls === 'food' || cls === 'drink') return true
    return UNCOUNTABLE_ABSTRACT.has(noun.id)
  }
  return true
}

/** Неисчисляемые абстрактные: с ними допустимо «много/мало» */
const UNCOUNTABLE_ABSTRACT = new Set(['n-tiempo', 'n-dinero', 'n-trabajo', 'n-musica', 'n-vida', 'n-amor'])

/** Совместимо ли прилагательное с существительным (все имеют 4 формы) */
export function adjCompatible(adj: Word, noun: Word): boolean {
  return !!adj.adj
}

/** Разрешена ли «голая» форма (без артикля) для существительного ед.ч. */
export function bareAllowed(noun: Word, number: GramNumber): boolean {
  if (number !== 'sg') return false
  const cls = noun.nounClass
  return cls === 'food' || cls === 'drink' || cls === 'abstract' || cls === 'language' || noun.id === 'n-casa'
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
  unit: Extract<Unit, { kind: 'np' }>,
  noun: Word,
  number: GramNumber,
  known: Set<string>,
): number {
  return npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, number, known, unit.withAdj)
}

/** Число определителей, сочетающихся с прилагательным (без quantity) */
function detsCountAdj(
  unit: Extract<Unit, { kind: 'np' }>,
  noun: Word,
  number: GramNumber,
  known: Set<string>,
): number {
  if (unit.detSet === 'none') return 1
  let ways = 0
  for (const det of detWords(unit.detSet)) {
    if (known.has(det.id) && detCompatible(det, noun, number) && !det.det?.quantity) ways++
  }
  if (unit.bareAuto && bareAllowed(noun, number)) ways += 1
  return ways
}

/** Число вариантов прилагательного для np-юнита */
function npAdjWays(unit: Extract<Unit, { kind: 'np' }>, noun: Word, known: Set<string>): number {
  if (!unit.withAdj) return 1
  // все прилагательные имеют формы для любого рода/числа
  return countWords(allAdjectives, known)
}

// кэш прилагательных и существительных (заполняется init-ом из templates)
let allAdjectives: Word[] = []
let allNounsCache: Word[] = []

/** Инициализация кэшей частей речи (вызывается из templates.ts) */
export function initEngine(adjectives: Word[], nouns: Word[]): void {
  allAdjectives = adjectives
  allNounsCache = nouns
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
        if (!known.has(noun.id)) continue
        const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
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
          ways += prepNounWays(prep, unit.nouns, known, unit.number)
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
        const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
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

/** Существительные, семантически совместимые с глаголом */
function verbCompatibleNouns(verb: Word, nouns: Word[]): Word[] {
  const cls = verb.verb?.objClasses
  if (!cls || cls.length === 0) return []
  return nouns.filter((n) => cls.includes(n.nounClass as never))
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
    const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
    for (const num of numbers) {
      ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, unit.withAdj)
    }
  }
  return ways
}

/** Способы «определитель × прилагательное» без привязки к np-юниту */
function npWaysPerNounFor(
  detSet: 'subject' | 'object' | 'none',
  bareAuto: boolean,
  noun: Word,
  number: GramNumber,
  known: Set<string>,
  withAdj = false,
): number {
  const adjWays = withAdj ? countWords(allAdjectives, known) : 1
  if (detSet === 'none') return adjWays
  let ways = 0
  for (const det of detWords(detSet)) {
    if (!known.has(det.id) || !detCompatible(det, noun, number)) continue
    ways += det.det?.quantity ? 1 : adjWays
  }
  if (bareAuto && bareAllowed(noun, number)) ways += adjWays
  return ways
}

/** Способы заполнения существительного для конкретного предлога */
function prepNounWays(prep: Word, nouns: Word[], known: Set<string>, number: GramNumber | 'any'): number {
  let ways = 0
  for (const noun of nouns) {
    if (!known.has(noun.id)) continue
    if (!nounMatchesPrep(prep, noun)) continue
    const numbers: GramNumber[] = number === 'any' ? ['sg', 'pl'] : [number]
    for (const num of numbers) {
      // «без» — всегда без артикля («sin azúcar»), остальные — с определителем
      if (prep.id === 'prep-sin') {
        ways += 1
        continue
      }
      let w = compatibleDets(detWords('object'), noun, num, known).filter((d) => !d.det?.quantity).length
      if (bareAllowed(noun, num)) w += 1
      ways += w
    }
  }
  return ways
}

/** Подходит ли существительное к предлогу (класс + русская аннотация) */
export function nounMatchesPrep(prep: Word, noun: Word): boolean {
  if (!(prep.nounClasses ?? []).includes(noun.nounClass as never)) return false
  // русская падежная аннотация обязательна (перевод без неё не собрать)
  const key = prep.id.replace('prep-', '') as 'a' | 'de' | 'en' | 'con' | 'para' | 'sin' | 'sobre' | 'desde' | 'hasta'
  return !!noun.ruCases?.[key]
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

/**
 * Сколько фраз (с учётом вариантов) собирается из известных слов.
 * Аналитическая комбинаторика: произведение способов по юнитам × варианты.
 */
export function countTemplate(t: Template, known: Set<string>): number {
  if (!templateReady(t, known)) return 0
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
  for (let i = 0; i < t.units.length; i++) {
    const unit = t.units[i]
    const rest = restWays.get(i) ?? 0
    for (const [wordId, gain] of unitGains(unit, known)) {
      result.set(wordId, (result.get(wordId) ?? 0) + gain * rest)
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
        const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
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
            const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
            for (const num of numbers) ways += detsCountAdj(unit, noun, num, known)
          }
          if (ways > 0) gains.set(adj.id, ways)
        }
      }
      // Определитель: Σ по известным существительным, с которыми совместим
      if (unit.detSet !== 'none') {
        for (const det of detWords(unit.detSet)) {
          if (known.has(det.id)) continue
          let ways = 0
          for (const noun of unit.nouns) {
            if (unit.nounFilter && !unit.nounFilter(noun)) continue
            if (!known.has(noun.id)) continue
            const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
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
          if (prep && known.has(prep.id)) ways += prepNounWays(prep, unit.nouns, known, unit.number)
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
            if (prep && known.has(prep.id) && nounMatchesPrep(prep, noun)) ways += 1
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
        const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
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
          const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
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
          if (!(verb.verb?.objClasses ?? []).includes(noun.nounClass as never)) continue
          const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
          for (const num of numbers) {
            ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, unit.withAdj)
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
              const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
              for (const num of numbers) {
                ways += npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, false)
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
            for (const noun of verbCompatibleNouns(verb, unit.nouns)) {
              if (!known.has(noun.id)) continue
              const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
              for (const num of numbers) {
                if (!detCompatible(det, noun, num)) continue
                ways += det.det?.quantity ? 1 : npWaysPerNounFor(unit.detSet, unit.bareAuto, noun, num, known, false)
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
        if (!known.has(noun.id)) { i++; continue }
        const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
        for (const num of numbers) {
          // «голая» форма — первый вариант, затем определители
          const dets: Array<Word | null> = []
          if (unit.detSet === 'none') {
            dets.push(null)
          } else {
            if (unit.bareAuto && bareAllowed(noun, num)) dets.push(null)
            for (const d of detWords(unit.detSet)) {
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
          const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
          for (const num of numbers) {
            const dets: Array<Word | null> = []
            if (unit.detSet === 'none') {
              dets.push(null)
            } else {
              if (unit.bareAuto && bareAllowed(noun, num)) dets.push(null)
              for (const d of detWords(unit.detSet)) {
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
          const nouns = unit.nouns.filter((n) => known.has(n.id) && nounMatchesPrep(prep, n))
          for (const noun of nouns) {
            const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
            for (const num of numbers) {
              // «sin» — всегда без артикля; остальные — с совместимыми определителями
              const dets: Array<Word | null> = []
              if (prep.id === 'prep-sin') {
                dets.push(null)
              } else {
                if (bareAllowed(noun, num)) dets.push(null)
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
        const numbers: GramNumber[] = unit.number === 'any' ? ['sg', 'pl'] : [unit.number]
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

/** Русская именная группа по заполнению np-юнита */
export function npRu(fill: Fill, role: string): string {
  const noun = fill[`${role}#noun`] as Word
  const det = fill[`${role}#det`] as Word | null
  const adj = fill[`${role}#adj`] as Word | null
  const num = (fill[`${role}#num`] as GramNumber) ?? 'sg'
  return ruNounPhrase(noun, { number: num, det: det ?? undefined, adj: adj ?? undefined })
}

/** Число np-юнита из заполнения */
export function npNumber(fill: Fill, role: string): GramNumber {
  return (fill[`${role}#num`] as GramNumber) ?? 'sg'
}

export { esNounPhrase, needsPersonalA, joinPrepNP, conjugate, gerundOf, ruNounPhrase, ruAdjForm, ruGenitive, ruPlural, ruAccusative, ruNumberWord }
