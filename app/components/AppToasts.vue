<script setup lang="ts">
// ============================================================
// AppToasts.vue — всплывающие уведомления:
//   1) достижения — забираются из useProgress.consumeToasts();
//   2) системные — через window.__vamosToast(text, icon)
//      (например, предупреждение об отсутствии испанского голоса).
// ============================================================
import { ref, onMounted, onUnmounted } from 'vue'
import { consumeToasts } from '~/composables/useProgress'
import { useLocale } from '~/composables/useI18n'

export interface Toast {
  id: number
  text: string
  icon?: string
  at: number
}

const locale = useLocale()
const toasts = ref<Toast[]>([])
let nextId = 1
let timer: ReturnType<typeof setInterval> | null = null

/** Добавить уведомление (глобально: window.__vamosToast) */
function pushToast(text: string, icon = '🏅'): void {
  toasts.value = [...toasts.value, { id: nextId++, text, icon, at: Date.now() }]
}

/** Глобальный доступ: window.__vamosToast */
function hookWindow(): void {
  ;(window as unknown as { __vamosToast?: typeof pushToast }).__vamosToast = pushToast
}

const clearIntervalFn = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  // Регистрируем глобальный тостер (раньше был вызов без скобок —
  // window.__vamosToast не назначался и тосты не показывались)
  hookWindow()
  // Раз в секунду: чистим просроченные (живут 4 с) и забираем
  // уведомления о новых достижениях
  timer = setInterval(() => {
    const now = Date.now()
    toasts.value = toasts.value.filter((t) => now - t.at < 4000)
    for (const a of consumeToasts()) {
      pushToast(locale.value === 'es' ? a.titleEs : a.titleRu, a.icon)
    }
  }, 1000)
})

onUnmounted(clearIntervalFn)
</script>

<template lang="pug">
.toast.toast-top.toast-center.z-50(class="[&>div]:mb-1")
  .alert.bg-primary.text-primary-content.shadow-lg(
    v-for="toast in toasts"
    :key="toast.id"
  )
    span.text-lg.mr-1(v-if="toast.icon") {{ toast.icon }}
    span {{ toast.text }}
</template>
