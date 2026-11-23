<script setup lang="ts">
// ============================================================
// default.vue — основной макет: шапка, контент, мобильная
// навигация, липкий футер (min-h-screen flex flex-col + mt-auto).
// ============================================================
import { onMounted } from 'vue'
import AppHeader from '~/components/AppHeader.vue'
import AppToasts from '~/components/AppToasts.vue'
import { useT } from '~/composables/useI18n'
import { ensureLoaded } from '~/composables/useProgress'
import { warmUpVoices } from '~/composables/useSpeech'
import { initInstallPrompt } from '~/composables/useInstall'
import { WORD_COUNT } from '#shared/data/words'
import { allTemplates } from '#shared/phrases/templates'
import { totalPhrases } from '#shared/stats'

// Динамические цифры для футера (кеш внутри totalPhrases —
// на SSR считается один раз, а не на каждый запрос)
const wordCount = WORD_COUNT
const templateCount = allTemplates().length
const totalMln = (totalPhrases() / 1e6).toFixed(1).replace('.', ',')

onMounted(() => {
  // Загружаем прогресс, голоса синтеза и хук установки PWA
  void ensureLoaded()
  warmUpVoices()
  initInstallPrompt()
})

// Пункты мобильной нижней навигации (labels — ключи i18n)
const t = useT()
const mobileNav = [
  { to: '/', key: 'nav.dashboard', icon: '🏠' },
  { to: '/lessons', key: 'nav.lessons', icon: '📘' },
  { to: '/practice', key: 'nav.practice', icon: '🎯' },
  { to: '/words', key: 'nav.words', icon: '🔤' },
  { to: '/settings', key: 'nav.settings', icon: '⚙️' },
]
</script>

<template lang="pug">
.min-h-screen.flex.flex-col.bg-base-200
  AppHeader

  // Контент страницы
  main.flex-1.w-full.max-w-5xl.mx-auto.px-3(class="sm:px-6 py-4 pb-24 lg:pb-8")
    NuxtPage

  // Липкий футер (прижат к низу на коротких страницах)
  footer.mt-auto.border-t.border-base-300.bg-base-100.py-3.hidden(class="lg:block")
    .max-w-5xl.mx-auto.px-6.flex.justify-between.text-xs(class="text-base-content/50")
      span ¡Vamos! — латиноамериканский испанский · Nuxt 4 + PWA
      span {{ wordCount }} слов · {{ templateCount }} шаблонов · {{ totalMln }} млн фраз

  // Мобильная нижняя навигация (крупные иконки + safe-area для iPhone)
  nav.fixed.bottom-0.inset-x-0.bg-base-100.border-t.border-base-300.z-40(class="lg:hidden pb-[env(safe-area-inset-bottom)]")
    .grid.grid-cols-5
      NuxtLink.flex.flex-col.items-center.py-2.text-xs(
        v-for="item in mobileNav"
        :key="item.to"
        :to="item.to"
        class="router-link-active text-primary"
        exact-active-class="text-primary font-semibold"
        :class="'text-base-content/60'"
      )
        span.text-2xl {{ item.icon }}
        span {{ t(item.key) }}

  AppToasts
</template>
