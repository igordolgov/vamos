<script setup lang="ts">
// ============================================================
// pages/settings.vue — язык интерфейса, тема, профиль,
// сброс прогресса и справка о приложении.
// ============================================================
import { onMounted, ref } from 'vue'
import { useT, setLocale, useLocale } from '~/composables/useI18n'
import { setTheme, useTheme, readTheme } from '~/composables/useTheme'
import { setProgressSetting, useProgress } from '~/composables/useProgress'
import { useInstall } from '~/composables/useInstall'
import type { Locale } from '#shared/i18n'
import type { Theme } from '~/composables/useTheme'
import AuthPanel from '~/components/AuthPanel.vue'

const t = useT()
const locale = useLocale()
const theme = useTheme()
const {resetProgress, ensureLoaded} = useProgress()
const {canInstall, install} = useInstall()
const confirmReset = ref(false)

onMounted(() => {
  void ensureLoaded()
  readTheme()
})

function onLocale(e: Event) {
  const value = (e.target as HTMLSelectElement).value as Locale
  setLocale(value)
  setProgressSetting('locale', value)
}

function onTheme(e: Event) {
  const value = (e.target as HTMLSelectElement).value as Theme
  setTheme(value)
  setProgressSetting('theme', value)
}

function onReset() {
  resetProgress()
  confirmReset.value = false
}
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary.mb-3 {{ t('set.title') }}

// Интерфейс и тема
.card.bg-base-100.shadow-sm.border.border-base-300.mb-3
  .card-body.p-4.gap-3
    .grid.grid-cols-1(class="sm:grid-cols-2 gap-3")
      label.form-control
        .label
          span.label-text {{ t('set.interface') }}
        select.select.select-bordered.select-sm(v-model="locale" @change="onLocale")
          option(value="ru") Русский (RU)
          option(value="es") Español (ES)
      label.form-control
        .label
          span.label-text {{ t('set.theme') }}
        select.select.select-bordered.select-sm(v-model="theme" @change="onTheme")
          option(value="light") {{ t('set.theme.light') }}
          option(value="dark") {{ t('set.theme.dark') }}

// Профиль и синхронизация
AuthPanel.mb-3

// Установка PWA
.card.bg-base-100.shadow-sm.border.border-base-300.mb-3(v-if="canInstall")
  .card-body.p-4.gap-2
    h2.card-title.text-lg {{ t('set.install') }}
    p(class="text-sm text-base-content/60") {{ t('set.installHint') }}
    button.btn.btn-primary.btn-sm.w-fit(@click="install()") 📲 {{ t('dash.install') }}

// Сброс прогресса
.card.bg-base-100.shadow-sm.border.mb-3(class="border-error/40")
  .card-body.p-4.gap-2
    h2.card-title.text-lg.text-error {{ t('set.reset') }}
    button.btn.btn-error.btn-sm.w-fit(v-if="!confirmReset" @click="confirmReset = true") {{ t('set.reset') }}
    template(v-else='')
      p(class="text-sm text-base-content/70") {{ t('set.resetConfirm') }}
      .flex.gap-2
        button.btn.btn-error.btn-sm(@click="onReset") {{ t('common.yes') }}
        button.btn.btn-ghost.btn-sm(@click="confirmReset = false") {{ t('common.cancel') }}

// О приложении
.card.bg-base-100.shadow-sm.border.border-base-300
  .card-body.p-4.gap-2
    h2.card-title.text-lg {{ t('set.about') }}
    p(class="text-sm text-base-content/70") {{ t('set.aboutText') }}
    p(class="text-xs text-base-content/40") Nuxt 4 · PWA · DaisyUI 5 · Pug · TypeScript · Vitest · node:sqlite
</template>
