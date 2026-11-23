// ============================================================
// app/composables/useI18n.ts — переключение языка интерфейса RU/ES.
//
// Локаль хранится в cookie (SSR-консистентность при гидратации)
// с фолбэком на модульное состояние для юнит-тестов.
// ============================================================

import { ref } from 'vue'
import { DICTS, interpolate, type Dict, type Locale } from '#shared/i18n'

// Фолбэк-состояние (только вне Nuxt — в тестах)
const fallbackLocale = ref<Locale>('ru')

/** Реактивная локаль интерфейса */
export function useLocale() {
  // В контексте Nuxt локаль живёт в cookie — SSR и клиент согласованы
  try {
    return useCookie<Locale>('vamos.locale', {
      default: () => 'ru' as Locale,
      maxAge: 60 * 60 * 24 * 365,
    })
  } catch {
    // Вне Nuxt (юнит-тесты) — модульное состояние
    return fallbackLocale
  }
}

/** Словарь текущей локали */
export function useDict(): Dict {
  const locale = useLocale()
  return DICTS[locale.value] ?? DICTS.ru
}

/**
 * Перевод строки интерфейса с подстановкой параметров:
 * t('dash.stats.wordsTotal', { n: 313 })
 * Словарь читается на каждый вызов — переключение языка мгновенно.
 */
export function useT() {
  return (key: keyof Dict | string, params?: Record<string, string | number>): string => {
    const locale = useLocale().value
    const dict = DICTS[locale] ?? DICTS.ru
    const template = (dict as Record<string, string>)[key as string] ?? (key as string)
    return params ? interpolate(template, params) : template
  }
}

/** Сменить язык интерфейса */
export function setLocale(locale: Locale): void {
  useLocale().value = locale
}
