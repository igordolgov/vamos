// ============================================================
// app/composables/useAuth.ts — профиль и bearer-токен.
//
// Токен и имя хранятся в localStorage; для реактивности интерфейса
// дублируются в модульные ref'ы. API-запросы добавляют заголовок
// Authorization. Прогресс синхронизируется в useProgress.
// ============================================================

import { computed, ref } from 'vue'
import type { AuthResponse } from '#shared/types'

const TOKEN_KEY = 'vamos.token'
const NAME_KEY = 'vamos.name'

// Модульное состояние — единое на всё приложение
const tokenState = ref<string | null>(null)
const nameState = ref<string | null>(null)
let initialized = false

function lsGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function lsSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // приватный режим — игнорируем
  }
}

function lsDel(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // игнорируем
  }
}

/** Синхронизировать модульное состояние с localStorage (один раз) */
function initFromStorage(): void {
  if (initialized || typeof window === 'undefined') return
  tokenState.value = lsGet(TOKEN_KEY)
  nameState.value = lsGet(NAME_KEY)
  initialized = true
}

/** Текущее состояние аутентификации (реактивное) */
export function useAuth() {
  initFromStorage()
  const token = computed(() => tokenState.value)
  const name = computed(() => nameState.value)
  const authed = computed(() => !!tokenState.value)
  return { token, name, authed }
}

/** Заголовок Authorization для $fetch */
export function authHeaders(): Record<string, string> {
  const token = lsGet(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Зарегистрировать профиль и сохранить токен */
export async function registerProfile(name: string, pin: string): Promise<AuthResponse> {
  const res = await $fetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { name, pin },
  })
  lsSet(TOKEN_KEY, res.token)
  lsSet(NAME_KEY, res.name)
  tokenState.value = res.token
  nameState.value = res.name
  return res
}

/** Войти и сохранить токен */
export async function loginProfile(name: string, pin: string): Promise<AuthResponse> {
  const res = await $fetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { name, pin },
  })
  lsSet(TOKEN_KEY, res.token)
  lsSet(NAME_KEY, res.name)
  tokenState.value = res.token
  nameState.value = res.name
  return res
}

/** Выйти: отзыв токена на сервере + очистка локально */
export async function logoutProfile(): Promise<void> {
  try {
    await $fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() })
  } catch {
    // сервер мог быть недоступен — всё равно чистим локально
  }
  lsDel(TOKEN_KEY)
  lsDel(NAME_KEY)
  tokenState.value = null
  nameState.value = null
}
