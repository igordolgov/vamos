// ============================================================
// POST /api/auth/login — вход по имени и PIN.
// Тело: { name: string, pin: string } → { ok, token, profileId, name }
// ============================================================

import { defineEventHandler, createError, readBody } from 'h3'
import { getDb } from '../../utils/db'
import { loginProfile, AuthError } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; pin?: string }>(event)
  try {
    const result = loginProfile(getDb(useRuntimeConfig(event).dbPath).db, body?.name ?? '', body?.pin ?? '')
    return { ok: true, token: result.token, profileId: result.profileId, name: result.name }
  } catch (e) {
    if (e instanceof AuthError) {
      throw createError({ statusCode: e.status, statusMessage: e.message })
    }
    throw createError({ statusCode: 500, statusMessage: 'Внутренняя ошибка' })
  }
})
