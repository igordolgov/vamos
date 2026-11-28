// ============================================================
// shared/practice.ts — генератор упражнений.
//
// Три типа упражнений (по выбору пользователя):
// — «choice»  — тест с 4 вариантами ответа (ES→RU и RU→ES);
// — «build»   — собрать испанскую фразу из плиток-слов;
// — «audio»   — прослушать испанское слово/фразу и выбрать перевод.
//
// Пул слов ОБЩЕЙ практики — уже встречавшийся материал (уроки,
// предыдущие сессии): незнакомые слова из будущих уроков в общую
// практику не попадают. Слово засчитывается «выученным» после
// 2 верных ответов.
// ============================================================

import type { Progress, Word } from './types'
import { isWordKnown, KNOWN_THRESHOLD } from './types'
import { ALL_WORDS, getWord } from './data/words'
import { LESSONS } from './data/lessons'
import { allTemplates } from './phrases/templates'
import { sampleFill, countTemplate } from './phrases/engine'
import { knownSet } from './stats'
import { phraseKey } from './phrases/schema'
import type { Fill } from './phrases/schema'
import { WORD_TIPS, PHRASE_TIPS } from './data/word-tips'
import type { WordTip } from './data/word-tips'
import type { PartOfSpeech } from './types'

// ============================================================
// Авто-подсказка: объяснение для слов и шаблонов без ручной
// записи в word-tips. Не так богато, как ручные подсказки, но
// при ЛЮБОМ неверном ответе пользователь видит пояснение.
// ============================================================

/** Названия частей речи по-русски — для авто-подсказки */
const POS_RU: Record<PartOfSpeech, string> = {
  pronoun: 'местоимение',
  determiner: 'артикль/определитель',
  verb: 'глагол',
  noun: 'существительное',
  adjective: 'прилагательное',
  preposition: 'предлог',
  adverb: 'наречие',
  question: 'вопросительное слово',
  conjunction: 'союз',
  number: 'числительное',
  construction: 'конструкция',
}

/**
 * Авто-подсказка по словарным данным: у существительных — род и
 * артикль, у глаголов — спряжение по лицам, у прилагательных —
 * формы рода и числа. Остальным — перевод и часть речи.
 */
export function autoWordTip(word: Word): WordTip {
  if (word.pos === 'noun') {
    const article = (word.articleGender ?? word.gender) === 'f' ? 'la' : 'el'
    const genderRu = word.gender === 'f' ? 'женского' : 'мужского'
    const trap = word.articleGender && word.gender && word.articleGender !== word.gender
    return {
      why: `«${word.es}» — существительное ${genderRu} рода${trap ? `: артикль «${article}» — исключение` : `: ${article} ${word.es}`}.`,
      hack: `Запоминай существительное сразу с артиклем — «${article} ${word.es}»: род не забудется.`,
    }
  }
  if (word.pos === 'verb' && word.verb) {
    const f = word.verb.forms
    const ending = word.es.endsWith('ar') ? '-ar' : word.es.endsWith('er') ? '-er' : '-ir'
    return {
      why: `«${word.es}» (${word.ru[0]}). Настоящее время: yo ${f['1s']}, tú ${f['2s']}, él/ella ${f['3s']}, nosotros ${f['1p']}, vosotros ${f['2p']}, ustedes ${f['3p']}.`,
      hack: `Глаголы на ${ending} меняют только окончание — проговори все лица вслух, форма закрепится.`,
    }
  }
  if (word.pos === 'adjective' && word.adj) {
    const a = word.adj
    return {
      why: `«${word.es}» (${word.ru[0]}) согласуется с предметом: ${a.m} (м.р.) → ${a.f} (ж.р.), во мн.ч. — ${a.mp}/${a.fp}.`,
      hack: `Прилагательное «копирует» существительное в роде и числе: la casa ${a.f}.`,
    }
  }
  return {
    why: `«${word.es}» — это «${word.ru.join(', ')}» (${POS_RU[word.pos]}).`,
    hack: `Запомни слово сразу внутри короткой фразы — оно начнёт всплывать само.`,
  }
}

/** Авто-подсказка для шаблона фразы без ручной записи: порядок слов */
function autoPhraseTip(): WordTip {
  return {
    why: `В испанском фраза собирается по порядку: кто? → что делает? → что/кому/где. Служебные слова (a, que, hay, артикль) пропускать нельзя.`,
    hack: `Собирай структуру, а не слова по одному: подлежащее, глагол, дополнение — и фраза соберётся сама.`,
  }
}

/** Подсказка шаблона: ручная запись, если есть, иначе авто */
function phraseTip(templateId: string): WordTip {
  return PHRASE_TIPS[templateId] ?? autoPhraseTip()
}

export type ExerciseKind = 'choice' | 'build' | 'audio' | 'active'

