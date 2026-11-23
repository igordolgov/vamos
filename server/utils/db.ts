// ============================================================
// server/utils/db.ts — база данных SQLite (node:sqlite, без
// нативных зависимостей) и схема.
//
// Таблицы:
// — profiles: имя + хеш PIN-кода (scrypt);
// — tokens: bearer-токены сессий;
// — progress: JSON-прогресс изучения по каждому профилю.
// ============================================================

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface Db {
  db: DatabaseSync
  path: string
}

/** Открыть базу по пути и применить миграции (идемпотентно) */
export function openDatabase(path: string): Db {
  const abs = resolve(path)
  mkdirSync(dirname(abs), { recursive: true })
  const db = new DatabaseSync(abs)
  migrate(db)
  return { db, path: abs }
}

/** Схема базы */
function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      salt       TEXT NOT NULL,
      pin_hash   TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tokens (
      token      TEXT PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES profiles(id),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress (
      profile_id INTEGER PRIMARY KEY REFERENCES profiles(id),
      data       TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
}

// ============================================================
// Соединение на уровень приложения (лениво, с кешированием)
// ============================================================

let cached: Db | null = null

/**
 * Текущее соединение. Путь задаётся маршрутом (из runtimeConfig),
 * переменной окружения NUXT_DB_PATH, либо по умолчанию «db/custom.db».
 */
export function getDb(pathOverride?: string): Db {
  if (cached) return cached
  const path = pathOverride ?? process.env.NUXT_DB_PATH ?? 'db/custom.db'
  cached = openDatabase(path)
  return cached
}

/** Закрыть соединение (для тестов) */
export function closeDb(): void {
  cached = null
}
