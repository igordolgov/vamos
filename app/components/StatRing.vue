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
  class="px-1 py-3"
)
  .radial-progress.text-primary.font-semibold(
    :class="sizeClass"
    :style="{ '--value': percent, '--size': '5rem', '--thickness': '0.5rem' }"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  )
    span.text-sm {{ percent }}%
  .text-xs.text-center.font-medium(class="text-base-content/80")
    span {{ label }}
  .text-xs(class="text-base-content/50") {{ value }} / {{ total }}
</template>
