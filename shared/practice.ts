// ============================================================
// shared/practice.ts — генератор упражнений.
//
// Три типа упражнений (по выбору пользователя):
// — «choice»  — тест с 4 вариантами ответа (ES→RU и RU→ES);
// — «build»   — собрать испанскую фразу из плиток-слов;
// — «audio»   — прослушать испанское слово/фразу и выбрать перевод.
//
// Пул слов: новые слова текущего уровня + повторение известных.
// Слово засчитывается «выученным» после 2 верных ответов.
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
      why: `«${word.es}» (${word.ru[0]}). Настоящее время: yo ${f['1s']}, tú ${f['2s']}, él/ella ${f['3s']}, nosotros ${f['1p']}, ustedes ${f['3p']}.`,
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

export type ExerciseKind = 'choice' | 'build' | 'audio'

/** Одно упражнение */
export interface Exercise {
  kind: ExerciseKind
  /** Вопрос на испанском (или текст для озвучки в audio) */
  questionEs?: string
  /** Текст для озвучки (упражнение audio) */
  speak?: string
  /** Вопрос на русском (для направления RU → ES) */
  questionRu?: string
  /** Варианты ответа */
  options: string[]
  /** Индекс верного варианта */
  answerIndex: number
  /** Плитки для сборки (перемешанные испанские слова) */
  tiles?: string[]
  /** Правильный порядок плиток */
  answerTiles?: string[]
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
 * предложению, отдельное слово — по его id. Пометка не влияет на
 * счётчики ответов и «выученность» — только на частоту выпадания.
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
 * прямо на странице «Слова». Слово идёт в knownSet (статистика,
 * процент уроков), в практике попадается реже — как и пометка
 * из практики. Счётчики ответов не меняются.
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

/**
 * Пул слов для практики: сначала слова «в процессе» (correct > 0, но
 * ещё не выученные), затем новые слова по возрастанию урока, затем
 * уже известные — для повторения. Слова, отмеченные «уже выучил»
 * (star), из основных групп убраны — их немного в конце пула:
 * попадаются, но заметно реже (полностью не исчезают).
 */
export function practicePool(progress: Progress, maxLesson = 32): Word[] {
  const known = knownSet(progress)
  const isStarred = (w: Word) => !!progress.words[w.id]?.star
  const inProgress = ALL_WORDS.filter(
    (w) => !known.has(w.id) && w.lesson <= maxLesson && progress.words[w.id]?.correct && !isStarred(w),
  )
  const fresh = ALL_WORDS.filter(
    (w) => !known.has(w.id) && w.lesson <= maxLesson && !progress.words[w.id]?.correct && !isStarred(w),
  ).sort((a, b) => a.lesson - b.lesson)
  const review = ALL_WORDS.filter((w) => known.has(w.id) && !isStarred(w))
  const starred = ALL_WORDS.filter((w) => isStarred(w))
  // Приоритет: закрепление (40%), новые (40%), повторение (20%)
  const pool: Word[] = [
    ...inProgress.slice(0, 15),
    ...fresh.slice(0, 15),
    ...shuffle(review).slice(0, 10),
  ]
  if (pool.length) return [...pool, ...shuffle(starred).slice(0, 2)]
  // Всё остальное отмечено «уже выучил» — другого материала нет
  return starred.length ? shuffle(starred).slice(0, 10) : fresh.slice(0, 10)
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
  // после неверного ответа объясняем: «где» — это «dónde»
  const answer = esRu ? word.ru[0]! : word.es
  const seen = new Set([answer])
  const distractors: string[] = []
  const notes: Record<string, string> = {}
  for (const w of shuffle(distractorCandidates(word, all, maxLesson, known), rand)) {
    const opt = esRu ? w.ru[0]! : w.es
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
 * Лишние слова-дистракторы для сборки фразы: слова, виденные
 * пользователем (урок <= maxLesson), которых нет в ответе — без
 * дубликатов и пунктуации. Неизученные вопросительные слова не
 * предлагаются вовсе (см. allowedBuildWords). Если слов уровня
 * не хватило (первые уроки) — добираем из всего словаря.
 */
function buildDistractors(
  answerTiles: string[],
  maxLesson: number,
  rand: () => number,
  known?: Set<string>,
): string[] {
  const n = answerTiles.length <= 3 ? 2 : 3
  const used = new Set(answerTiles.map((w) => w.toLowerCase()))
  const taken = new Set<string>()
  const out: string[] = []
  const tryPush = (es: string) => {
    if (/\s/.test(es)) return // только отдельные слова
    const key = es.toLowerCase()
    if (used.has(key) || taken.has(key) || /[¿?¡!.]/.test(key)) return
    taken.add(key)
    out.push(key)
  }
  const seen = new Set<string>()
  const isQw = (w: Word) => w.pos === 'question'
  const pools = [
    ALL_WORDS.filter((w) => w.lesson <= maxLesson && (!isQw(w) || (known?.has(w.id) ?? false))),
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

/** Упражнение «сборка фразы из плиток» */
export function buildExercise(
  fill: Fill,
  templateId: string,
  kind: 'aff' | 'neg' | 'yesno' | 'qw',
  rand: () => number = Math.random,
  maxLesson: number = 32,
  known?: Set<string>,
): Exercise {
  const t = allTemplates().find((t) => t.id === templateId)!
  const es = t.render(fill, kind)
  const answerTiles = stripPunct(es)
  // Плитки в нижнем регистре: заглавная первая буква выдавала бы,
  // с какого слова начинается фраза. Сравнение ответа в QuizBuild
  // идёт в toLowerCase, поэтому проверка не зависит от регистра.
  const tiles = shuffle(
    [...answerTiles, ...buildDistractors(answerTiles, maxLesson, rand, known)].map(
      (w) => w.toLowerCase(),
    ),
    rand,
  )
  const wordIds = Object.values(fill)
    .filter((v): v is Word => !!v && typeof v === 'object' && 'id' in v)
    .map((w) => w.id)
  const altAnswers = pronounDroppedVariants(fill, answerTiles)
  return {
    kind: 'build',
    questionRu: t.ru(fill, kind),
    tiles,
    answerTiles,
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
}

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
  // build — только фразы. ОБЩАЯ ПРАКТИКА: разрешаем не только «выученные»
  // слова (knownSet, 2+ верных ответа), а весь материал до текущего уровня
  // (максимального урока пула): у новичка выученных слов нет, и «Сборка
  // фразы» мгновенно завершала сессию (выглядело как «не работает»).
  // Если на этом уровне фразы ещё не собираются (первые уроки — только
  // местоимения и артикли), расширяем материал вверх по урокам, пока не
  // появится хотя бы один собираемый шаблон.
  //
  // Фразы, отмеченные «уже выучил», пропускаем: пробуем другие заполнения
  // шаблона, а отмеченную держим как запасную (если другого материала нет).
  //
  // ПРАКТИКА ПО УРОКУ — другой принцип: во фразах только слова, которые
  // пользователь УЖЕ ИЗУЧИЛ (knownSet). Иначе в закрепление урока 1
  // попадают неизученные слова из других уроков. Если изученных слов
  // мало (первые уроки) — сборки нет совсем: practice.vue откатывается
  // на тест-выбор по словам этого урока.
  const starredPhrases = progress.starredPhrases ?? {}
  if (opts.lesson && opts.lesson > 0) {
    if (known.size === 0) return null
    const templates = allTemplates().filter((t) => countTemplate(t, known) > 0)
    if (templates.length === 0) return null
    const knownMaxLesson = ALL_WORDS.filter((w) => known.has(w.id)).reduce(
      (m, w) => Math.max(m, w.lesson), 0,
    )
    let fallback: { fill: Fill; templateId: string; variant: 'aff' | 'neg' | 'yesno' | 'qw' } | null = null
    for (let i = 0; i < 10; i++) {
      const t = templates[Math.floor(rand() * templates.length)]
      const fill = sampleFill(t, known, rand)
      if (!fill) continue
      const kind2 = t.variants[Math.floor(rand() * t.variants.length)]
      if (!fallback && starredPhrases[normalizePhraseKey(t.render(fill, kind2))]) {
        fallback = { fill, templateId: t.id, variant: kind2 }
        continue
      }
      return buildExercise(fill, t.id, kind2, rand, Math.max(knownMaxLesson, opts.lesson), known)
    }
    return fallback
      ? buildExercise(fallback.fill, fallback.templateId, fallback.variant, rand, Math.max(knownMaxLesson, opts.lesson), known)
      : null
  }
  let fallback: { fill: Fill; templateId: string; variant: 'aff' | 'neg' | 'yesno' | 'qw'; limit: number } | null = null
  for (let limit = frontier; limit <= LESSONS.length; limit++) {
    // Неизученные вопросительные слова не открываются расширением
    // уровня: qw-шаблоны и их слова — только после изучения
    const allowed = new Set([
      ...ALL_WORDS.filter(
        (w) => w.lesson <= limit && (w.pos !== 'question' || known.has(w.id)),
      ).map((w) => w.id),
      ...known,
    ])
    // Шаблоны, в которых собирается хотя бы одна фраза из разрешённых слов
    const templates = allTemplates().filter((t) => countTemplate(t, allowed) > 0)
    if (templates.length === 0) continue
    for (let i = 0; i < 10; i++) {
      const t = templates[Math.floor(rand() * templates.length)]
      const fill = sampleFill(t, allowed, rand)
      if (!fill) continue
      const kind2 = t.variants[Math.floor(rand() * t.variants.length)]
      if (!fallback && starredPhrases[normalizePhraseKey(t.render(fill, kind2))]) {
        fallback = { fill, templateId: t.id, variant: kind2, limit }
        continue
      }
      return buildExercise(fill, t.id, kind2, rand, limit, known)
    }
  }
  return fallback
    ? buildExercise(fallback.fill, fallback.templateId, fallback.variant, rand, fallback.limit, known)
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
