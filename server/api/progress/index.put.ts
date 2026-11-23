// ============================================================
// PUT /api/progress — сохранить прогресс (нужен Bearer-токен).
// Тело: объект Progress.
// ============================================================

import { defineEventHandler, createError, readBody, getRequestHeaders } from 'h3'
import { getDb } from '../../utils/db'
import { resolveToken, bearerOf, putProgress, AuthError } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const headers = getRequestHeaders(event)
  const token = bearerOf(headers.authorization)
  const profileId = token ? resolveToken(getDb(useRuntimeConfig(event).dbPath).db, token) : null
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })
  }
  const body = await readBody(event)
  try {
    const updatedAt = putProgress(getDb(useRuntimeConfig(event).dbPath).db, profileId, body)
    return { ok: true, updatedAt }
  } catch (e) {
    if (e instanceof AuthError) {
      throw createError({ statusCode: e.status, statusMessage: e.message })
    }
    throw createError({ statusCode: 500, statusMessage: 'Внутренняя ошибка' })
  }
})
