// ============================================================
// app/composables/useProgress.ts — состояние прогресса изучения.
//
// Хранение и синхронизация:
// 1. localStorage «vamos.progress» — мгновенное сохранение,
//    работа офлайн (PWA);
// 2. сервер (PUT /api/progress) — синхронизация между устройствами,
//    с дебаунсом и оффлайн-очередью (повтор при восстановлении сети);
// 3. слияние при загрузке: локальный и серверный прогресс
//    объединяются (максимум по ответам, объединение достижений).
// ============================================================

import { computed, ref } from 'vue'
import { emptyProgress, type Progress, type Word } from '#shared/types'
import { evaluateAchievements, type Achievement } from '#shared/achievements'
import { recordAnswer, starExercise, starWord, unstarWord } from '#shared/practice'
import type { Exercise } from '#shared/practice'
import { touchStreak } from '#shared/streak'
import { authHeaders } from './useAuth'

const LS_KEY = 'vamos.progress'

let loaded = false
const progressState = ref<Progress>(emptyProgress())
/** Показать уведомления о новых достижениях */
const pendingToasts = ref<Achievement[]>([])
/** Ошибка последней синхронизации */
const syncError = ref<string | null>(null)
/** Идёт синхронизация */
const syncing = ref(false)

function lsGet(): Progress | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Progress
    return { ...emptyProgress(), ...parsed }
  } catch {
    return null
  }
}

function lsSet(progress: Progress): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(progress))
  } catch {
    // приватный режим — игнорируем
  }
}

/** Слияние локального и серверного прогресса (идемпотентно) */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const merged: Progress = {
    version: 1,
    words: { ...local.words },
    phrases: { ...local.phrases },
    starredPhrases: { ...local.starredPhrases },
    answers: { ...local.answers },
    streakDates: [...new Set([...local.streakDates, ...remote.streakDates])].sort().slice(-400),
    achievements: { ...local.achievements },
    settings: { ...remote.settings, ...local.settings },
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  }
  // Слова: знания только растут — берём максимум верных и неверных ответов.
  // Это монотонное слияние: слово не может «разучиться» после синка,
  // даже если на другом устройстве было больше попыток с ошибками.
  for (const [id, wp] of Object.entries(remote.words)) {
    const l = merged.words[id]
    if (!l) {
      merged.words[id] = wp
    } else {
      merged.words[id] = {
        correct: Math.max(l.correct, wp.correct),
        wrong: Math.max(l.wrong, wp.wrong),
        knownAt:
          l.knownAt !== undefined && wp.knownAt !== undefined
            ? Math.min(l.knownAt, wp.knownAt)
            : (l.knownAt ?? wp.knownAt),
        // «Уже выучил» — как knownAt: остаётся после синхронизации
        star:
          l.star !== undefined && wp.star !== undefined
            ? Math.min(l.star, wp.star)
            : (l.star ?? wp.star),
      }
    }
  }
  // Фразы: максимум по числу практик
  for (const [key, pp] of Object.entries(remote.phrases)) {
    const l = merged.phrases[key]
    if (!l || l.practiced < pp.practiced) merged.phrases[key] = pp
  }
  // Отмеченные «уже выучил» фразы: объединяем, оставляя раннюю дату
  for (const [key, at] of Object.entries(remote.starredPhrases ?? {})) {
    if (!merged.starredPhrases) merged.starredPhrases = {}
    const l = merged.starredPhrases[key]
    if (l === undefined || at < l) merged.starredPhrases[key] = at
  }
  // Счётчики ответов: берём максимум (консервативно, без двойного счёта)
  merged.answers.correct = Math.max(local.answers.correct, remote.answers.correct)
  merged.answers.wrong = Math.max(local.answers.wrong, remote.answers.wrong)
  // Достижения: объединяем, оставляя раннюю дату
  for (const [id, at] of Object.entries(remote.achievements)) {
    const l = merged.achievements[id]
    if (!l || at < l) merged.achievements[id] = at
  }
  return merged
}

/** Загрузить прогресс (localStorage + сервер при наличии токена) */
export async function ensureLoaded(): Promise<void> {
  if (loaded && typeof window !== 'undefined') return
  const local = lsGet()
  if (local) progressState.value = local
  loaded = true

  // Пытаемся подтянуть серверный прогресс (если вошли)
  try {
    const res = await $fetch<{ ok: boolean; progress: Progress }>('/api/progress', {
      headers: authHeaders(),
    })
    const merged = mergeProgress(progressState.value, res.progress)
    progressState.value = merged
    lsSet(merged)
    syncError.value = null
  } catch {
    // Гость или сервер недоступен — работаем локально
  }
}

