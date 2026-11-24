<script setup lang="ts">
// ============================================================
// LessonCard.vue — карточка урока с прогрессом.
// ============================================================
import { computed } from 'vue'
import { useT, useLocale } from '~/composables/useI18n'

const props = defineProps<{
  number: number
  titleRu: string
  titleEs: string
  hintRu: string
  known: number
  total: number
}>()

const t = useT()
const locale = useLocale()
// computed — процент живёт вместе с props (иначе при обновлении
// прогресса карточка показывает устаревшее число)
const percent = computed(() => Math.round((props.known / Math.max(props.total, 1)) * 100))
const label = computed(() => t('lessons.knownOf', { known: props.known, total: props.total }))
</script>

<template lang="pug">
NuxtLink(:to="'/lessons/' + number")
  .card.bg-base-100.shadow-sm.border.border-base-300.h-full(class="hover:shadow-md hover:border-primary transition-all")
    .card-body.p-3(class="gap-1.5")
      .flex.items-center.justify-between
        span.badge.badge-primary.badge-outline № {{ number }}
        .radial-progress.text-primary(:style="'--value:' + percent + ';--size:2.6rem;--thickness:4px'" role="progressbar" :aria-valuenow="percent" v-if="percent > 0")
          span(class="text-[10px]") {{ percent }}%
        span.text-xs.font-semibold(v-else class="text-base-content/40") 0%
      h3.font-semibold.text-base-content {{ locale === 'es' ? titleEs : titleRu }}
      p.text-xs(class="text-base-content/60") {{ hintRu }}
      progress.progress.progress-primary.h-1(:value="known" :max="total" :aria-label="label")
      p.text-xs(class="text-base-content/50") {{ label }}
</template>
