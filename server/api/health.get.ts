// ============================================================
// GET /api/health — проверка живости сервера и базы.
// ============================================================

import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getDb } from '../utils/db'

export default defineEventHandler(() => {
  const db = getDb()
  const row = db.db.prepare('SELECT COUNT(*) as n FROM profiles').get() as { n: number }
  return { ok: true, db: 'ok', profiles: row.n, time: new Date().toISOString() }
})
