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
  ребёнок: 'ребёнка',
  рынок: 'рынка',
  ботинок: 'ботинка',
  подарок: 'подарка',
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
  песо: 'песо',           // несклоняемое: двадцать песо
}

/** Исключения во мн.ч. */
const PLURAL_EXCEPTIONS: Record<string, string> = {
  день: 'дни',
  брат: 'братья',
  сестра: 'сёстры',
  учитель: 'учителя',
  мать: 'матери',
  дочь: 'дочери',
  сын: 'сыновья',
  друг: 'друзья',
  ребёнок: 'дети',
  господин: 'господа',
  // беглые гласные (отец → отцы, рынок → рынки)
  отец: 'отцы',
  рынок: 'рынки',
  сок: 'соки',
  ботинок: 'ботинки',
  подарок: 'подарки',
  яблоко: 'яблоки',
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
  песо: 'песо',
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
  // мужской род: +а/-я; слова на -а/-я (мужчина, дядя) склоняются как ж.р.
  if (baseWord.endsWith('а')) {
    const stem = baseWord.slice(0, -1)
    return stem + (isHardConsK(stem) ? 'и' : 'ы')
  }
  if (baseWord.endsWith('я')) return baseWord.slice(0, -1) + 'и'
  if (baseWord.endsWith('й')) return baseWord.slice(0, -1) + 'я'
  if (baseWord.endsWith('ь')) return baseWord.slice(0, -1) + 'я'
  return baseWord + 'а'
}

/** К, Г, Х, Ж, Ш, Щ, Ч — окончания «и» вместо «ы».
 *  Ц не входит: после «ц» в окончаниях пишется «ы»
 *  (учительницы, улицы — не «учительници», «улици»; жалоба пользователя) */
function isHardConsK(stem: string): boolean {
  const last = stem.slice(-1)
  return 'кгхжшщч'.includes(last)
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
  // м.р. на -а/-я (мужчина): мн.ч. как у ж.р. — мужчины
  if (baseWord.endsWith('а')) {
    const stem = baseWord.slice(0, -1)
    return stem + (isHardConsK(stem) ? 'и' : 'ы')
  }
  if (baseWord.endsWith('я')) return baseWord.slice(0, -1) + 'и'
  return baseWord + (isHardConsonantEnd(baseWord) ? 'ы' : 'и')
}

/**
 * Родительный падеж МН.Ч. (для числительных 5+ и подлежащих-людей:
 * «у родителей есть…», «пять столов»). Форма генитива мн.ч. в русском
 * нерегулярна (отец → отцов, год → лет, книга → книг), поэтому слова,
 * встречающиеся с числительными, перечислены явно; остальное — регулярные
 * правила (м.р. на согласный → -ов/-ей, ж.р. на -а → без окончания).
 */
const GEN_PLURAL: Record<string, string> = {
  // --- люди ---
  отец: 'отцов',
  мать: 'матерей',
  сын: 'сыновей',
  дочь: 'дочерей',
  брат: 'братьев',
  сестра: 'сестёр',
  семья: 'семей',
  друг: 'друзей',
  подруга: 'подруг',
  ребёнок: 'детей',
  мальчик: 'мальчиков',
  девочка: 'девочек',
  мужчина: 'мужчин',
  женщина: 'женщин',
  человек: 'людей',
  господин: 'господ',
  учитель: 'учителей',
  учительница: 'учительниц',
  врач: 'врачей',
  студент: 'студентов',
  ученик: 'учеников',
  // --- вещи (для числительных: «пять столов», «двадцать книг») ---
  дом: 'домов',
  машина: 'машин',
  телефон: 'телефонов',
  компьютер: 'компьютеров',
  ключ: 'ключей',
  рубашка: 'рубашек',
  ботинок: 'ботинок',
  сумка: 'сумок',
  фильм: 'фильмов',
  фото: 'фото',
  письмо: 'писем',
  карандаш: 'карандашей',
  ручка: 'ручек',
  стол: 'столов',
  стул: 'стульев',
  кровать: 'кроватей',
  вещь: 'вещей',
  книга: 'книг',
  // --- абстрактное (tener-num) ---
  проблема: 'проблем',
  вопрос: 'вопросов',
  ответ: 'ответов',
  идея: 'идей',
  история: 'историй',
  работа: 'работ',
  // --- время (hace N años) ---
  год: 'лет',
  месяц: 'месяцев',
  день: 'дней',
  неделя: 'недель',
  час: 'часов',
  минута: 'минут',
  // --- деньги (cuesta N pesos) ---
  доллар: 'долларов',
  песо: 'песо',
}

