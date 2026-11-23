// ============================================================
// app/composables/useTheme.ts — тема оформления (DaisyUI).
// Значение ставится инлайн-скриптом до гидратации; здесь —
// переключение и чтение текущей темы.
// По умолчанию всегда светлая: тёмная включается только
// вручную и сохраняется в localStorage + синхронизируется
// между устройствами через настройки профиля.
// ============================================================

import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const current = ref<Theme>('light')

/** Нормализуем имя темы DaisyUI */
function normalize(t: string | null | undefined): Theme {
  return t === 'vamos-dark' || t === 'dark' ? 'dark' : 'light'
}

/** Реактивная текущая тема */
export function useTheme() {
  return current
}

/** Синхронизировать текущую тему с DOM (вызвать при монтировании) */
export function readTheme(): Theme {
  if (typeof document !== 'undefined') {
    current.value = normalize(document.documentElement.dataset.theme)
  }
  return current.value
}

/** Установить тему: data-theme + localStorage */
export function setTheme(theme: Theme): void {
  current.value = theme
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme === 'dark' ? 'vamos-dark' : 'vamos-light'
  }
  try {
    // Канонические имена тем DaisyUI — их читает инлайн-скрипт до гидратации
    window.localStorage.setItem('vamos.theme', theme === 'dark' ? 'vamos-dark' : 'vamos-light')
  } catch {
    // игнорируем
  }
}
