<script setup lang="ts">
// ============================================================
// default.vue — основной макет: шапка, контент, мобильная
// навигация, липкий футер (min-h-screen flex flex-col + mt-auto).
// ============================================================
import { onMounted } from 'vue'
import AppHeader from '~/components/AppHeader.vue'
import AppToasts from '~/components/AppToasts.vue'
import { useT } from '~/composables/useI18n'
import { ensureLoaded, applyFontSize } from '~/composables/useProgress'
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
  // Загружаем прогресс, голоса синтеза и хук установки PWA.
  // ensureLoaded синхронно читает localStorage — размер шрифта применяем сразу
  void ensureLoaded()
  applyFontSize()
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

  // Контент страницы (на десктопе шире — меньше вертикальной прокрутки)
  main.flex-1.w-full(class="max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-2.5 sm:px-4 pt-3 pb-24 lg:pb-3")
    NuxtPage

  // Липкий футер (прижат к низу на коротких страницах)
  footer.mt-auto.border-t.border-base-300.bg-base-100.hidden(class="lg:block py-2")
    .max-w-6xl.mx-auto.px-4.flex.justify-between.text-xs(class="xl:max-w-7xl text-base-content/50")
      span {{ t('footer.tagline') }}
      span {{ t('footer.stats', { words: wordCount, templates: templateCount, mln: totalMln }) }}

  // Мобильная нижняя навигация (крупные иконки + safe-area для iPhone)
  nav.fixed.bottom-0.inset-x-0.border-t.border-base-300.z-40(class="lg:hidden bg-base-100/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]")
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
