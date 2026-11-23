// ============================================================
// shared/i18n/index.ts — словари и типы для переключателя RU/ES.
// ============================================================

import { RU } from './ru'
import { ES } from './es'

export type Locale = 'ru' | 'es'
export type Dict = Record<keyof typeof RU, string>

/** Все словари интерфейса */
export const DICTS: Record<Locale, Dict> = { ru: RU, es: ES }

/** Поддерживаемые языки интерфейса */
export const LOCALES: Locale[] = ['ru', 'es']

/** Подстановка {n} и других параметров в строку */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''))
}
