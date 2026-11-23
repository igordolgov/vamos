<script setup lang="ts">
// ============================================================
// StatRing.vue — кольцо прогресса (DaisyUI radial-progress).
// ============================================================
import { computed } from 'vue'

const props = defineProps<{
  value: number
  total: number
  label: string
  size?: string
}>()

/** Доля 0..100 и число для daisyui radial-progress (--value) */
const percent = computed(() => (props.total > 0 ? Math.round((props.value / props.total) * 100) : 0))
const sizeClass = computed(() => props.size ?? 'size-24')
</script>

<template lang="pug">
// Карточка: обводка + тень (используется в «Прогресс по частям речи»)
.flex.flex-col.items-center.gap-1.w-full.rounded-xl.border.border-base-300.bg-base-100.shadow-sm(
  class="px-1 py-2 lg:py-2.5"
)
  .radial-progress.text-primary.font-semibold(
    :class="sizeClass"
    :style="{ '--value': percent, '--thickness': '0.45rem' }"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  )
    span.text-sm {{ percent }}%
  .text-xs.text-center.font-medium.break-words.leading-tight(class="text-base-content/80 lg:text-[11px]")
    span {{ label }}
  .text-xs(class="text-base-content/50 lg:text-[11px]") {{ value }} / {{ total }}
</template>

<style scoped>
/* Размер кольца как CSS-переменная, чтобы сжимать его на десктопе
   (11 колец в один ряд не влезают с 5rem) */
.radial-progress {
  --size: 5rem;
}
@media (min-width: 1024px) {
  .radial-progress {
    --size: 4rem;
    --thickness: 0.4rem;
  }
}
</style>
