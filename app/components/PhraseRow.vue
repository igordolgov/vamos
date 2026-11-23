<script setup lang="ts">
// ============================================================
// PhraseRow.vue — строка с фразой: испанский текст, перевод,
// вариант (утверждение/отрицание/вопрос) и озвучка.
// ============================================================
import { computed } from 'vue'
import { KIND_LABELS } from '#shared/phrases/schema'
import type { PhraseKind } from '#shared/phrases/schema'
import { useT, useLocale } from '~/composables/useI18n'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  es: string
  ru: string
  kind: PhraseKind
}>()

const t = useT()
const locale = useLocale()
const kindLabel = computed(() => KIND_LABELS[props.kind])
const kindBadge = computed(() => {
  if (props.kind === 'aff') return 'badge-success'
  if (props.kind === 'neg') return 'badge-error'
  if (props.kind === 'yesno') return 'badge-info'
  return 'badge-accent'
})
</script>

<template lang="pug">
.card.bg-base-100.shadow-sm.border.border-base-300(class="p-2.5")
  .flex.items-start.justify-between.gap-2
    .min-w-0
      .font-semibold.text-primary.flex.items-center.gap-2
        span.break-words {{ es }}
        SpeakButton(:text="es" :label="t('phrases.listen')")
      .text-sm(class="mt-0.5 text-base-content/70") {{ ru }}
    span.badge.badge-sm(:class="kindBadge") {{ kindLabel[locale === 'es' ? 'es' : 'ru'] }}
</template>
