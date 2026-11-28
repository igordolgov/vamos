// ============================================================
// app/composables/useInstall.ts — установка приложения (PWA).
// Два пути:
// 1. Chromium/Android: событие beforeinstallprompt — системный
//    диалог установки по нашей кнопке;
// 2. iOS Safari: системного диалога НЕТ — только ручная
//    инструкция «Поделиться» → «На экран “Домой”».
// Без внешних зависимостей.
// ============================================================

import { ref } from 'vue'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const canInstall = ref(false)
/** Приложение уже открыто как установленное (standalone) */
const isStandalone = ref(false)
/** iOS/iPadOS: системного диалога установки не существует */
const isIOS = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

/** Инициализировать перехват события установки (вызвать в layout) */
export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return
  // Уже установлено (standalone) — кнопки и инструкции не нужны
  const nav = window.navigator as Navigator & { standalone?: boolean }
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
  // iOS: beforeinstallprompt не поддерживается никогда — вместо кнопки
  // показываем инструкцию «Поделиться» → «На экран “Домой”».
  // iPadOS 13+ маскируется под Mac (сенсорный «Mac» — это iPad)
  isIOS.value =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isStandalone.value) return

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  })
  // Приложение уже установлено — кнопку не показываем
  window.addEventListener('appinstalled', () => {
    canInstall.value = false
    deferredPrompt = null
    isStandalone.value = true
  })
}

/** Доступна ли установка */
export function useInstall() {
  return {
    canInstall,
    isStandalone,
    isIOS,
    /** Показать системный диалог установки (Chromium/Android) */
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
