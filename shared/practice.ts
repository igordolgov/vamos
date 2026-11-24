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
  /** Подсказка-перевод (для build) */
  hint?: string
  /** Слова, к которым засчитывается ответ */
  wordIds: string[]
  /** Ключ фразы (если упражнение про фразу) */
  phraseKey?: string
  /** Краткое пояснение (показывается после ответа) */
  explanation?: string
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

/**
 * Пул слов для практики: сначала слова «в процессе» (correct > 0, но
 * ещё не выученные), затем новые слова по возрастанию урока, затем
 * уже известные — для повторения.
 */
export function practicePool(progress: Progress, maxLesson = 32): Word[] {
  const known = knownSet(progress)
  const inProgress = ALL_WORDS.filter(
    (w) => !known.has(w.id) && w.lesson <= maxLesson && progress.words[w.id]?.correct,
  )
  const fresh = ALL_WORDS.filter((w) => !known.has(w.id) && w.lesson <= maxLesson && !progress.words[w.id]?.correct)
    .sort((a, b) => a.lesson - b.lesson)
  const review = ALL_WORDS.filter((w) => known.has(w.id))
  // Приоритет: закрепление (40%), новые (40%), повторение (20%)
  const pool: Word[] = [
    ...inProgress.slice(0, 15),
    ...fresh.slice(0, 15),
    ...shuffle(review).slice(0, 10),
  ]
  return pool.length ? pool : fresh.slice(0, 10)
}

/** Направление теста-выбора для слова */
type WordChoiceDir = 'es-ru' | 'ru-es'

/** Упражнение «выбор варианта» по слову */
export function wordChoiceExercise(
  word: Word,
  all: Word[],
  dir: WordChoiceDir,
  rand: () => number = Math.random,
): Exercise {
  const esRu = dir === 'es-ru'
  // Отвлекающие — той же части речи, БЕЗ дубликатов перевода:
  // два одинаковых варианта делают вопрос неразрешимым
  const answer = esRu ? word.ru[0]! : word.es
  const seen = new Set([answer])
  const distractors: string[] = []
  for (const w of shuffle(all.filter((w) => w.pos === word.pos && w.id !== word.id), rand)) {
    const opt = esRu ? w.ru[0]! : w.es
    if (seen.has(opt)) continue
    seen.add(opt)
    distractors.push(opt)
    if (distractors.length === 3) break
  }
  const options = shuffle([answer, ...distractors], rand)
  const answerIndex = options.findIndex((o) => o === answer)
  return {
    kind: 'choice',
    questionEs: esRu ? word.es : undefined,
    questionRu: esRu ? undefined : word.ru[0]!,
    options,
    answerIndex,
    wordIds: [word.id],
    explanation: `${word.es} — ${word.ru.join(', ')}`,
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
  }
}

/**
 * Лишние слова-дистракторы для сборки фразы: слова, виденные
 * пользователем (урок <= maxLesson), которых нет в ответе — без
 * дубликатов и пунктуации. Если слов уровня не хватило (первые
 * уроки) — добираем из всего словаря.
 */