/** Родительный мн.ч.: человек → людей, книга → книг (запасная — регулярная) */
export function ruGenitivePlural(noun: Word): string {
  const raw = base(noun)
  if (GEN_PLURAL[raw]) return GEN_PLURAL[raw]
  if (noun.ruPluralOnly) return GEN_EXCEPTIONS[raw] ?? ruPlural(noun)
  const g = noun.ruGender ?? 'm'
  const w = raw
  // мужской род: шипящий/ь → -ей, -й → -ев, ц → -ев, остальное → -ов
  if (g === 'm') {
    if (/[шжчщ]ь?$/.test(w)) return w.replace(/ь$/, '') + 'ей'
    if (w.endsWith('й')) return w.slice(0, -1) + 'ев'
    if (w.endsWith('ь')) return w.slice(0, -1) + 'ей'
    if (w.endsWith('ц')) return w + 'ев'
    return w + 'ов'
  }
  // женский: -а → без окончания (книга → книг), -я/-ь → -ей
  if (g === 'f') {
    if (w.endsWith('а')) return w.slice(0, -1)
    if (w.endsWith('я')) return w.slice(0, -1) + 'й'
    if (w.endsWith('ь')) return w.slice(0, -1) + 'ей'
    return w
  }
  // средний: -о → без окончания (слово → слов), -е → -ей (море → морей)
  if (w.endsWith('о')) return w.slice(0, -1)
  if (w.endsWith('е')) return w + 'ей'
  return w
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

/** Родительный падеж прилагательного по роду существительного (ед.ч.):
 *  «нет хорошЕЙ одежды», «нет большОГО стола».
 *  Регулярные окончания: -ый/-ой → -ого/-ой, -ий → -его/-ей. */
export function ruAdjGenitive(adj: Word, noun: Word): string {
  const masc = adj.ruByClass?.[noun.nounClass ?? 'thing'] ?? (adj.ru[0] ?? adj.adj?.m ?? '')
  if (masc.endsWith('ий')) return masc.slice(0, -2) + ((noun.ruGender ?? 'm') === 'f' ? 'ей' : 'его')
  if (masc.endsWith('ый') || masc.endsWith('ой')) return masc.slice(0, -2) + ((noun.ruGender ?? 'm') === 'f' ? 'ой' : 'ого')
  return masc // нестандартная форма — без склонения
}

/** Родительный падеж определителя-притяжательного/указательного (ед.ч.):
 *  «нет МОЕГО ключа», «нет ЭТОЙ книги». Для артиклей/количества — null
 *  (в русском переводе не передаются). */
const DET_GENITIVE: Record<string, { m: string; f: string }> = {
  мой: { m: 'моего', f: 'моей' },
  твой: { m: 'твоего', f: 'твоей' },
  его: { m: 'его', f: 'его' },
  наш: { m: 'нашего', f: 'нашей' },
  этот: { m: 'этого', f: 'этой' },
  тот: { m: 'того', f: 'той' },
}

export function ruDetGenitive(det: Word, noun: Word): string | null {
  const forms = det.ruDet ? DET_GENITIVE[det.ruDet.m] : undefined
  if (!forms) return null
  return (noun.ruGender ?? 'm') === 'f' ? forms.f : forms.m
}

/** Базовая форма русского перевода без пояснений в скобках (им.п.) */
export function ruNominative(noun: Word): string {
  return base(noun)
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
