// ============================================================
// shared/data/lessons.ts — уроки приложения.
//
// Порядок уроков = порядок изучения: сначала местоимения и глаголы
// ser/estar, затем базовые глаголы, существительные, прилагательные,
// предлоги — и уже на этой базе строятся фразы.
// ============================================================

import type { Word } from '../types'

/** Описание одного урока */
export interface Lesson {
  /** Номер урока (совпадает с полем Word.lesson) */
  number: number
  /** Заголовок на русском */
  titleRu: string
  /** Заголовок на испанском */
  titleEs: string
  /** Короткое описание (для карточки урока) */
  hintRu: string
  /** С какого урока фразы с этими словами «расцветают» */
  unlocksFrom?: string
}

/** Все уроки приложения (порядок изучения) */
export const LESSONS: Lesson[] = [
  { number: 1, titleRu: 'Местоимения-подлежащие', titleEs: 'Los pronombres', hintRu: 'yo, tú, usted — кто делает действие', unlocksFrom: 'Урок 3: «Yo soy» — ваша первая фраза' },
  { number: 2, titleRu: 'Артикли и количество', titleEs: 'Los artículos', hintRu: 'el, la, un, una — род и число', unlocksFrom: 'Урок 6: «un libro nuevo»' },
  { number: 3, titleRu: 'Ser и estar + отрицание', titleEs: 'Ser y estar', hintRu: 'Два «быть» и слово «no»', unlocksFrom: 'Урок 1: «Yo soy maestro»' },
  { number: 4, titleRu: 'Базовые глаголы', titleEs: 'Verbos básicos', hintRu: 'hablar, comer, vivir...', unlocksFrom: 'Урок 6: «Como pan»' },
  { number: 5, titleRu: 'Ключевые глаголы', titleEs: 'Verbos clave', hintRu: 'tener, hacer, ir, poder, querer...', unlocksFrom: 'Урок 23: «Tengo dos hermanos»' },
  { number: 6, titleRu: 'Семья', titleEs: 'La familia', hintRu: 'padre, madre, hermano...', unlocksFrom: 'Сотни фраз о семье' },
  { number: 7, titleRu: 'Люди и профессии', titleEs: 'Las personas', hintRu: 'hombre, mujer, maestro, médico...' },
  { number: 8, titleRu: 'Дом', titleEs: 'La casa', hintRu: 'mesa, puerta, cocina...', unlocksFrom: 'Урок 17: «Estoy en la cocina»' },
  { number: 9, titleRu: 'Места в городе', titleEs: 'Los lugares', hintRu: 'escuela, tienda, parque...', unlocksFrom: 'Урок 17: «Voy a la escuela»' },
  { number: 10, titleRu: 'Еда и напитки', titleEs: 'La comida', hintRu: 'pan, agua, café...', unlocksFrom: 'Урок 4: «Como pan»' },
  { number: 11, titleRu: 'Вещи I', titleEs: 'Las cosas I', hintRu: 'libro, teléfono, dinero...' },
  { number: 12, titleRu: 'Вещи II', titleEs: 'Las cosas II', hintRu: 'película, música, carro...' },
  { number: 13, titleRu: 'Прилагательные I', titleEs: 'Los adjetivos I', hintRu: 'bueno, grande, nuevo...', unlocksFrom: 'Урок 3: «El libro es bueno»' },
  { number: 14, titleRu: 'Состояния', titleEs: 'Estados', hintRu: 'cansado, contento, feliz... (с estar)' },
  { number: 15, titleRu: 'Прилагательные II', titleEs: 'Los adjetivos II', hintRu: 'fácil, caro, limpio...' },
  { number: 16, titleRu: 'Цвета и вкусы', titleEs: 'Colores y sabores', hintRu: 'rojo, verde, dulce...' },
  { number: 17, titleRu: 'Предлоги', titleEs: 'Las preposiciones', hintRu: 'a, de, en, con, para...', unlocksFrom: 'Урок 9: «Voy a la escuela»' },
  { number: 18, titleRu: 'Предлоги-фразы', titleEs: 'Preposiciones compuestas', hintRu: 'antes de, cerca de...' },
  { number: 19, titleRu: 'Наречия I', titleEs: 'Los adverbios I', hintRu: 'aquí, siempre, nunca...' },
  { number: 20, titleRu: 'Наречия II', titleEs: 'Los adverbios II', hintRu: 'ya, todavía, casi...' },
  { number: 21, titleRu: 'Вопросительные слова', titleEs: 'Las preguntas', hintRu: 'qué, dónde, cuándo...', unlocksFrom: 'Урок 4: «¿Dónde trabajas?»' },
  { number: 22, titleRu: 'Союзы', titleEs: 'Las conjunciones', hintRu: 'y, o, pero, porque...' },
  { number: 23, titleRu: 'Числительные', titleEs: 'Los números', hintRu: 'cero — diez', unlocksFrom: 'Урок 5: «Tengo dos hermanos»' },
  { number: 24, titleRu: 'Притяжательные и указательные', titleEs: 'Posesivos', hintRu: 'mi, tu, este, ese...', unlocksFrom: 'Урок 6: «Mi hermano habla español»' },
  { number: 25, titleRu: 'Местоимения-дополнения', titleEs: 'Los complementos', hintRu: 'me, te, le... и algo/nada' },
  { number: 26, titleRu: 'Конструкции и gustar', titleEs: 'Construcciones', hintRu: 'hay, tener que, me gusta...', unlocksFrom: 'Урок 10: «Me gusta la música»' },
  { number: 27, titleRu: 'Глаголы II', titleEs: 'Verbos II', hintRu: 'beber, abrir, buscar...' },
  { number: 28, titleRu: 'Глаголы III', titleEs: 'Verbos III', hintRu: 'usar, pensar, salir...' },
  { number: 29, titleRu: 'Неправильные глаголы', titleEs: 'Verbos irregulares', hintRu: 'decir, venir, dormir...' },
  { number: 30, titleRu: 'Время', titleEs: 'El tiempo', hintRu: 'día, año, semana...', unlocksFrom: 'Урок 26: «Hace dos años»' },
  { number: 31, titleRu: 'Абстрактные понятия', titleEs: 'Ideas', hintRu: 'vida, mundo, pregunta...' },
  { number: 32, titleRu: 'Языки', titleEs: 'Los idiomas', hintRu: 'español, ruso, inglés...', unlocksFrom: 'Урок 4: «¿Hablas español?»' },
]

/** Метаданные урока по номеру */
export function getLesson(number: number): Lesson | undefined {
  return LESSONS.find((l) => l.number === number)
}

/** Слова, отсортированные по урокам и исходному порядку словаря */
export function wordsOrderedByLesson(words: Word[]): Word[] {
  return [...words].sort((x, y) => x.lesson - y.lesson)
}
