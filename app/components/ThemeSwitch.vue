<script setup lang="ts">
// ============================================================
// ThemeSwitch.vue — переключатель светлой/тёмной темы.
// Иконка показывает ЦЕЛЬ переключения, как в системах iOS/Android:
// в светлой теме — луна («уйти в тёмную»), в тёмной — солнце.
// ============================================================
import { onMounted } from 'vue'
import { useT } from '~/composables/useI18n'
import { useTheme, setTheme, readTheme, type Theme } from '~/composables/useTheme'
import { setProgressSetting } from '~/composables/useProgress'

const t = useT()
const theme = useTheme()
onMounted(() => {
  // Читаем тему, установленную инлайн-скриптом до гидратации
  readTheme()
})

function onToggle() {
  const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
  setTheme(next)
  // Тема синхронизируется между устройствами
  setProgressSetting('theme', next)
}
</script>

<template lang="pug">
button.btn.btn-ghost.btn-circle.btn-sm(
  :aria-label="t('set.theme')"
  :title="theme === 'dark' ? t('set.theme.light') : t('set.theme.dark')"
  @click="onToggle"
)
  span.text-base {{ theme === 'dark' ? '☀️' : '🌙' }}
</template>
