<script setup lang="ts">
// ============================================================
// LocaleSwitch.vue — переключатель языка интерфейса RU/ES.
// ============================================================
import { useT, useLocale, setLocale } from '~/composables/useI18n'
import { setProgressSetting } from '~/composables/useProgress'
import type { Locale } from '#shared/i18n'

const t = useT()
const locale = useLocale()
function onChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value as Locale
  setLocale(value)
  setProgressSetting('locale', value)
}
</script>

<template lang="pug">
select.select.select-sm.select-bordered.w-16(
  :value="locale"
  :aria-label="t('set.interface')"
  @change="onChange"
)
  option(value="ru") RU
  option(value="es") ES
</template>