/** Одно упражнение */
export interface Exercise {
  kind: ExerciseKind
  /** Вопрос на испанском (или текст для озвучки в audio) */
  questionEs?: string
  /** Текст для озвучки (упражнение audio) */
  speak?: string
  /** Вопрос на русском (для направления RU → ES) */
  questionRu?: string
  /** Правильный испанский ответ без скобочных подсказок (RU → ES):
   *  текст для озвучки после проверки — кнопка произносит само слово,
   *  «(la) mesa» озвучивается как «mesa» */
  answerEs?: string
  /** Варианты ответа */
  options: string[]
  /** Индекс верного варианта */
  answerIndex: number
  /** Плитки для сборки (перемешанные испанские слова) */
  tiles?: string[]
  /** Правильный порядок плиток */
  answerTiles?: string[]
  /** Роль слова для каждой плитки (нижний регистр плитки → часть речи):
   *  цветовое кодирование «Сборки фразы» — глаголы красные,
   *  существительные синие, предлоги/артикли серые (учит структуре) */
  tileWords?: Record<string, PartOfSpeech>
  /** Поэтапный режим («Слова по шагам»): stages[k] — набор плиток-кандидатов
   *  для выбора k-го слова ответа: верное слово + похожие отвлекающие.
   *  Слова фразы целиком не видны — собирать приходится шаг за шагом */
  stages?: string[][]
  /** Допустимые варианты без подлежащего-местоимения: по-испански местоимение
   *  опускается, когда форму глагола не с кем перепутать («Eres alto» =
   *  «Tú eres alto»). Для неоднозначных форм (es/son) вариант не даётся */
  altAnswers?: string[]
  /** Подсказка-перевод (для build) */
  hint?: string
  /** Слова, к которым засчитывается ответ */
  wordIds: string[]
  /** Ключ фразы (если упражнение про фразу) */
  phraseKey?: string
  /** Краткое пояснение (показывается после ответа) */
  explanation?: string
  /** Почему ошибиться легко и лайфхак запоминания — показывается при НЕверном ответе */
  tip?: WordTip
  /** Что означает каждый отвлекающий вариант: текст варианта → «это …».
   *  Позволяет объяснить, почему выбранный вариант неверен
   *  («где» — это «dónde») */
  optionNotes?: Record<string, string>
  /** Активный перевод (RU → ES): каноничный ответ для ввода (нижний регистр) */
  typeAnswer?: string
  /** Допустимые варианты написания (esAlt): «teléfono» без ударения не считаем ошибкой */
  altTypeAnswers?: string[]
}

