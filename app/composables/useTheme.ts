// ============================================================
// app/composables/useTheme.ts — тема оформления (DaisyUI).
// Значение ставится инлайн-скриптом до гидратации; здесь —
// переключение и чтение текущей темы.
// ============================================================

import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const current = ref<Theme>('light')

/** Нормализуем имя темы DaisyUI */
function normalize(t: string | null | undefined): Theme {
  return t === 'vamos-dark' || t === 'dark' ? 'dark' : 'light'
}

/** Прочитать актуальную тему (DOM → localStorage → светлая) */
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

/** Переключить тему: data-theme + localStorage */
export function setTheme(theme: Theme): void {
  current.value = theme
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme === 'dark' ? 'vamos-dark' : 'vamos-light'
  }
  try {
    window.localStorage.setItem('vamos.theme', theme)
  } catch {
    // игнорируем
  }
}

/** Переключить тему на противоположную */
export function toggleTheme(): void {
  setTheme(current.value === 'dark' ? 'light' : 'dark')
}
