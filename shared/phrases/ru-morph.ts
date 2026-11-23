// ============================================================
// shared/phrases/ru-morph.ts — механическая русская морфология.
//
// Падежи и число существительных для переводов фраз.
// Правила регулярные для нашего словаря, исключения — в таблице.
// ============================================================

import type { GramNumber, Word } from '../types'

/** Исключения при склонении (время → времени, деньги → денег...) */
const GEN_EXCEPTIONS: Record<string, string> = {
  отец: 'отца',
  мать: 'матери',
  дочь: 'дочери',
  день: 'дня',
  время: 'времени',
  имя: 'имени',
  деньги: 'денег',
  часы: 'часов',
  кофе: 'кофе',
  соль: 'соли',
  ночь: 'ночи',
  жизнь: 'жизни',
  любовь: 'любви',
  правда: 'правды',
  вода: 'воды',
  еда: 'еды',
  музыка: 'музыки',
  работа: 'работы',
  семья: 'семьи',
  учёба: 'учёбы',
}

/** Исключения во мн.ч. */
const PLURAL_EXCEPTIONS: Record<string, string> = {
  день: 'дни',
  брат: 'братья',
  человек: 'люди',
  город: 'города',
  время: 'времена',
  имя: 'имена',
  деньги: 'деньги',
  часы: 'часы',
  кофе: 'кофе',
  соль: 'соли',
  ночь: 'ночи',
  жизнь: 'жизни',
  любовь: 'любви',
  слово: 'слова',
  еда: 'блюда',
  место: 'места',
  море: 'моря',
}

/** Твёрдые согласные — после них мн.ч. на -ы, мягкие/шипящие — на -и */
function isHardConsonantEnd(stem: string): boolean {
  const last = stem.slice(-1)
  return 'бвгджзклмнпрстфхц'.includes(last)
}

/** Базовое слово русского перевода без пояснений в скобках */
function base(noun: Word): string {
  return (noun.ru[0] ?? noun.es).replace(/\s*\(.*\)\s*/, '')
}

/**
 * Родительный падеж ед.ч. («У меня нет…», «без…», «для…»):
 * дом → дома, машина → машины, время → времени.
 */
export function ruGenitive(noun: Word): string {
  const raw = base(noun)
  if (GEN_EXCEPTIONS[raw]) return GEN_EXCEPTIONS[raw]
  if (noun.ruPluralOnly) return GEN_EXCEPTIONS[raw] ?? ruPlural(noun)
  const baseWord = raw
  const g = noun.ruGender ?? 'm'
  if (g === 'n') {
    // средний род: о→а, е→я (окно → окна, море → моря)
    if (baseWord.endsWith('о')) return baseWord.slice(0, -1) + 'а'
    if (baseWord.endsWith('е')) return baseWord.slice(0, -1) + 'я'
    return baseWord
  }
  if (g === 'f') {
    if (baseWord.endsWith('а')) {
      // после к/г/х/ж/ш/щ/ц → и, иначе ы
      const stem = baseWord.slice(0, -1)
      return stem + (isHardConsK(stem) ? 'и' : 'ы')
    }
    if (baseWord.endsWith('я')) return baseWord.slice(0, -1) + 'и'
    if (baseWord.endsWith('ь')) return baseWord.slice(0, -1) + 'и'
    return baseWord
  }
  // мужской род: +а/-я
  if (baseWord.endsWith('й')) return baseWord.slice(0, -1) + 'я'
  return baseWord + 'а'
}

/** К, Г, Х, Ж, Ш, Щ, Ч — окончания «и» вместо «ы» */
function isHardConsK(stem: string): boolean {
  const last = stem.slice(-1)
  return 'кгхжшщчц'.includes(last)
}

/**
 * Именительный падеж мн.ч. (для числительных 5+):
 * книга → книги, дом → дома, время → времена.
 */
export function ruPlural(noun: Word): string {
  const baseWord = base(noun)
  if (PLURAL_EXCEPTIONS[baseWord]) return PLURAL_EXCEPTIONS[baseWord]
  const g = noun.ruGender ?? 'm'
  if (g === 'n') {
    if (baseWord.endsWith('о')) return baseWord.slice(0, -1) + 'а'
    if (baseWord.endsWith('е')) return baseWord.slice(0, -1) + 'я'
    return baseWord
  }
  if (g === 'f') {
    if (baseWord.endsWith('а')) {
      const stem = baseWord.slice(0, -1)
      return stem + (isHardConsK(stem) ? 'и' : 'ы')
    }
    if (baseWord.endsWith('я')) return baseWord.slice(0, -1) + 'и'
    if (baseWord.endsWith('ь')) return baseWord.slice(0, -1) + 'и'
    return baseWord
  }
  if (baseWord.endsWith('й')) return baseWord.slice(0, -1) + 'и'
  if (baseWord.endsWith('ь')) return baseWord.slice(0, -1) + 'и'
  return baseWord + (isHardConsonantEnd(baseWord) ? 'ы' : 'и')
}

/**
 * Винительный падеж одушевлённые = родительный, неодушевлённые = именительный.
 * Для неодушевлённых: машина → машину (ж.р. -а→-у), остальное без изменений.
 */
export function ruAccusative(noun: Word): string {
  const baseWord = base(noun)
  const g = noun.ruGender ?? 'm'
  if (g === 'f') {
    if (baseWord.endsWith('а')) return baseWord.slice(0, -1) + 'у'
    if (baseWord.endsWith('я')) return baseWord.slice(0, -1) + 'ю'
    return baseWord
  }
  return baseWord
}

/**
 * Числительное 2 по роду: два (м/ср), две (ж).
 */
export function ruTwoForm(noun: Word): string {
  return (noun.ruGender ?? 'm') === 'f' ? 'две' : 'два'
}

/**
 * Числительное + существительное по-русски:
 * 2–4 → род. ед.ч. («два брата»), 5+ → род. мн.ч. («пять братьев» ≈ pl).
 */
export function ruNumberNoun(noun: Word, count: number): string {
  if (count === 2) return `${ruTwoForm(noun)} ${ruGenitive(noun)}`
  if (count === 3 || count === 4) return `${noun.ru[0] === 'два' ? count : count} ${ruGenitive(noun)}`
  return `${count} ${ruPlural(noun)}`
}

/** Число в виде числительного словом (для hace dos años) */
export function ruNumberWord(n: number): string {
  const words: Record<number, string> = {
    0: 'ноль', 1: 'один', 2: 'два', 3: 'три', 4: 'четыре', 5: 'пять',
    6: 'шесть', 7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять',
  }
  return words[n] ?? String(n)
}

/** Русская форма числительного 2/3/4 по числу (для «hace dos años») */
export function ruCountWord(noun: Word, count: number): string {
  if (count === 2) return ruTwoForm(noun)
  return ruNumberWord(count)
}

/** Число как грамматическое значение для русского существительного */
export type { GramNumber }
