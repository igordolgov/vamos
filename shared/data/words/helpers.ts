// ============================================================
// shared/data/words/helpers.ts — фабрики для компактного описания словаря.
//
// Каждая фабрика возвращает Word с заполненными грамматическими данными.
// Комментарии в данных помогают понять употребление слова.
// ============================================================

import type {
  AdjectiveForms,
  ConstructionData,
  Gender,
  GramNumber,
  NounClass,
  PronounData,
  VerbData,
  VerbPerson,
  Word,
} from '../../types'

/**
 * Правильные формы глагола в настоящем времени по инфинитиву.
 * Латиноамериканский набор лиц: yo, tú, usted, nosotros, ustedes.
 */
export function regularForms(inf: string): Record<VerbPerson, string> {
  const stem = inf.slice(0, -2)
  const ending = inf.slice(-2)
  if (ending === 'ar') {
    return { '1s': stem + 'o', '2s': stem + 'as', '3s': stem + 'a', '1p': stem + 'amos', '3p': stem + 'an' }
  }
  if (ending === 'er') {
    return { '1s': stem + 'o', '2s': stem + 'es', '3s': stem + 'e', '1p': stem + 'emos', '3p': stem + 'en' }
  }
  // ir
  return { '1s': stem + 'o', '2s': stem + 'es', '3s': stem + 'e', '1p': stem + 'imos', '3p': stem + 'en' }
}

/** Формы глагола из массива [yo, tú, usted, nosotros, ustedes] */
export function forms(arr: [string, string, string, string, string]): Record<VerbPerson, string> {
  return { '1s': arr[0], '2s': arr[1], '3s': arr[2], '1p': arr[3], '3p': arr[4] }
}

/** Глагол с правильным спряжением */
export function v(
  id: string,
  es: string,
  ru: string[],
  lesson: number,
  opts: Partial<Omit<VerbData, 'forms'>> & { forms?: Record<VerbPerson, string> } = {},
  extra: Partial<Word> = {},
): Word {
  return {
    id,
    pos: 'verb',
    es,
    ru,
    lesson,
    verb: {
      forms: opts.forms ?? regularForms(es),
      transitive: opts.transitive ?? false,
      objClasses: opts.objClasses,
      withPrep: opts.withPrep,
      gerund: opts.gerund,
      modal: opts.modal,
      placeAdv: opts.placeAdv,
      special: opts.special,
      ruInf: opts.ruInf,
      ruForms: opts.ruForms,
    },
    ...extra,
  }
}

/** Существительное */
export function n(
  id: string,
  es: string,
  gender: Gender,
  plural: string,
  ru: string[],
  lesson: number,
  cls: NounClass,
  extra: Partial<Word> = {},
): Word {
  return {
    id,
    pos: 'noun',
    es,
    gender,
    nounPlural: plural,
    ru,
    lesson,
    nounClass: cls,
    ...extra,
  }
}

/** Регулярные формы прилагательного: blanco → blanca/blancos/blancas */
export function regA(m: string): AdjectiveForms {
  const stem = m.slice(0, -1)
  return { m, f: stem + 'a', mp: stem + 'os', fp: stem + 'as' }
}

/** Двухформенное прилагательное: grande/grandes, fácil/fáciles */
export function invA(m: string, pl: string): AdjectiveForms {
  return { m, f: m, mp: pl, fp: pl }
}

/** Прилагательное (extra — например, ruByClass для «richo»: богатый/вкусный) */
export function a(
  id: string,
  es: string,
  ru: string[],
  lesson: number,
  f: AdjectiveForms,
  state = false,
  extra: Partial<Word> = {},
): Word {
  return { id, pos: 'adjective', es, ru, lesson, adj: f, adjState: state, ...extra }
}

/** Местоимение */
export function p(id: string, es: string, ru: string[], lesson: number, pron: PronounData, extra: Partial<Word> = {}): Word {
  return { id, pos: 'pronoun', es, ru, lesson, pronoun: pron, ...extra }
}

/** Определитель (артикль и т.п.) */
export function d(
  id: string,
  es: string,
  ru: string[],
  lesson: number,
  det: import('../../types').DeterminerData,
  extra: Partial<Word> = {},
): Word {
  return { id, pos: 'determiner', es, ru, lesson, det, ...extra }
}

/** Предлог с указанием семантических классов существительных */
export function prep(id: string, es: string, ru: string[], lesson: number, nounClasses: NounClass[]): Word {
  return { id, pos: 'preposition', es, ru, lesson, nounClasses }
}

/** Наречие */
export function adv(
  id: string,
  es: string,
  ru: string[],
  lesson: number,
  meta: import('../../types').AdverbData = {},
  extra: Partial<Word> = {},
): Word {
  return { id, pos: 'adverb', es, ru, lesson, adverb: meta, ...extra }
}

/** Вопросительное слово */
export function qw(id: string, es: string, ru: string[], lesson: number, extra: Partial<Word> = {}): Word {
  return { id, pos: 'question', es, ru, lesson, ...extra }
}

/** Союз */
export function conj(id: string, es: string, ru: string[], lesson: number, extra: Partial<Word> = {}): Word {
  return { id, pos: 'conjunction', es, ru, lesson, ...extra }
}

/** Числительное (extra — например ruHint про un/una) */
export function num(id: string, es: string, ru: string[], lesson: number, extra: Partial<Word> = {}): Word {
  return { id, pos: 'number', es, ru, lesson, ...extra }
}

/** Конструкция */
export function cstr(id: string, es: string, ru: string[], lesson: number, data: ConstructionData): Word {
  return { id, pos: 'construction', es, ru, lesson, construction: data }
}

/** Число как грамматическое значение слова-существительного */
export type { GramNumber }
