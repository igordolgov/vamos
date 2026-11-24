// ============================================================
// shared/gloss.ts — пословный разбор испанской фразы.
//
// При неверном ответе помимо правила показывается «разбор»:
// каждое слово фразы — с переводом из словаря. Личные формы
// глаголов распознаются (tengo → tener, «имею»): строится
// индекс всех словарных форм (base, esAlt, мн.ч. существительных,
// формы прилагательных, спряжение глаголов, герундий).
// ============================================================

import type { VerbPerson, Word } from './types'
import { ALL_WORDS } from './data/words'

/** Одно слово разбора: само слово и его перевод (null — нет в словаре) */
export interface GlossEntry {
  es: string
  /** Перевод слова или формы; null — слова нет в словаре */
  ru: string | null
  /** Базовая форма, если это личная форма глагола (tengo → tener) */
  base?: string
}

/** Индекс личной формы глагола в ruForms [я, ты, он/она, мы, вы, они] */
const RU_FORM_INDEX: Record<VerbPerson, number> = { '1s': 0, '2s': 1, '3s': 2, '1p': 3, '3p': 5 }

type IndexHit = { word: Word; person?: VerbPerson }

let formIndex: Map<string, IndexHit> | null = null

/** Индекс всех словарных форм: испанская форма (ниже регистром) → слово */
function index(): Map<string, IndexHit> {
  if (formIndex) return formIndex
  const map = new Map<string, IndexHit>()
  const put = (es: string, word: Word, person?: VerbPerson) => {
    const key = es.toLowerCase()
    if (key && !map.has(key)) map.set(key, { word, person })
  }
  for (const w of ALL_WORDS) {
    put(w.es, w)
    for (const alt of w.esAlt ?? []) put(alt, w)
    if (w.nounPlural) put(w.nounPlural, w)
    for (const f of [w.adj?.m, w.adj?.f, w.adj?.mp, w.adj?.fp]) if (f) put(f, w)
    if (w.verb) {
      for (const p of Object.keys(w.verb.forms) as VerbPerson[]) {
        put(w.verb.forms[p], w, p)
      }
      if (w.verb.gerund) put(w.verb.gerund, w)
    }
  }
  formIndex = map
  return map
}

/** Очистить токен от пунктуации (¿Qué? → qué) */
function cleanToken(token: string): string {
  return token.replace(/[¿?¡!.,;:]/g, '').trim()
}

/** Русский перевод найденной формы: у глагола — форма нужного лица */
function ruOf(hit: IndexHit): string {
  if (hit.person && hit.word.verb?.ruForms) {
    const ru = hit.word.verb.ruForms[RU_FORM_INDEX[hit.person]]
    if (ru) return ru
  }
  return hit.word.ru[0] ?? ''
}

/**
 * Разбор фразы по словам: для каждого слова — перевод из словаря.
 * Личные формы глаголов узнаются: tengo → «имею» (tener).
 */
export function glossSentence(text: string): GlossEntry[] {
  return text
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean)
    .map((es) => {
      const hit = index().get(es.toLowerCase())
      return hit
        ? { es, ru: ruOf(hit), base: hit.person ? hit.word.es : undefined }
        : { es, ru: null }
    })
}

/**
 * Готовый текст разбора для показа: «tengo — имею · dos — два …».
 * Слова без перевода пропускаются; если переведённых нет — null.
 */
export function glossLine(text: string): string | null {
  const parts = glossSentence(text)
    .filter((e) => e.ru)
    .map((e) => `${e.es} — ${e.ru}`)
  return parts.length ? parts.join(' · ') : null
}
