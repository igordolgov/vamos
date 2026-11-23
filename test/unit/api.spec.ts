// ============================================================
// test/unit/i18n.spec.ts — паритет словарей RU/ES и подстановка.
// ============================================================

import { describe, it, expect } from 'vitest'
import { RU } from '../../shared/i18n/ru'
import { ES } from '../../shared/i18n/es'
import { DICTS, interpolate, LOCALES } from '../../shared/i18n'

describe('Словари интерфейса', () => {
  it('ключи ES полностью повторяют ключи RU', () => {
    const ruKeys = Object.keys(RU).sort()
    const esKeys = Object.keys(ES).sort()
    expect(esKeys).toEqual(ruKeys)
  })

  it('все значения непустые', () => {
    for (const [locale, dict] of Object.entries(DICTS)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.length, `${locale}:${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('поддерживаются ровно два языка', () => {
    expect(LOCALES).toEqual(['ru', 'es'])
  })

  it('подстановка параметров: {n}', () => {
    expect(interpolate('из {n} в словаре', { n: 313 })).toBe('из 313 в словаре')
    expect(interpolate('+{n} фраз', { n: 1200 })).toBe('+1200 фраз')
    expect(interpolate('без параметров', {})).toBe('без параметров')
  })

  it('ключи названий разделов на обоих языках', () => {
    for (const key of ['nav.dashboard', 'nav.lessons', 'nav.practice', 'app.name']) {
      expect(DICTS.ru[key as keyof typeof RU]).toBeTruthy()
      expect(DICTS.es[key as keyof typeof RU]).toBeTruthy()
    }
    expect(DICTS.es['app.name']).toBe('¡Vamos!')
  })
})

// ============================================================
// test/unit/api.spec.ts — сервер: БД, аутентификация, прогресс.
// ============================================================

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe as describeApi, it as itApi, expect as expectApi, beforeEach, afterEach } from 'vitest'
import { openDatabase, type Db } from '../../server/utils/db'
import {
  registerProfile,
  loginProfile,
  resolveToken,
  revokeToken,
  getProgress,
  putProgress,
  bearerOf,
  validateName,
  validatePin,
  AuthError,
} from '../../server/utils/auth'

let db: Db
let tmp: string

describeApi('Сервер: БД и аутентификация', () => {
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'vamos-test-'))
    db = openDatabase(join(tmp, 'test.db'))
  })

  afterEach(() => {
    db.db.close()
  })

  itApi('регистрация выдаёт токен и создаёт профиль', () => {
    const r = registerProfile(db.db, 'Мария', '1234')
    expectApi(r.name).toBe('Мария')
    expectApi(r.token.length).toBe(64)
    expectApi(resolveToken(db.db, r.token)).toBe(r.profileId)
  })

  itApi('дубликат имени — ошибка 409', () => {
    registerProfile(db.db, 'Мария', '1234')
    expectApi(() => registerProfile(db.db, 'Мария', '5678')).toThrow(AuthError)
    try {
      registerProfile(db.db, 'Мария', '5678')
    } catch (e) {
      expectApi((e as AuthError).status).toBe(409)
    }
  })

  itApi('вход по PIN и отказ при неверном', () => {
    const r = registerProfile(db.db, 'Иван', '4321')
    const l = loginProfile(db.db, 'Иван', '4321')
    expectApi(l.profileId).toBe(r.profileId)
    expectApi(() => loginProfile(db.db, 'Иван', '0000')).toThrow(AuthError)
  })

  itApi('PIN хешируется (не хранится открытым текстом)', () => {
    registerProfile(db.db, 'Иван', '4321')
    const row = db.db.prepare('SELECT salt, pin_hash FROM profiles WHERE name = ?').get('Иван') as { salt: string; pin_hash: string }
    expectApi(row.pin_hash).not.toContain('4321')
    expectApi(row.pin_hash).not.toContain('4321'.padStart(0, '0'))
    expectApi(row.pin_hash.length).toBe(64)
  })

  itApi('токен отзывается после выхода', () => {
    const r = registerProfile(db.db, 'Ольга', '1111')
    expectApi(resolveToken(db.db, r.token)).toBe(r.profileId)
    revokeToken(db.db, r.token)
    expectApi(resolveToken(db.db, r.token)).toBeNull()
  })

  itApi('bearerOf извлекает токен из заголовка', () => {
    expectApi(bearerOf('Bearer abc123def456')).toBe('abc123def456')
    expectApi(bearerOf('bearer xyz')).toBe('xyz')
    expectApi(bearerOf('Basic abc')).toBeNull()
    expectApi(bearerOf(undefined)).toBeNull()
  })

  itApi('валидация имени и PIN', () => {
    expectApi(validateName('Мария')).toBe(true)
    expectApi(validateName('A')).toBe(false)
    expectApi(validateName('x'.repeat(25))).toBe(false)
    expectApi(validatePin('1234')).toBe(true)
    expectApi(validatePin('123')).toBe(false)
    expectApi(validatePin('abcd')).toBe(false)
    expectApi(validatePin('12345678')).toBe(true)
    expectApi(validatePin('123456789')).toBe(false)
  })

  itApi('прогресс: пустой → запись → чтение (roundtrip)', () => {
    const r = registerProfile(db.db, 'Мария', '1234')
    const empty = getProgress(db.db, r.profileId)
    expectApi(empty.version).toBe(1)
    expectApi(Object.keys(empty.words).length).toBe(0)

    empty.words['v-ser'] = { correct: 2, wrong: 0, knownAt: 1000 }
    empty.answers.correct = 7
    empty.streakDates = ['2026-11-22', '2026-11-23']
    empty.achievements['first-word'] = 1
    putProgress(db.db, r.profileId, empty)

    const loaded = getProgress(db.db, r.profileId)
    expectApi(loaded.words['v-ser']?.correct).toBe(2)
    expectApi(loaded.answers.correct).toBe(7)
    expectApi(loaded.streakDates).toEqual(['2026-11-22', '2026-11-23'])
    expectApi(loaded.achievements['first-word']).toBe(1)
  })

  itApi('повторная запись перезаписывает (upsert)', () => {
    const r = registerProfile(db.db, 'Мария', '1234')
    const p1 = getProgress(db.db, r.profileId)
    p1.answers.correct = 1
    putProgress(db.db, r.profileId, p1)
    const p2 = getProgress(db.db, r.profileId)
    p2.answers.correct = 2
    putProgress(db.db, r.profileId, p2)
    expectApi(getProgress(db.db, r.profileId).answers.correct).toBe(2)
  })

  itApi('несколько профилей изолированы', () => {
    const a = registerProfile(db.db, 'Анна', '1111')
    const b = registerProfile(db.db, 'Борис', '2222')
    const pa = getProgress(db.db, a.profileId)
    pa.words['v-ser'] = { correct: 2, wrong: 0 }
    putProgress(db.db, a.profileId, pa)
    expectApi(getProgress(db.db, b.profileId).words['v-ser']).toBeUndefined()
    expectApi(getProgress(db.db, a.profileId).words['v-ser']).toBeDefined()
  })

  itApi('битый JSON в базе трактуется как пустой прогресс', () => {
    const r = registerProfile(db.db, 'Мария', '1234')
    db.db.prepare('INSERT INTO progress (profile_id, data, updated_at) VALUES (?, ?, ?)').run(r.profileId, '{битый json', 0)
    const p = getProgress(db.db, r.profileId)
    expectApi(p.version).toBe(1)
  })

  itApi('health-запрос к базе работает (profiles > 0 после регистрации)', () => {
    registerProfile(db.db, 'Мария', '1234')
    const row = db.db.prepare('SELECT COUNT(*) as n FROM profiles').get() as { n: number }
    expectApi(row.n).toBe(1)
  })
})

// Импорт для практики
import { ALL_WORDS } from '../../shared/data/words'
void ALL_WORDS