/** Планировщик отложенной синхронизации (800 мс дебаунс) */
let syncTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSync(): void {
  if (typeof window === 'undefined') return
  if (!window.localStorage.getItem('vamos.token')) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(flushSync, 800)
}

/** Отправить прогресс на сервер */
export async function flushSync(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!window.localStorage.getItem('vamos.token')) return
  syncing.value = true
  try {
    await $fetch('/api/progress', {
      method: 'PUT',
      headers: authHeaders(),
      body: progressState.value,
    })
    syncError.value = null
  } catch {
    syncError.value = 'offline'
    // Повтор при восстановлении сети
    if (!window.__vamosOnlineHooked) {
      window.__vamosOnlineHooked = true
      window.addEventListener('online', () => void flushSync())
    }
  } finally {
    syncing.value = false
  }
}

/** Записать ответ на упражнение + streak; возвращает слова, ставшие выученными */
export function applyAnswer(ex: Exercise, correct: boolean): Word[] {
  const now = Date.now()
  // recordAnswer мутирует прогресс — работаем на копии для реактивности
  const next: Progress = JSON.parse(JSON.stringify(progressState.value))
  const newly = recordAnswer(next, ex, correct, now)
  next.streakDates = touchStreak(next, new Date(now))
  next.updatedAt = now
  const achieved = evaluateAchievements(next, now)
  progressState.value = next
  lsSet(next)
  if (achieved.length) pendingToasts.value = [...pendingToasts.value, ...achieved]
  scheduleSync()
  return newly
}

/**
 * «Уже знал» из словаря: пометить или снять пометку у слова.
 * Как и пометка из практики, не меняет счётчики ответов —
 * только частоту выпадания и учёт в статистике.
 */
export function setWordStar(wordId: string, starred: boolean): void {
  const now = Date.now()
  const next: Progress = JSON.parse(JSON.stringify(progressState.value))
  if (starred) starWord(next, wordId, now)
  else unstarWord(next, wordId)
  next.updatedAt = now
  progressState.value = next
  lsSet(next)
  scheduleSync()
}

/**
 * «Уже выучил»: пометить слово/фразу упражнения — они будут
 * попадаться реже. Не меняет счётчики ответов и «выученность».
 */
export function markAlreadyKnown(ex: Exercise): void {
  const now = Date.now()
  const next: Progress = JSON.parse(JSON.stringify(progressState.value))
  starExercise(next, ex, now)
  next.streakDates = touchStreak(next, new Date(now))
  next.updatedAt = now
  progressState.value = next
  lsSet(next)
  scheduleSync()
}

/** Сохранить настройки в прогресс (и синхронизировать) */
export function setProgressSetting(
  key: 'locale' | 'theme' | 'fontSize',
  value: string,
): void {
  const next: Progress = {
    ...progressState.value,
    settings: { ...progressState.value.settings, [key]: value as never },
    updatedAt: Date.now(),
  }
  progressState.value = next
  lsSet(next)
  scheduleSync()
}

/** Размер шрифта → базовый rem-размер (масштабирует весь rem-based UI) */
const FONT_SIZE_STYLE: Record<'s' | 'm' | 'l', string> = {
  s: '87.5%', // ~14px при базовых 16
  m: '', // обычный — сбрасываем инлайн-стиль
  l: '112.5%', // ~18px
}

/**
 * Применить размер шрифта из настроек прогресса.
 * Вызывается при старте (layout onMounted — прогресс уже прочитан
 * из localStorage синхронной частью ensureLoaded) и при смене в настройках.
 */
export function applyFontSize(): void {
  if (typeof document === 'undefined') return
  const size = progressState.value.settings.fontSize ?? 'm'
  document.documentElement.style.fontSize = FONT_SIZE_STYLE[size]
}

/** Полный сброс прогресса */
export function resetProgress(): void {
  progressState.value = emptyProgress()
  lsSet(progressState.value)
  scheduleSync()
}

/** Съесть уведомления о достижениях (вызывается тостером) */
export function consumeToasts(): Achievement[] {
  const list = pendingToasts.value
  pendingToasts.value = []
  return list
}

// ============================================================
// Вычисляемые значения для интерфейса
// ============================================================

export function useProgress() {
  return {
    progress: computed(() => progressState.value),
    syncError,
    syncing,
    ensureLoaded,
    applyAnswer,
    setProgressSetting,
    resetProgress,
    flushSync,
    consumeToasts,
    setWordStar,
  }
}

// Расширение окна для оффлайн-хука (избегаем any в типах)
declare global {
  interface Window {
    __vamosOnlineHooked?: boolean
  }
}
