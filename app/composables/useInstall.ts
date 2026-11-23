// ============================================================
// app/composables/useInstall.ts — кнопка «Установить приложение»
// (PWA beforeinstallprompt, без внешних зависимостей).
// ============================================================

import { ref } from 'vue'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const canInstall = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

/** Инициализировать перехват события установки (вызвать в layout) */
export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  })
  // Приложение уже установлено — кнопку не показываем
  window.addEventListener('appinstalled', () => {
    canInstall.value = false
    deferredPrompt = null
  })
}

/** Доступна ли установка */
export function useInstall() {
  return {
    canInstall,
    /** Показать системный диалог установки */
    install: async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
      if (!deferredPrompt) return 'unavailable'
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      deferredPrompt = null
      canInstall.value = false
      return choice.outcome
    },
  }
}