/** Перемешать массив (Fisher–Yates) */
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Убрать пунктуацию для плиток сборки фразы */
function stripPunct(s: string): string[] {
  return s
    .replace(/[¿?¡!.]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

// ============================================================
// «Уже выучил»: слово или фраза попадаются реже (не исчезают)
// ============================================================

/** Нормализованное предложение: ключ для пометки фраз */
export function normalizePhraseKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[¿?¡!.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ключ пометки для упражнения: фраза (если это фраза) или null */
export function phraseStarKey(ex: Exercise): string | null {
  if (ex.kind === 'build') {
    return ex.answerTiles ? normalizePhraseKey(ex.answerTiles.join(' ')) : null
  }
  if (ex.phraseKey && ex.questionEs) return normalizePhraseKey(ex.questionEs)
  return null
}

/**
 * Пометить упражнение «уже выучил»: фраза — по нормализованному
 * предложению (в практике фраза встречается реже), отдельное слово —
 * по его id (слово считается выученным — как кнопка «Уже знал»).
 * Пометка не влияет на счётчики ответов.
 */
export function starExercise(progress: Progress, ex: Exercise, now: number = Date.now()): void {
  const pkey = phraseStarKey(ex)
  if (pkey) {
    progress.starredPhrases = { ...progress.starredPhrases, [pkey]: now }
    return
  }
  for (const id of ex.wordIds) {
    const wp = progress.words[id] ?? { correct: 0, wrong: 0 }
    progress.words[id] = { ...wp, star: now }
  }
}

/**
 * «Уже знал» из словаря: пользователь подтвердил знание слова
 * прямо на странице «Слова». Слово считается выученным — идёт
 * в knownSet (статистика, процент уроков) и включается во фразы,
 * как пройденное в уроках. Счётчики ответов не меняются.
 */
export function starWord(progress: Progress, wordId: string, now: number = Date.now()): void {
  const wp = progress.words[wordId] ?? { correct: 0, wrong: 0 }
  progress.words[wordId] = { ...wp, star: now }
}

/** Снять пометку «уже знал»: счётчики и «выученность» сохраняются */
export function unstarWord(progress: Progress, wordId: string): void {
  const wp = progress.words[wordId]
  if (!wp?.star) return
  progress.words[wordId] = { correct: wp.correct, wrong: wp.wrong, knownAt: wp.knownAt }
}

// ============================================================
// «Нравится» / «не нравится» — личная реакция на фразу:
// 👍 — фраза в коллекции, в практике встречается ЧАЩЕ;
// 👎 — фраза вообще больше не показывается.
// ============================================================

/** Добавить фразу в личную коллекцию («нравится»): показывать чаще */
export function likePhrase(progress: Progress, ex: Exercise, now: number = Date.now()): string | null {
  const pkey = phraseStarKey(ex)
  if (!pkey) return null
  progress.likedPhrases = { ...(progress.likedPhrases ?? {}), [pkey]: now }
  // лайк снимает дизлайк: фаза «не нравится» → «нравится» возможна
  if (progress.hiddenPhrases?.[pkey]) {
    const hidden = { ...progress.hiddenPhrases }
    delete hidden[pkey]
    progress.hiddenPhrases = hidden
  }
  return pkey
}

/** Скрыть фразу («не нравится»): вообще не показывать в практике */
export function hidePhrase(progress: Progress, ex: Exercise, now: number = Date.now()): string | null {
  const pkey = phraseStarKey(ex)
  if (!pkey) return null
  progress.hiddenPhrases = { ...(progress.hiddenPhrases ?? {}), [pkey]: now }
  // дизлайк снимает лайк (взаимоисключающие реакции)
  if (progress.likedPhrases?.[pkey]) {
    const liked = { ...progress.likedPhrases }
    delete liked[pkey]
    progress.likedPhrases = liked
  }
  return pkey
}

/** Нормализация испанского ввода для «Активного перевода»:
 *  нижний регистр, без ¿?¡!., диакритики и лишних пробелов —
 *  «telefono» = «teléfono» (клавиатура без ударений не ошибка) */
export function normalizeTyped(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[¿?¡!.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Слово пригодно для «Активного перевода» (RU → ES вводом):
 * конструкции-формулы («estar + герундий») вводить нельзя —
 * это описание конструкции, а не испанское слово.
 */
export function typeableWord(w: Word): boolean {
  return !w.es.includes('+')
}

/**
 * Пул слов ОБЩЕЙ практики — закрепление уже встречавшегося материала:
 * сначала слова «в процессе» (были ответы, но порог «выучено» ещё не
 * набран), затем уже известные — для повторения. Слова, которых
 * пользователь ещё ни разу не видел (будущие уроки), в пул не
 * попадают: практика спрашивает то, что изучено, а новые слова
 * появляются в уроках. «Встречалось» — была хотя бы одна попытка
 * (верная или неверная) в уроке или в практике. Слова с пометкой
 * «Уже знал» — выученные: они в knownSet и попадают в группу
 * повторения наравне с остальными известными.
 */
export function practicePool(progress: Progress, maxLesson = LESSONS.length): Word[] {
  const known = knownSet(progress)
  const touched = (w: Word) => {
    const wp = progress.words[w.id]
    return !!wp && (wp.correct > 0 || wp.wrong > 0)
  }
  const inProgress = ALL_WORDS.filter(
    (w) => !known.has(w.id) && touched(w) && w.lesson <= maxLesson,
  )
  const review = ALL_WORDS.filter((w) => known.has(w.id))
  // Приоритет: закрепление недоученного, повторение изученного
  return [...shuffle(inProgress), ...shuffle(review)]
}

/**
 * Есть ли у пользователя материал для общей практики: хоть одно
 * встречавшееся или изученное слово. Если нет — в меню практики
 * показывается подсказка «пройдите урок» вместо плиток режимов.
 */
export function hasPracticeMaterial(progress: Progress): boolean {
  return practicePool(progress).length > 0
}

/** Направление теста-выбора для слова */
type WordChoiceDir = 'es-ru' | 'ru-es'

/**
 * Отвлекающие не вводят неизученные слова: берём слова той же части
 * речи не дальше фронтира пользователя (maxLesson), вопросительные —
 * только уже изученные. Если таких меньше трёх — берём слова фронтира
 * целиком (вопросительное слово всегда учим в пакете соседних: qué
 * рядом с dónde и cómo), и лишь затем — весь словарь (вопрос должен
 * остаться разрешимым).
 */
function distractorCandidates(
  word: Word,
  all: Word[],
  maxLesson?: number,
  known?: Set<string>,
): Word[] {
  const samePos = all.filter((w) => w.pos === word.pos && w.id !== word.id)
  if (maxLesson === undefined) return samePos
  const upTo = samePos.filter((w) => w.lesson <= maxLesson)
  const allowed = upTo.filter(
    (w) => w.pos !== 'question' || (known?.has(w.id) ?? false),
  )
  if (allowed.length >= 3) return allowed
  if (upTo.length >= 3) return upTo
  return samePos
}

/**
 * Отображение испанского слова в вариантах «RU → ES»: перед
 * существительным — артикль в скобках («(la) mesa»). Серая подсказка
 * рода: учит запоминать существительное сразу с артиклем, но не
 * считается частью слова. Остальным частям речи артикль не нужен.
 */
export function esNounDisplay(w: Word): string {
  if (w.pos !== 'noun') return w.es
  const article = (w.articleGender ?? w.gender) === 'f' ? 'la' : 'el'
  return `(${article}) ${w.es}`
}

/** Упражнение «выбор варианта» по слову */
export function wordChoiceExercise(
  word: Word,
  all: Word[],
  dir: WordChoiceDir,
  rand: () => number = Math.random,
  maxLesson?: number,
  known?: Set<string>,
): Exercise {
  const esRu = dir === 'es-ru'
  // Отвлекающие — той же части речи, БЕЗ дубликатов перевода:
  // два одинаковых варианта делают вопрос неразрешимым.
  // Для каждого варианта запоминаем, что он на самом деле означает —
  // после неверного ответа объясняем: «где» — это «dónde».
  // RU → ES: перед каждым существительным-вариантом серая подсказка
  // артикля — и у верного ответа, и у дистракторов (иначе подсказка
  // выдавала бы верный вариант)
  const answer = esRu ? word.ru[0]! : esNounDisplay(word)
  const seen = new Set([answer])
  const distractors: string[] = []
  const notes: Record<string, string> = {}
  for (const w of shuffle(distractorCandidates(word, all, maxLesson, known), rand)) {
    const opt = esRu ? w.ru[0]! : esNounDisplay(w)
    if (seen.has(opt)) continue
    seen.add(opt)
    distractors.push(opt)
    notes[opt] = esRu ? `это «${w.es}»` : `это «${w.ru.join(', ')}»`
    if (distractors.length === 3) break
  }
  const options = shuffle([answer, ...distractors], rand)
  const answerIndex = options.findIndex((o) => o === answer)
  // Вопрос RU→ES: у артиклей перевод-маркер («(ж.р.)») сам по себе
  // двусмысленен (la и una обе «ж.р.») — берём понятный ruHint
  const ruQuestion =
    word.pos === 'determiner' ? (word.ruHint ?? word.ru[0]!) : word.ru[0]!
  return {
    kind: 'choice',
    questionEs: esRu ? word.es : undefined,
    questionRu: esRu ? undefined : ruQuestion,
    // RU → ES: озвучиваем само слово, без скобочной подсказки артикля
    answerEs: esRu ? undefined : word.es,
    options,
    answerIndex,
    wordIds: [word.id],
    explanation: `${word.es} — ${word.ru.join(', ')}`,
    tip: WORD_TIPS[word.id] ?? autoWordTip(word),
    optionNotes: notes,
  }
}

/** Упражнение «выбор варианта» по фразе */
export function phraseChoiceExercise(
  fill: Fill,
  templateId: string,
  kind: 'aff' | 'neg' | 'yesno' | 'qw',
  rand: () => number = Math.random,
): Exercise {
  const t = allTemplates().find((t) => t.id === templateId)!
  const es = t.render(fill, kind)
  const ru = t.ru(fill, kind)
  // Отвлекающие варианты — переводы других заполнений того же шаблона
  const distractors: string[] = []
  for (let i = 0; i < 10 && distractors.length < 3; i++) {
    const f2 = sampleFill(t, new Set(Object.values(fill).filter((v): v is Word => !!v && typeof v === 'object' && 'id' in v).map((w) => w.id)), rand)
    if (!f2) continue
    const ru2 = t.ru(f2, kind)
    if (ru2 !== ru && !distractors.includes(ru2)) distractors.push(ru2)
  }
  const options = shuffle([ru, ...distractors], rand)
  const answerIndex = options.findIndex((o) => o === ru)
  // Слова фразы — для засчитывания ответов
  const wordIds = Object.values(fill)
    .filter((v): v is Word => !!v && typeof v === 'object' && 'id' in v)
    .map((w) => w.id)
  return {
    kind: 'choice',
    questionEs: es,
    options,
    answerIndex,
    wordIds,
    phraseKey: phraseKey(t.id, [0], kind),
    explanation: `${es} — ${ru}`,
    tip: phraseTip(templateId),
  }
}

/**
 * Оценка ширины плитки в пикселях: 16px-шрифт (текст-base), паддинги
 * px-2.5 (20px), граница и перенос (gap 4px). Оценка ЗАВЫШЕННА
 * (8px/символ против фактических ~7px латиницы): пул гарантированно
 * остаётся в пределах бюджета, плитки длинных слов не занижены.
 */
export function tileWidthPx(w: string): number {
  return w.length * 8 + 26
}

/**
 * Лишние слова-дистракторы для сборки фразы: слова, виденные
 * пользователем, которых нет в ответе — без дубликатов и пунктуации.
 * Если передан known — дистракторы ТОЛЬКО из этого набора (изученные
 * и встречавшиеся слова: незнакомые слова не подмешиваются в плитки).
 * Неизученные вопросительные слова не предлагаются вовсе. Если слов
 * уровня не хватило (первые уроки) — добираем из всего словаря.
 *
 * Число дистракторов — БОЛЬШЕ прежних 2–3 (до 5: сборка требует
 * думать, а не набирать подряд), но пул ограничен ШИРИНОЙ ДВУХ СТРОК
 * на мобильном (390px → строка пула ~344px): считаем ширину плиток
 * ответа + добавленных дистракторов и останавливаемся на границе
 * бюджета. Минимум 2 — пул из одних слов фразы слишком прост
 * (набирай подряд); первые два добавляются и при превышении бюджета
 * (длинная фраза), остальные — строго в пределах двух строк.
 */
export function buildDistractors(
  answerTiles: string[],
  maxLesson: number,
  rand: () => number,
  known?: Set<string>,
): string[] {
  const n = answerTiles.length <= 3 ? 4 : 5
  const MIN = 2
  // Бюджет ширины: две строки пула на мобильном (390px минус паддинги
  // страницы/карточки = ~344px на строку)
  const TWO_ROW_BUDGET = 2 * 344
  const used = new Set(answerTiles.map((w) => w.toLowerCase()))
  let widthSum = answerTiles.reduce((s, w) => s + tileWidthPx(w), 0)
  const taken = new Set<string>()
  const out: string[] = []
  const tryPush = (es: string): boolean => {
    if (/\s/.test(es)) return false // только отдельные слова
    const key = es.toLowerCase()
    if (used.has(key) || taken.has(key) || /[¿?¡!.]/.test(key)) return false
    const w = tileWidthPx(key)
    // Первые MIN — всегда (пул без дистракторов слишком прост),
    // остальные — только в пределах двух строк
    if (out.length >= MIN && widthSum + w > TWO_ROW_BUDGET) return false
    taken.add(key)
    widthSum += w
    out.push(key)
    return true
  }
  const seen = new Set<string>()
  const isQw = (w: Word) => w.pos === 'question'
  const pools = [
    ALL_WORDS.filter(
      (w) =>
        w.lesson <= maxLesson &&
        (!known || known.has(w.id)) &&
        (!isQw(w) || (known?.has(w.id) ?? false)),
    ),
    ALL_WORDS.filter((w) => !isQw(w) || (known?.has(w.id) ?? false)),
  ]
  for (const pool of pools) {
    for (const w of shuffle(pool, rand)) {
      if (out.length >= n) return out
      if (seen.has(w.id)) continue
      seen.add(w.id)
      tryPush(w.es)
    }
  }
  return out
}

/**
 * Подлежащее-местоимение можно опустить, если у глагола форма,
 * не совпадающая ни с чьей другой: soy (только yo), eres (только tú),
 * somos (только nosotros). Формы es/son у usted/él/ella и
 * ustedes/ellos совпадают — там местоимение обязательно.
 */
const DROPPABLE_SUBJECTS = new Set(['p-yo', 'p-tu', 'p-nosotros'])

/** Варианты фразы с опущенным подлежащим-местоимением («Eres alto») */
function pronounDroppedVariants(fill: Fill, answerTiles: string[]): string[] {
  const out: string[] = []
  for (const val of Object.values(fill)) {
    const w = val as Word
    if (
      !w ||
      typeof w !== 'object' ||
      !('id' in w) ||
      w.pronoun?.role !== 'subject' ||
      !DROPPABLE_SUBJECTS.has(w.id)
    ) {
      continue
    }
    const lower = w.es.toLowerCase()
    const idx = answerTiles.findIndex((t) => t.toLowerCase() === lower)
    if (idx >= 0) {
      out.push(
        [...answerTiles.slice(0, idx), ...answerTiles.slice(idx + 1)]
          .join(' ')
          .toLowerCase(),
      )
    }
  }
  return out
}

// ============================================================
// Поэтапная сборка («Слова по шагам»): усложнённый режим, в котором
// пул плиток открывается шаг за шагом. На каждом шаге — верное слово
// и похожие отвлекающие: сначала вопросительные (cómo среди qué/cuál),
// затем местоимения (te среди me/tu/se), затем формы глагола
// (llamas среди llamo/llama/llamar). Словарь расширять не нужно:
// отвлекающие берутся из форм слов, которые уже есть в данных.
// ============================================================

/** Все испанские формы слова в нижнем регистре: базовая форма,
 *  варианты написания, спряжения глагола, род/число прилагательного,
 *  множественное число существительного */
function wordForms(w: Word): string[] {
  const out = [w.es, ...(w.esAlt ?? [])]
  if (w.verb) out.push(...Object.values(w.verb.forms))
  if (w.adj) out.push(w.adj.m, w.adj.f, w.adj.mp, w.adj.fp)
  if (w.pronoun?.forms)
    out.push(w.pronoun.forms.m, w.pronoun.forms.f, w.pronoun.forms.mp, w.pronoun.forms.fp)
  if (w.nounPlural) out.push(w.nounPlural)
  return out.map((s) => s.toLowerCase()).filter(Boolean)
}

/** Индекс «форма слова → слова»: для плиток без слова в заполнении
 *  (служебные hay, que…) — найти источник по всему словарю.
 *  Строится лениво один раз: словарь статичен */
let FORM_INDEX: Map<string, Word[]> | null = null
function formIndex(): Map<string, Word[]> {
  if (FORM_INDEX) return FORM_INDEX
  const idx = new Map<string, Word[]>()
  for (const w of ALL_WORDS) {
    for (const f of wordForms(w)) {
      const list = idx.get(f)
      if (list) list.push(w)
      else idx.set(f, [w])
    }
  }
  FORM_INDEX = idx
  return idx
}

/**
 * Плитки-кандидаты для каждой позиции ответа (поэтапный режим).
 * stages[k] — набор плиток для выбора k-го слова: верное слово + до
 * четырёх похожих отвлекающих. Приоритет отвлекающих:
 * 1) другие формы того же слова (llamas → llamo, llama, llamar);
 * 2) слова той же части речи (вопросительные — рядом с вопросительными;
 *    местоимения и определители в одном пуле: te рядом с tu);
 * 3) любые изученные слова уровня.
 * Слова, уже собранные в начале фразы и больше не нужные, не
 * предлагаются (шум без пользы), а слова оставшейся части фразы —
 * предлагаются: попасться «рано» им не вредно.
 */
export function buildStages(
  answerTiles: string[],
  fill: Fill,
  maxLesson: number,
  rand: () => number = Math.random,
  known?: Set<string>,
): string[][] {
  const answer = answerTiles.map((w) => w.toLowerCase())
  // Плитка → слово-источник: сначала ищем среди слов заполнения (каждое
  // слово претендует на «свою» плитку), иначе — по индексу форм словаря
  const source: (Word | null)[] = answer.map(() => null)
  const claimed = new Set<string>()
  for (let k = 0; k < answer.length; k++) {
    const token = answer[k]!
    const free = Object.values(fill).filter(
      (v): v is Word => !!v && typeof v === 'object' && 'id' in v && !claimed.has(v.id),
    )
    const match = free.find((w) => wordForms(w).includes(token))
    if (match) {
      source[k] = match
      claimed.add(match.id)
    } else {
      source[k] = formIndex().get(token)?.[0] ?? null
    }
  }
  const isQw = (w: Word) => w.pos === 'question'
  const allowed = (w: Word) => w.lesson <= maxLesson && (!isQw(w) || (known?.has(w.id) ?? false))
  return answer.map((target, k) => {
    const src = source[k]
    const usedBefore = answer.slice(0, k)
    const remaining = answer.slice(k + 1)
    // Отвлекающее не равно верному слову; слово из уже собранного начала
    // предлагается, только если оно ещё понадобится в хвосте фразы
    const allowedDistractor = (w: string) =>
      w !== target && (remaining.includes(w) || !usedBefore.includes(w))
    const pools: string[][] = []
    // 1) другие формы того же слова — самые коварные отвлекающие
    if (src) pools.push(shuffle(wordForms(src).filter((f) => f !== target), rand))
    // 2) слова той же части речи; местоимения и определители — вместе
    const posList: PartOfSpeech[] = !src
      ? []
      : src.pos === 'pronoun'
        ? ['pronoun', 'determiner']
        : src.pos === 'determiner'
          ? ['determiner', 'pronoun']
          : [src.pos]
    if (posList.length) {
      pools.push(
        shuffle(
          ALL_WORDS.filter(
            (w) => posList.includes(w.pos) && w.id !== src?.id && allowed(w),
          ).map((w) => w.es.toLowerCase()),
          rand,
        ),
      )
    }
    // 3) общий пул изученных слов уровня
    pools.push(
      shuffle(ALL_WORDS.filter((w) => allowed(w)).map((w) => w.es.toLowerCase()), rand),
    )
    const poolWords = [target]
    const taken = new Set([target])
    outer: for (const pool of pools) {
      for (const w of pool) {
        if (poolWords.length >= 5) break outer
        if (/\s/.test(w) || /[¿?¡!.,]/.test(w)) continue
        if (taken.has(w) || !allowedDistractor(w)) continue
        taken.add(w)
        poolWords.push(w)
      }
    }
    return shuffle(poolWords, rand)
  })
}

/**
 * Роль слова для каждой плитки (цветовое кодирование «Сборки фразы»).
 * Ключ — плитка в нижнем регистре, значение — часть речи. Слова фразы
 * берём из заполнения (форма слова → слово, каждое слово один раз),
 * отвлекающие — по индексу форм всего словаря (формIndex).
 * Возвращает undefined, если ни одна плитка не распознана.
 */
function tilePosMap(
  answerTiles: string[],
  distractors: string[],
  fill: Fill,
): Record<string, PartOfSpeech> | undefined {
  const map: Record<string, PartOfSpeech> = {}
  const claimed = new Set<string>()
  const fillWords = Object.values(fill).filter(
    (v): v is Word => !!v && typeof v === 'object' && 'id' in v,
  )
  const resolve = (tile: string): Word | undefined => {
    const key = tile.toLowerCase()
    const free = fillWords.find((w) => !claimed.has(w.id) && wordForms(w).includes(key))
    if (free) {
      claimed.add(free.id)
      return free
    }
    return formIndex().get(key)?.[0]
  }
  for (const tile of [...answerTiles, ...distractors]) {
    const key = tile.toLowerCase()
    if (map[key]) continue
    const w = resolve(tile)
    if (w) map[key] = w.pos
  }
  return Object.keys(map).length ? map : undefined
}

/** Упражнение «сборка фразы из плиток» */
export function buildExercise(
  fill: Fill,
  templateId: string,
  kind: 'aff' | 'neg' | 'yesno' | 'qw',
  rand: () => number = Math.random,
  maxLesson: number = LESSONS.length,
  known?: Set<string>,
  staged = false,
): Exercise {
  const t = allTemplates().find((t) => t.id === templateId)!
  const es = t.render(fill, kind)
  const answerTiles = stripPunct(es)
  const distractors = buildDistractors(answerTiles, maxLesson, rand, known)
  // Плитки в нижнем регистре: заглавная первая буква выдавала бы,
  // с какого слова начинается фраза. Сравнение ответа в QuizBuild
  // идёт в toLowerCase, поэтому проверка не зависит от регистра.
  const tiles = shuffle(
    [...answerTiles, ...distractors].map(
      (w) => w.toLowerCase(),
    ),
    rand,
  )
  const wordIds = Object.values(fill)
    .filter((v): v is Word => !!v && typeof v === 'object' && 'id' in v)
    .map((w) => w.id)
  const altAnswers = pronounDroppedVariants(fill, answerTiles)
  const stages = staged ? buildStages(answerTiles, fill, maxLesson, rand, known) : undefined
  const tileWords = tilePosMap(answerTiles, distractors, fill)
  return {
    kind: 'build',
    questionRu: t.ru(fill, kind),
    tiles,
    answerTiles,
    ...(stages ? { stages } : {}),
    ...(tileWords ? { tileWords } : {}),
    altAnswers: altAnswers.length ? altAnswers : undefined,
    hint: t.ru(fill, kind),
    options: [],
    answerIndex: -1,
    wordIds,
    phraseKey: phraseKey(t.id, [0], kind),
    explanation: es,
    tip: phraseTip(templateId),
  }
}

/** Упражнение «аудио»: услышь и выбери перевод */
export function audioExercise(
  word: Word,
  all: Word[],
  rand: () => number = Math.random,
  maxLesson?: number,
  known?: Set<string>,
): Exercise {
  // Без дубликатов перевода — как в тест-выборе
  const answer = word.ru[0]!
  const seen = new Set([answer])
  const distractors: string[] = []
  const notes: Record<string, string> = {}
  for (const w of shuffle(distractorCandidates(word, all, maxLesson, known), rand)) {
    const opt = w.ru[0]!
    if (seen.has(opt)) continue
    seen.add(opt)
    distractors.push(opt)
    notes[opt] = `это «${w.es}»`
    if (distractors.length === 3) break
  }
  const options = shuffle([answer, ...distractors], rand)
  const answerIndex = options.findIndex((o) => o === answer)
  return {
    kind: 'audio',
    questionEs: word.es,
    speak: word.es,
    options,
    answerIndex,
    wordIds: [word.id],
    explanation: `${word.es} — ${word.ru.join(', ')}`,
    tip: WORD_TIPS[word.id] ?? autoWordTip(word),
    optionNotes: notes,
  }
}

/** Слова конкретного урока (для практики «закрепить урок») */
export function lessonPool(lesson: number): Word[] {
  return ALL_WORDS.filter((w) => w.lesson === lesson)
}

/** Упражнение «активный перевод» (RU → ES): вспомнить и ВВЕСТИ слово */
export function activeExercise(word: Word, rand: () => number = Math.random): Exercise {
  // Артикли: перевод-маркер («(ж.р.)») двусмысленен — берём понятный ruHint
  const questionRu = word.pos === 'determiner' ? (word.ruHint ?? word.ru[0]!) : word.ru[0]!
  const alts = (word.esAlt ?? []).map((s) => s.toLowerCase())
  return {
    kind: 'active',
    questionRu,
    options: [],
    answerIndex: -1,
    typeAnswer: word.es.toLowerCase(),
    ...(alts.length ? { altTypeAnswers: alts } : {}),
    wordIds: [word.id],
    explanation: `${word.es} — ${word.ru.join(', ')}`,
    tip: WORD_TIPS[word.id] ?? autoWordTip(word),
  }
}

/**
 * Пул практики: слова урока (если задан и не пуст) или общий пул.
 * В режиме урока слова, которых не хватает до «выучено» (1 верный
 * ответ) и совсем новые, дублируются в пуле — выпадают втрое чаще
 * уже известных. Так закрепление урока добивает «хвосты», и процент
 * урока быстро доходит до 100% (раньше все слова выпадали поровну
 * и отстающие висели на 50–80% даже после нескольких сессий).
 */
function pickPool(progress: Progress, lesson?: number): Word[] {
  if (lesson && lesson > 0) {
    const words = lessonPool(lesson)
    if (words.length) {
      const known = knownSet(progress)
      const unknown = words.filter((w) => !known.has(w.id))
      if (unknown.length === 0) return words // урок выучен — просто повторяем
      const inProgress = unknown.filter((w) => progress.words[w.id]?.correct)
      const fresh = unknown.filter((w) => !progress.words[w.id]?.correct)
      return [...inProgress, ...inProgress, ...fresh, ...fresh, ...shuffle(words)]
    }
  }
  return practicePool(progress)
}

/** Опции генератора упражнений */
export interface MakeExerciseOpts {
  /** Практика по уроку: пул — только слова этого урока */
  lesson?: number
  /** Поэтапная сборка («Слова по шагам»): плитки-кандидаты выдаются
   *  по одному шагу, с похожими отвлекающими */
  staged?: boolean
}

/** Скрытое/коллекционное заполнение шаблона для генератора упражнений */
type FillPick = { fill: Fill; templateId: string; variant: 'aff' | 'neg' | 'yesno' | 'qw' }

/**
 * Сгенерировать случайное упражнение заданного типа.
 * Для «choice» направление ES→RU / RU→ES чередуется случайно.
 * opts.lesson — практика по конкретному уроку (закрепление).
 */
export function makeExercise(
  kind: ExerciseKind,
  progress: Progress,
  rand: () => number = Math.random,
  opts: MakeExerciseOpts = {},
): Exercise | null {
  const pool = pickPool(progress, opts.lesson)
  if (pool.length === 0) return null
  const word = pool[Math.floor(rand() * pool.length)]
  // Фронтир пользователя: варианты ответов не заходят в будущие уроки,
  // вопросительные слова — только изученные (knownSet, с «Уже выучил»)
  const known = knownSet(progress)
  const frontier = pool.reduce((m, w) => Math.max(m, w.lesson), 0)
  if (kind === 'choice') {
    const dir: WordChoiceDir = rand() < 0.5 ? 'es-ru' : 'ru-es'
    return wordChoiceExercise(word, ALL_WORDS, dir, rand, frontier, known)
  }
  if (kind === 'audio') {
    return audioExercise(word, ALL_WORDS, rand, frontier, known)
  }
  if (kind === 'active') {
    // Вводить можно не всё: формулы-конструкции («estar + герундий»)
    // исключаем; за несколько попыток ищем пригодное слово пула
    let word2 = word
    for (let i = 0; i < 6 && !typeableWord(word2); i++) {
      word2 = pool[Math.floor(rand() * pool.length)]!
    }
    if (!typeableWord(word2)) return null
    return activeExercise(word2, rand)
  }
  // build — только фразы. ОБЩАЯ ПРАКТИКА — закрепление: фразы собираются
  // ТОЛЬКО из материала, который пользователь уже встречал (слова с
  // ответами из уроков и практики) или изучил (knownSet, «Уже знал»).
  // Слова будущих уроков, которых пользователь ещё не видел, во фразы
  // не попадают — раньше движок «расширял уровень» вверх по урокам,
  // и в практику просачивались незнакомые слова. Если на встречавшемся
  // материале фразы ещё не собираются (первые два урока — местоимения
  // и артикли), makeExercise вернёт null: practice.vue откатится на
  // тест-выбор по словам, а плитки «Сборки» появятся после урока 3.
  //
  // Фразы, отмеченные «уже выучил», пропускаем: пробуем другие заполнения
  // шаблона, а отмеченную держим как запасную (если другого материала нет).
  // Приоритет: 👍 «нравится» (личная коллекция — показывать чаще) →
  // нейтральная → «уже выучил» (запас). 👎 «не нравится» — НЕ показываем
  // вовсе: заполнение с такой фразой пропускаем без запасной.
  // ПРАКТИКА ПО УРОКУ — во фразах только слова, которые пользователь
  // УЖЕ ИЗУЧИЛ (knownSet). Иначе в закрепление урока 1 попадают неизученные
  // слова из других уроков. Если изученных слов мало (первые уроки) —
  // сборки нет совсем: practice.vue откатывается на тест-выбор по словам.
  const starredPhrases = progress.starredPhrases ?? {}
  const likedPhrases = progress.likedPhrases ?? {}
  const hiddenPhrases = progress.hiddenPhrases ?? {}
  if (opts.lesson && opts.lesson > 0) {
    if (known.size === 0) return null
    const templates = allTemplates().filter((t) => countTemplate(t, known) > 0)
    if (templates.length === 0) return null
    const knownMaxLesson = ALL_WORDS.filter((w) => known.has(w.id)).reduce(
      (m, w) => Math.max(m, w.lesson), 0,
    )
    let neutral: FillPick | null = null
    let starred: FillPick | null = null
    let liked: FillPick | null = null
    for (let i = 0; i < 10; i++) {
      const t = templates[Math.floor(rand() * templates.length)]
      const fill = sampleFill(t, known, rand)
      if (!fill) continue
      const kind2 = t.variants[Math.floor(rand() * t.variants.length)]
      const key = normalizePhraseKey(t.render(fill, kind2))
      // 👎 — фраза скрыта: даже в запас не берём
      if (hiddenPhrases[key]) continue
      if (likedPhrases[key]) {
        if (!liked) liked = { fill, templateId: t.id, variant: kind2 }
        continue
      }
      if (starredPhrases[key]) {
        if (!starred) starred = { fill, templateId: t.id, variant: kind2 }
        continue
      }
      if (!neutral) neutral = { fill, templateId: t.id, variant: kind2 }
    }
    const picked = liked ?? neutral ?? starred
    return picked
      ? buildExercise(picked.fill, picked.templateId, picked.variant, rand, Math.max(knownMaxLesson, opts.lesson), known, opts.staged === true)
      : null
  }
  let fallback: FillPick | null = null
  let likedFallback: FillPick | null = null
  // Встречавшийся материал: слово с хотя бы одной попыткой (урок или
  // практика) + изученное. Неизученные вопросительные слова в seen не
  // попадают сами — их просто не было в ответах пользователя
  const seen = new Set([
    ...ALL_WORDS.filter((w) => {
      const wp = progress.words[w.id]
      return !!wp && (wp.correct > 0 || wp.wrong > 0)
    }).map((w) => w.id),
    ...known,
  ])
  // Шаблоны, в которых собирается хотя бы одна фраза из встречавшихся слов
  const templates = allTemplates().filter((t) => countTemplate(t, seen) > 0)
  for (let i = 0; i < 10; i++) {
    if (templates.length === 0) break
    const t = templates[Math.floor(rand() * templates.length)]
    const fill = sampleFill(t, seen, rand)
    if (!fill) continue
    const kind2 = t.variants[Math.floor(rand() * t.variants.length)]
    const key = normalizePhraseKey(t.render(fill, kind2))
    // 👎 — скрытая фраза не показывается вовсе
    if (hiddenPhrases[key]) continue
    // 👍 — коллекция: показываем сразу, это приоритет
    if (likedPhrases[key]) {
      if (!likedFallback) likedFallback = { fill, templateId: t.id, variant: kind2 }
      continue
    }
    if (!fallback && starredPhrases[key]) {
      fallback = { fill, templateId: t.id, variant: kind2 }
      continue
    }
    // нейтральная фраза — обычный путь (лучше запасной «уже выучил»)
    return buildExercise(fill, t.id, kind2, rand, frontier, seen, opts.staged === true)
  }
  const picked = likedFallback ?? fallback
  return picked
    ? buildExercise(picked.fill, picked.templateId, picked.variant, rand, frontier, seen, opts.staged === true)
    : null
}

/** Записать ответ в прогресс: возвращает слова, которые стали выученными */
export function recordAnswer(
  progress: Progress,
  ex: Exercise,
  correct: boolean,
  now: number = Date.now(),
): Word[] {
  const newlyKnown: Word[] = []
  for (const id of ex.wordIds) {
    const wp = progress.words[id] ?? { correct: 0, wrong: 0 }
    if (correct) wp.correct++
    else wp.wrong++
    // Верный ответ фиксирует «известность»; неверный не сбрасывает её
    if (correct && wp.correct >= KNOWN_THRESHOLD && !wp.knownAt) {
      wp.knownAt = now
      try {
        newlyKnown.push(getWord(id))
      } catch {
        // слово могло быть удалено — пропускаем
      }
    }
    progress.words[id] = wp
  }
  if (correct) progress.answers.correct++
  else progress.answers.wrong++
  if (ex.phraseKey) {
    const pp = progress.phrases[ex.phraseKey] ?? { practiced: 0, correct: 0 }
    pp.practiced++
    if (correct) pp.correct++
    progress.phrases[ex.phraseKey] = pp
  }
  return newlyKnown
}
