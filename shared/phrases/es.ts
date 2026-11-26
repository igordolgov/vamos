// ============================================================
// shared/phrases/es.ts — испанская грамматика для движка фраз.
//
// Артикли, согласование прилагательных, contracciones (al, del),
// личное «a», герундий. Все функции чистые — легко тестируются.
// ============================================================

import type { GramNumber, Word } from '../types'

/** Форма существительного в нужном числе */
export function nounForm(noun: Word, number: GramNumber): string {
  return number === 'pl' ? (noun.nounPlural ?? noun.es) : noun.es
}

/**
 * Артикль: определённый (el/la/los/las) или неопределённый (un/una/...).
 * Учитывает articleGender (el agua — ж.р., но артикль мужской).
 */
export function esArticle(noun: Word, number: GramNumber, definite: boolean): string {
  // Особый артикль (el agua) действует только в ед.ч.; во мн.ч. — «las aguas»
  const g = (number === 'sg' ? noun.articleGender : undefined) ?? noun.gender ?? 'm'
  if (definite) {
    if (number === 'pl') return g === 'm' ? 'los' : 'las'
    return g === 'm' ? 'el' : 'la'
  }
  if (number === 'pl') return g === 'm' ? 'unos' : 'unas'
  return g === 'm' ? 'un' : 'una'
}

/** Формы согласования определителя: adj либо pronoun.forms (mi/mis) */
export function detFormsOf(det: Word): import('../types').AdjectiveForms | undefined {
  return det.adj ?? det.pronoun?.forms
}

/**
 * Испанская именная группа: [определитель] [артикль] [существительное] [прилагательное].
 *
 * bare = без артикля — для неисчисляемых и языков:
 * «Como pan», «hablo español», «No tengo dinero».
 */
export function esNounPhrase(
  noun: Word,
  opts: { number?: GramNumber; definite?: boolean | null; det?: Word; adj?: Word } = {},
): string {
  const number = opts.number ?? 'sg'
  const parts: string[] = []

  // Согласованный определитель: mi casa, este libro, mucho trabajo
  const detForms = opts.det ? detFormsOf(opts.det) : undefined
  if (opts.det && detForms) {
    const key = detKey(noun, number)
    parts.push(detForms[key])
  }

  // Артикль (если не «голое» существительное)
  if (opts.definite !== null && opts.definite !== undefined) {
    parts.push(esArticle(noun, number, opts.definite))
  }

  parts.push(nounForm(noun, number))

  // Прилагательное после существительного, согласованное в роде и числе
  if (opts.adj?.adj) {
    const g = noun.gender ?? 'm'
    const key: keyof import('../types').AdjectiveForms =
      number === 'pl' ? (g === 'm' ? 'mp' : 'fp') : g === 'm' ? 'm' : 'f'
    parts.push(opts.adj.adj[key])
  }

  return parts.join(' ')
}

/** Ключ формы для определителя (mi/mis, este/esta/estos/estas) */
function detKey(noun: Word, number: GramNumber): keyof import('../types').AdjectiveForms {
  const g = noun.gender ?? 'm'
  return number === 'pl' ? (g === 'm' ? 'mp' : 'fp') : g === 'm' ? 'm' : 'f'
}

/**
 * Личное «a» перед прямым дополнением — лицом:
 * «Veo A la maestra», но «Veo la película».
 */
export function needsPersonalA(noun: Word): boolean {
  return noun.nounClass === 'person' || noun.nounClass === 'family'
}

/**
 * Склейка предлога с именной группой + contracciones:
 * a + el → al (al banco), de + el → del (del mercado).
 */
export function joinPrepNP(prep: string, np: string): string {
  if ((prep === 'a' || prep === 'de') && np.startsWith('el ')) {
    return prep + 'l' + np.slice(2)  // a + el banco → al banco
  }
  return prep + ' ' + np
}

/** Форма глагола для лица */
export function conjugate(verb: Word, person: import('../types').VerbPerson): string {
  return verb.verb?.forms[person] ?? verb.es
}

/** Герундий: правильный вычисляется, неправильный берётся из данных */
export function gerundOf(verb: Word): string {
  if (verb.verb?.gerund) return verb.verb.gerund
  const inf = verb.es
  if (inf.endsWith('ar')) return inf.slice(0, -2) + 'ando'
  return inf.slice(0, -2) + 'iendo'
}

/** Лицо глагола для подлежащего-местоимения */
export function personOfPronoun(pron: Word): import('../types').VerbPerson {
  return pron.pronoun?.person ?? '3s'
}

/** Форма глагола для существительного-подлежащего (всегда 3-е лицо) */
export function personOfNoun(number: GramNumber): import('../types').VerbPerson {
  return number === 'pl' ? '3p' : '3s'
}

/** Форма глагола для implied gender/number местоимения (nosotros → mp) */
export function impliedAdjKey(pron: Word): keyof import('../types').AdjectiveForms {
  const g = pron.pronoun?.impliedGender ?? 'm'
  const num = pron.pronoun?.impliedNumber ?? 'sg'
  return num === 'pl' ? (g === 'm' ? 'mp' : 'fp') : g === 'm' ? 'm' : 'f'
}

/** Обёртка вопроса: ¿…? */
export function questionMark(s: string): string {
  return `¿${s}?`
}

/** Заглавная первая буква (для начала предложения).
 *  Первая БУКВА, а не первый символ: «(конкретный) учитель…» →
 *  «(Конкретный) учитель…» (русские подсказки артикля начинаются со скобки) */
export function capitalize(s: string): string {
  const i = s.search(/\p{L}/u)
  if (i < 0) return s
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}
