// ============================================================
// shared/phrases/schema.ts — схема комбинаторных шаблонов фраз.
//
// Шаблон фразы — это упорядоченный список «юнитов» (осей выбора):
// свободная ось (местоимение, глагол), именная группа (np:
// существительное × число × определитель × прилагательное),
// связка «якорь-зависимость» (местоимение → род существительного),
// цепочка «глагол → предлог → существительное».
//
// Такая структура даёт:
// — точный комбинаторный подсчёт фраз (статистика «вы знаете N фраз»);
// — проекции «выучишь слово X → +Y фраз» (дельта-подсчёт);
// — детерминированное перечисление с пагинацией (страница «Фразы»);
// — случайные фразы для упражнений.
// ============================================================

import type { GramNumber, Word } from '../types'

/** Вариант фразы: утверждение / отрицание / общий вопрос */
export type PhraseKind = 'aff' | 'neg' | 'yesno' | 'qw'

export const KIND_ORDER: PhraseKind[] = ['aff', 'neg', 'yesno']

/** Русские названия вариантов (для интерфейса) */
export const KIND_LABELS: Record<PhraseKind, { ru: string; es: string }> = {
  aff: { ru: 'утвердительные', es: 'afirmativas' },
  neg: { ru: 'отрицательные', es: 'negativas' },
  yesno: { ru: 'вопросы (да/нет)', es: 'preguntas (sí/no)' },
  qw: { ru: 'вопросительные', es: 'preguntas con palabra interrogativa' },
}

/** Заполнение шаблона: роль → слово. Для именных групп роли с суффиксами. */
export type Fill = Record<string, Word | null | GramNumber>

/** Юнит выбора в шаблоне */
export type Unit =
  | {
      /** Свободная ось: одно слово из списка (список может зависеть от уже выбранных) */
      kind: 'free'
      role: string
      words: Word[] | ((chosen: Fill) => Word[])
    }
  | {
      /** Именная группа: сущ. × число × определитель × прилагательное */
      kind: 'np'
      role: string
      nouns: Word[]
      /** Какое число использовать */
      number: GramNumber | 'any'
      /** Определитель: 'subject' — артикли+притяжательные+указательные,
       *  'object' — всё + количество, 'none' — без определителя */
      detSet: 'subject' | 'object' | 'none'
      /** «Голая» форма без артикля для неисчисляемых ед.ч. и casa */
      bareAuto: boolean
      /** Согласованное прилагательное */
      withAdj: boolean
      /** Фильтр существительных (статический, от chosen не зависит) */
      nounFilter?: (n: Word) => boolean
    }
  | {
      /** Якорь → зависимость: род существительного согласуется с местоимением */
      kind: 'anchorDep'
      anchorRole: string
      anchors: Word[]
      depRole: string
      deps: Word[]
      /** Совместимость зависимого с якорем */
      compat: (anchor: Word, dep: Word) => boolean
    }
  | {
      /** Глагол → предлог → существительное (voy a la escuela) */
      kind: 'verbPrep'
      verbRole: string
      verbs: Word[]
      prepRole: string
      preps: Word[]
      nounRole: string
      nouns: Word[]
      /** Число именной группы существительного */
      number: GramNumber | 'any'
    }
  | {
      /** Глагол + семантически совместимое прямое дополнение
       *  (comer → еда, leer → предметы) */
      kind: 'verbObj'
      verbRole: string
      verbs: Word[]
      nounRole: string
      nouns: Word[]
      number: GramNumber | 'any'
      detSet: 'subject' | 'object' | 'none'
      bareAuto: boolean
      withAdj: boolean
    }
  | {
      /** Именная группа + зависимое слово, согласованное с существительным
       *  («El hombre es maestro» — профессия того же рода) */
      kind: 'npDep'
      role: string
      nouns: Word[]
      number: GramNumber | 'any'
      detSet: 'subject' | 'object' | 'none'
      bareAuto: boolean
      depRole: string
      deps: Word[]
      compat: (noun: Word, dep: Word) => boolean
    }

/** Комбинаторный шаблон фразы */
export interface Template {
  id: string
  /** Урок, с которого шаблон осмыслен (для сортировки в списке) */
  lesson: number
  /** Группа фраз (для фильтров в интерфейсе) */
  group: string
  /** Обязательные слова — без них шаблон не активен */
  requires: string[]
  /** Варианты: утверждение/отрицание/вопрос; у вопросительных — только 'qw' */
  variants: PhraseKind[]
  /** Вопросительное слово (для kind='qw') */
  questionWord?: Word
  /** Юниты выбора в порядке перечисления */
  units: Unit[]
  /** Сборка испанской фразы */
  render: (fill: Fill, kind: PhraseKind) => string
  /** Сборка русского перевода */
  ru: (fill: Fill, kind: PhraseKind) => string
}

/** Группы фраз (для фильтров интерфейса) */
export const PHRASE_GROUPS = [
  'ser/estar',
  'глагол + дополнение',
  'глагол + предлог',
  'модальные глаголы',
  'gustar',
  'there is/are (hay)',
  'вопросы',
  'наречия',
  'числа и время',
] as const

export type PhraseGroup = (typeof PHRASE_GROUPS)[number]

/** Ключ фразы для отслеживания практики: templateId + индексы + вариант */
export function phraseKey(templateId: string, indexes: number[], kind: PhraseKind): string {
  return `${templateId}|${indexes.join('.')}|${kind}`
}
