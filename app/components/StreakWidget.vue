<script setup lang="ts">
// ============================================================
// StreakWidget.vue — виджет серии дней занятий.
// Одна строка с правильным склонением для текущей локали:
//   RU: «1 день подряд» / «2 дня подряд» / «5 дней подряд»
//   ES: «1 día seguido» / «3 días seguidos»
// ============================================================
import { computed } from 'vue'
import { useLocale } from '~/composables/useI18n'

const props = defineProps<{ streak: number }>()
const locale = useLocale()

const label = computed(() => {
  const n = props.streak
  if (locale.value === 'es') {
    return n === 1 ? '1 día seguido' : `${n} días seguidos`
  }
  // Русское склонение: 1 день / 2–4 дня / 5+ дней (кроме 11–14)
  const n10 = n % 10
  const n100 = n % 100
  let word = 'дней'
  if (n10 === 1 && n100 !== 11) word = 'день'
  else if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) word = 'дня'
  return `${n} ${word} подряд`
})
</script>

<template lang="pug">
.flex.items-center.gap-2.rounded-xl.px-3.py-2.border(class="bg-accent/15 border-accent/40")
  span.text-2xl(aria-hidden="true") 🔥
  p.font-bold.text-lg.leading-none {{ label }}
</template>