function buildDistractors(
  answerTiles: string[],
  maxLesson: number,
  rand: () => number,
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
  const pools = [
    ALL_WORDS.filter((w) => w.lesson <= maxLesson),
    ALL_WORDS,
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

/** Упражнение «сборка фразы из плиток» */
export function buildExercise(
  fill: Fill,
  templateId: string,
  kind: 'aff' | 'neg' | 'yesno' | 'qw',
  rand: () => number = Math.random,
  maxLesson: number = 32,
): Exercise {
  const t = allTemplates().find((t) => t.id === templateId)!
  const es = t.render(fill, kind)
  const answerTiles = stripPunct(es)
  // Плитки в нижнем регистре: заглавная первая буква выдавала бы,
  // с какого слова начинается фраза. Сравнение ответа в QuizBuild
  // идёт в toLowerCase, поэтому проверка не зависит от регистра.
  const tiles = shuffle(
    [...answerTiles, ...buildDistractors(answerTiles, maxLesson, rand)].map(
      (w) => w.toLowerCase(),
    ),
    rand,
  )
  const wordIds = Object.values(fill)
    .filter((v): v is Word => !!v && typeof v === 'object' && 'id' in v)
    .map((w) => w.id)
  return {
    kind: 'build',
    questionRu: t.ru(fill, kind),
    tiles,
    answerTiles,
    hint: t.ru(fill, kind),
    options: [],
    answerIndex: -1,
    wordIds,
    phraseKey: phraseKey(t.id, [0], kind),
    explanation: es,
  }
}

/** Упражнение «аудио»: услышь и выбери перевод */
export function audioExercise(
  word: Word,
  all: Word[],
  rand: () => number = Math.random,
): Exercise {
  // Без дубликатов перевода — как в тест-выборе
  const answer = word.ru[0]!
  const seen = new Set([answer])
  const distractors: string[] = []
  for (const w of shuffle(all.filter((w) => w.pos === word.pos && w.id !== word.id), rand)) {
    const opt = w.ru[0]!
    if (seen.has(opt)) continue
    seen.add(opt)
    distractors.push(opt)
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
  }
}

/** Слова конкретного урока (для практики «закрепить урок») */
export function lessonPool(lesson: number): Word[] {
  return ALL_WORDS.filter((w) => w.lesson === lesson)
}

/** Пул практики: слова урока (если задан и не пуст) или общий пул */
function pickPool(progress: Progress, lesson?: number): Word[] {
  if (lesson && lesson > 0) {
    const words = lessonPool(lesson)
    if (words.length) return words
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
  if (kind === 'choice') {
    const dir: WordChoiceDir = rand() < 0.5 ? 'es-ru' : 'ru-es'
    return wordChoiceExercise(word, ALL_WORDS, dir, rand)
  }
  if (kind === 'audio') {
    return audioExercise(word, ALL_WORDS, rand)
  }
  // build — только фразы. ОБЩАЯ ПРАКТИКА: разрешаем не только «выученные»
  // слова (knownSet, 2+ верных ответа), а весь материал до текущего уровня
  // (максимального урока пула): у новичка выученных слов нет, и «Сборка
  // фразы» мгновенно завершала сессию (выглядело как «не работает»).
  // Если на этом уровне фразы ещё не собираются (первые уроки — только
  // местоимения и артикли), расширяем материал вверх по урокам, пока не
  // появится хотя бы один собираемый шаблон.
  //
  // ПРАКТИКА ПО УРОКУ — другой принцип: во фразах только слова, которые
  // пользователь УЖЕ ИЗУЧИЛ (knownSet). Иначе в закрепление урока 1
  // попадают неизученные слова из других уроков. Если изученных слов
  // мало (первые уроки) — сборки нет совсем: practice.vue откатывается
  // на тест-выбор по словам этого урока.
  const known = knownSet(progress)
  if (opts.lesson && opts.lesson > 0) {
    if (known.size === 0) return null
    const templates = allTemplates().filter((t) => countTemplate(t, known) > 0)
    if (templates.length === 0) return null
    const knownMaxLesson = ALL_WORDS.filter((w) => known.has(w.id)).reduce(
      (m, w) => Math.max(m, w.lesson), 0,
    )
    for (let i = 0; i < 10; i++) {
      const t = templates[Math.floor(rand() * templates.length)]
      const fill = sampleFill(t, known, rand)
      if (!fill) continue
      const kind2 = t.variants[Math.floor(rand() * t.variants.length)]
      return buildExercise(fill, t.id, kind2, rand, Math.max(knownMaxLesson, opts.lesson))
    }
    return null
  }
  const base = pool.reduce((m, w) => Math.max(m, w.lesson), 0)
  for (let limit = base; limit <= LESSONS.length; limit++) {
    const allowed = new Set([
      ...ALL_WORDS.filter((w) => w.lesson <= limit).map((w) => w.id),
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
      return buildExercise(fill, t.id, kind2, rand, limit)
    }
  }
  return null
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
