// ============================================================
// shared/srs.ts — интервальное повторение («Повторение», флешки).
//
// Классические ячейки Лейтнера: карточка выученного слова живёт
// на одном из шести уровней. Верный ответ поднимает карточку на
// уровень выше — интервал до следующего показа растёт
// (1 → 2 → 4 → 8 → 16 → 32 дня). Ошибка возвращает карточку на
// нулевой уровень — слово повторится снова сегодня.
//
// Карточки появляются только у ВЫУЧЕННЫХ слов (knownSet: два
// верных ответа или «Уже знал») — повторять то, что ещё не
// выучено, общая практика делает и так.
// ============================================================

import type { Progress, SrsCard, Word } from './types'
import { knownSet } from './stats'
import { findWord } from './data/words'

const DAY = 86_400_000

/** Максимальный уровень карточки (0..5) */
export const SRS_MAX_BOX = 5

/** Длина сессии карточек — как в практике, с запасом на повторения */
export const SRS_SESSION_LIMIT = 20

/**
 * Интервал (в днях) до следующего показа после верного ответа —
 * по НОВОМУ уровню карточки: 1 → 1 день, 2 → 2, 3 → 4, 4 → 8,
 * 5 → 16. Сам интервал 32 дня не отсюда: он у карточки, которая
 * уже стоит на максимальном уровне и снова угадана (srsNext).
 */
export function srsIntervalDays(box: number): number {
  const table = [0, 1, 2, 4, 8, 16]
  return table[box] ?? 32
}

/**
 * Следующее состояние карточки после самооценки.
 * «Знаю» — уровень выше (кап на SRS_MAX_BOX) и интервал по новому
 * уровню; «Не помню» — уровень 0, срок = сейчас (повтор в этой же
 * сессии, а после неё — первым делом).
 */
export function srsNext(card: SrsCard, ok: boolean, now: number): SrsCard {
  if (!ok) return { box: 0, due: now }
  if (card.box >= SRS_MAX_BOX) return { box: SRS_MAX_BOX, due: now + 32 * DAY }
  const box = card.box + 1
  return { box, due: now + srsIntervalDays(box) * DAY }
}

/**
 * Применить самооценку к карточке слова (чистая функция над
 * записью srs): возвращает НОВУЮ запись — вызывающий код кладёт её
 * в прогресс, сохраняет и синхронизирует.
 */
export function srsReviewWord(
  srs: Record<string, SrsCard>,
  wordId: string,
  ok: boolean,
  now: number,
): Record<string, SrsCard> {
  const card = srs[wordId] ?? { box: 0, due: now }
  return { ...srs, [wordId]: srsNext(card, ok, now) }
}

/**
 * Очередь сессии карточек: просроченные карточки (по сроку) +
 * новые (выученные слова, у которых карточки ещё нет, — по
 * порядку уроков). Слова вне knownSet и удалённые из словаря не
 * попадают. Список обрезается лимитом сессии.
 */
export function srsQueue(progress: Progress, now: number, limit = SRS_SESSION_LIMIT): Word[] {
  const known = knownSet(progress)
  const srs = progress.srs ?? {}
  const due: Word[] = []
  const fresh: Word[] = []
  for (const id of known) {
    const word = findWord(id)
    if (!word) continue // слово удалено из словаря — пропускаем
    const card = srs[id]
    if (!card) fresh.push(word)
    else if (card.due <= now) due.push(word)
  }
  due.sort((a, b) => (srs[a.id]!.due - srs[b.id]!.due) || a.id.localeCompare(b.id))
  fresh.sort((a, b) => a.lesson - b.lesson || a.id.localeCompare(b.id))
  return [...due, ...fresh].slice(0, limit)
}

/**
 * Сколько карточек к повторению прямо сейчас: просроченные + новые
 * (выученные слова без карточки). Для бейджа на дашборде.
 */
export function srsDueCount(progress: Progress, now: number): number {
  const known = knownSet(progress)
  const srs = progress.srs ?? {}
  let count = 0
  for (const id of known) {
    const card = srs[id]
    if (!card || card.due <= now) count++
  }
  return count
}
