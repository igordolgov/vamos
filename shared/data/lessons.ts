// ============================================================
// shared/data/lessons.ts — уроки приложения.
//
// Порядок уроков задаётся curriculum.ts (частотность и разговорная
// полезность, а не части речи): местоимения и ser/estar, вопросительные
// слова уже на 3-м уроке — сразу можно спрашивать «¿Qué es?»,
// «¿Dónde está?» — затем глаголы, семья, числа, время и тематические
// блоки. Здесь — только заголовки и описания для интерфейса.
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

/** Все уроки приложения (порядок изучения — см. curriculum.ts) */
export const LESSONS: Lesson[] = [
  { number: 1, titleRu: 'Местоимения и ser/estar', titleEs: 'Pronombres y ser/estar', hintRu: 'yo, tú, soy, estoy — кто и как быть', unlocksFrom: 'Урок 3: «¿Qué es?» — ваш первый вопрос' },
  { number: 2, titleRu: 'Артикли и количество', titleEs: 'Los artículos', hintRu: 'el, la, un, una, mucho, poco' },
  { number: 3, titleRu: 'Первые вопросы', titleEs: 'Las primeras preguntas', hintRu: 'qué, quién, dónde, cómo, cuándo + muy bien', unlocksFrom: 'Урок 4: «¿Dónde trabajas?»' },
  { number: 4, titleRu: 'Базовые глаголы', titleEs: 'Verbos básicos', hintRu: 'hablar, comer, vivir, trabajar...', unlocksFrom: 'Урок 12: «Tengo dos hermanos»' },
  { number: 5, titleRu: 'Слова-связки', titleEs: 'Conectores', hintRu: 'y, o, pero, porque, si...' },
  { number: 6, titleRu: 'Ключевые глаголы', titleEs: 'Verbos clave', hintRu: 'tener, hacer, ir, poder, querer...' },
  { number: 7, titleRu: 'Нравится и конструкции', titleEs: 'Gustar y construcciones', hintRu: 'me gusta, hay, voy a, tengo que...', unlocksFrom: 'Урок 16: «Me gusta la música»' },
  { number: 8, titleRu: 'Семья', titleEs: 'La familia', hintRu: 'padre, madre, hermano, amigo...' },
  { number: 9, titleRu: 'Притяжательные и указательные', titleEs: 'Posesivos', hintRu: 'mi, tu, su, este, ese...', unlocksFrom: 'Урок 8: «Mi hermano habla español»' },
  { number: 10, titleRu: 'Люди и профессии', titleEs: 'Las personas', hintRu: 'hombre, mujer, maestro, médico...', unlocksFrom: 'Урок 10: «Yo soy maestro»' },
  { number: 11, titleRu: 'Время', titleEs: 'El tiempo', hintRu: 'día, año, semana, hora...', unlocksFrom: 'Урок 26: «Hace dos años»' },
  { number: 12, titleRu: 'Числа и «сколько»', titleEs: 'Números y cuánto', hintRu: 'cero — diez, cuánto, cuál', unlocksFrom: 'Урок 12: «¿Cuántos años tienes?»' },
  { number: 13, titleRu: 'Дом', titleEs: 'La casa', hintRu: 'casa, cocina, mesa, puerta...', unlocksFrom: 'Урок 13: «Estoy en la cocina»' },
  { number: 14, titleRu: 'Места в городе', titleEs: 'Los lugares', hintRu: 'escuela, tienda, parque...', unlocksFrom: 'Урок 14: «Voy a la escuela»' },
  { number: 15, titleRu: 'Вещи I', titleEs: 'Las cosas I', hintRu: 'libro, teléfono, dinero...' },
  { number: 16, titleRu: 'Вещи II', titleEs: 'Las cosas II', hintRu: 'película, música, carro...', unlocksFrom: 'Урок 16: «Me gusta la música»' },
  { number: 17, titleRu: 'Прилагательные I', titleEs: 'Los adjetivos I', hintRu: 'bueno, grande, nuevo, alto...', unlocksFrom: 'Урок 17: «Eres alto» (местоимение можно не говорить)' },
  { number: 18, titleRu: 'Состояния', titleEs: 'Estados', hintRu: 'cansado, contento, feliz... (с estar)' },
  { number: 19, titleRu: 'Прилагательные II', titleEs: 'Los adjetivos II', hintRu: 'fácil, caro, limpio...' },
  { number: 20, titleRu: 'Цвета и вкусы', titleEs: 'Colores y sabores', hintRu: 'rojo, verde, dulce...' },
  { number: 21, titleRu: 'Еда и напитки I', titleEs: 'La comida I', hintRu: 'agua, pan, carne, café...', unlocksFrom: 'Урок 22: «Hay una cerveza»' },
  { number: 22, titleRu: 'Еда и напитки II', titleEs: 'La comida II', hintRu: 'manzana, vino, sal...' },
  { number: 23, titleRu: 'Предлоги', titleEs: 'Las preposiciones', hintRu: 'a, de, en, con, para...', unlocksFrom: 'Урок 23: «¿De dónde eres?»' },
  { number: 24, titleRu: 'Предлоги-фразы', titleEs: 'Preposiciones compuestas', hintRu: 'antes de, cerca de...' },
  { number: 25, titleRu: 'Наречия места и времени', titleEs: 'Adverbios I', hintRu: 'aquí, ahora, siempre, nunca...' },
  { number: 26, titleRu: 'Наречия II', titleEs: 'Adverbios II', hintRu: 'ya, todavía, casi, más...' },
  { number: 27, titleRu: 'Глаголы II', titleEs: 'Verbos II', hintRu: 'beber, abrir, buscar, esperar...' },
  { number: 28, titleRu: 'Глаголы III', titleEs: 'Verbos III', hintRu: 'usar, pensar, salir, llamar...' },
  { number: 29, titleRu: 'Неправильные глаголы', titleEs: 'Verbos irregulares', hintRu: 'decir, venir, poner, dormir...' },
  { number: 30, titleRu: 'Дополнения: lo, la, todo', titleEs: 'Los complementos', hintRu: 'lo veo, algo, nada, todo...' },
  { number: 31, titleRu: 'Абстрактные понятия', titleEs: 'Ideas', hintRu: 'vida, mundo, pregunta, verdad...' },
  { number: 32, titleRu: 'Конструкции и языки', titleEs: 'Construcciones e idiomas', hintRu: 'acabar de, hace... + español, ruso...', unlocksFrom: 'Урок 32: «¿Hablas español?»' },
  { number: 33, titleRu: 'Спасательные фразы', titleEs: 'Frases de rescate', hintRu: 'dame, dime, mira, oye, espera — попроси и останови' },
]

/** Метаданные урока по номеру */
export function getLesson(number: number): Lesson | undefined {
  return LESSONS.find((l) => l.number === number)
}

/** Слова, отсортированные по урокам и исходному порядку словаря */
export function wordsOrderedByLesson(words: Word[]): Word[] {
  return [...words].sort((x, y) => x.lesson - y.lesson)
}
