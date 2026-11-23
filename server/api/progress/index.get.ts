// ============================================================
// GET /api/progress — загрузить прогресс (нужен Bearer-токен).
// ============================================================

import { defineEventHandler, createError, getHeader } from 'h3'
import { getDb } from '../../utils/db'
import { resolveToken, bearerOf, getProgress } from '../../utils/auth'

export default defineEventHandler((event) => {
  const token = bearerOf(getHeader(event, 'authorization'))
  const profileId = token ? resolveToken(getDb(useRuntimeConfig(event).dbPath).db, token) : null
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })
  }
  const progress = getProgress(getDb(useRuntimeConfig(event).dbPath).db, profileId)
  return { ok: true, progress }
})
