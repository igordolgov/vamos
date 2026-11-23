// ============================================================
// server/utils/auth.ts — аутентификация и работа с прогрессом.
//
// Простая и надёжная схема:
// — PIN хешируется scrypt со случайной солью (node:crypto);
// — сессия = случайный 64-символьный токен (Bearer);
// — прогресс хранится целиком JSON-документом на профиль.
//
// Функции не зависят от h3 — тестируются напрямую (vitest).
// ============================================================

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { emptyProgress, type Progress } from '#shared/types'

// ============================================================
// Хеширование PIN
// ============================================================

/** Хеш PIN: scrypt(соль, пин) в hex */
export function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, 32).toString('hex')
}

/** Сверка PIN с сохранённым хешем (без утечки по времени) */
export function verifyPin(pin: string, salt: string, hash: string): boolean {
  const a = Buffer.from(hashPin(pin, salt), 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Валидация имени профиля */
export function validateName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 24
}

/** Валидация PIN-кода: 4–8 цифр */
export function validatePin(pin: string): boolean {
  return typeof pin === 'string' && /^\d{4,8}$/.test(pin)
}

// ============================================================
// Ошибки уровня домена (транслируются в HTTP-статусы)
// ============================================================

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ============================================================
// Регистрация / вход / токены
// ============================================================

export interface AuthResult {
  profileId: number
  name: string
  token: string
}

/** Зарегистрировать профиль (ошибка 409, если имя занято) */
export function registerProfile(db: DatabaseSync, name: string, pin: string): AuthResult {
  const clean = name.trim()
  if (!validateName(clean)) throw new AuthError(400, 'Имя должно быть 2–24 символа')
  if (!validatePin(pin)) throw new AuthError(400, 'PIN должен быть 4–8 цифр')

  const exists = db.prepare('SELECT id FROM profiles WHERE name = ?').get(clean)
  if (exists) throw new AuthError(409, 'Такое имя уже занято')

  const salt = randomBytes(16).toString('hex')
  const hash = hashPin(pin, salt)
  const now = Date.now()
  const res = db
    .prepare('INSERT INTO profiles (name, salt, pin_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(clean, salt, hash, now)
  const profileId = Number(res.lastInsertRowid)
  const token = issueToken(db, profileId)
  return { profileId, name: clean, token }
}

/** Войти по имени и PIN (ошибка 401 при неверных данных) */
export function loginProfile(db: DatabaseSync, name: string, pin: string): AuthResult {
  const clean = name.trim()
  const row = db
    .prepare('SELECT id, name, salt, pin_hash FROM profiles WHERE name = ?')
    .get(clean) as { id: number; name: string; salt: string; pin_hash: string } | undefined
  if (!row) throw new AuthError(401, 'Неверное имя или PIN')
  if (!verifyPin(pin, row.salt, row.pin_hash)) throw new AuthError(401, 'Неверное имя или PIN')
  const token = issueToken(db, row.id)
  return { profileId: row.id, name: row.name, token }
}

/** Выдать токен сессии */
export function issueToken(db: DatabaseSync, profileId: number): string {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO tokens (token, profile_id, created_at) VALUES (?, ?, ?)').run(
    token,
    profileId,
    Date.now(),
  )
  return token
}

/** Отозвать токен (выход) */
export function revokeToken(db: DatabaseSync, token: string): void {
  db.prepare('DELETE FROM tokens WHERE token = ?').run(token)
}

/** Найти профиль по Bearer-токену (или null) */
export function resolveToken(db: DatabaseSync, token: string): number | null {
  if (!token || typeof token !== 'string' || token.length < 16) return null
  const row = db.prepare('SELECT profile_id FROM tokens WHERE token = ?').get(token) as
    | { profile_id: number }
    | undefined
  return row ? Number(row.profile_id) : null
}

/** Извлечь Bearer-токен из заголовка Authorization */
export function bearerOf(header: string | undefined): string | null {
  if (!header) return null
  const m = /^Bearer\s+(.+)$/i.exec(header)
  return m ? m[1]!.trim() : null
}

// ============================================================
// Прогресс
// ============================================================

/** Загрузить прогресс профиля (пустой для нового) */
export function getProgress(db: DatabaseSync, profileId: number): Progress {
  const row = db.prepare('SELECT data FROM progress WHERE profile_id = ?').get(profileId) as
    | { data: string }
    | undefined
  if (!row) return emptyProgress()
  try {
    const parsed = JSON.parse(row.data) as Progress
    // Мягкая валидация: подстраховка от битых данных
    if (!parsed || typeof parsed !== 'object') return emptyProgress()
    return { ...emptyProgress(), ...parsed }
  } catch {
    return emptyProgress()
  }
}

/** Сохранить прогресс (минимальная валидация формы) */
export function putProgress(db: DatabaseSync, profileId: number, progress: Progress): number {
  if (!progress || typeof progress !== 'object') throw new AuthError(400, 'Некорректный прогресс')
  if (progress.version !== 1) throw new AuthError(400, 'Неподдерживаемая версия данных')
  const safe: Progress = { ...emptyProgress(), ...progress, updatedAt: Date.now() }
  const data = JSON.stringify(safe)
  if (data.length > 2_000_000) throw new AuthError(413, 'Прогресс слишком велик')
  db.prepare(
    `INSERT INTO progress (profile_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(profile_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(profileId, data, safe.updatedAt)
  return safe.updatedAt
}
