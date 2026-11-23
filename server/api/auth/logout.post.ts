// ============================================================
// POST /api/auth/logout — выход: отзывает Bearer-токен.
// ============================================================

import { defineEventHandler, getHeader } from 'h3'
import { getDb } from '../../utils/db'
import { revokeToken, bearerOf } from '../../utils/auth'

export default defineEventHandler((event) => {
  const header = getHeader(event, 'authorization')
  const token = bearerOf(header)
  if (token) revokeToken(getDb(useRuntimeConfig(event).dbPath).db, token)
  return { ok: true }
})
