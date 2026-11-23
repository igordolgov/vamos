<script setup lang="ts">
// ============================================================
// OpportunityCard.vue — проекция «выучишь слово → +N фраз».
// ============================================================
import { POS_LABELS } from '#shared/data/words'
import type { Word } from '#shared/types'
import { useT, useLocale } from '~/composables/useI18n'

const props = defineProps<{
  word: Word
  newPhrases: number
  totalAfter: number
}>()

const t = useT()
const locale = useLocale()
</script>

<template lang="pug">
.card.bg-base-100.shadow-sm.border(class="hover:border-secondary transition-colors border-secondary/30")
  .card-body.p-4.gap-1
    .flex.items-center.gap-2
      span.text-xl {{ POS_LABELS[word.pos].emoji }}
      span.font-bold.text-primary.text-lg {{ word.es }}
      span.text-sm(class="text-base-content/60") — {{ word.ru[0] }}
    p.text-sm
      | {{ t('opps.learn') }} «{{ word.es }}»
      span.text-success.font-bold
        |  — {{ t('opps.newPhrases', { n: newPhrases.toLocaleString('ru-RU') }) }}
    p.text-xs(class="text-base-content/50")
      | {{ t('opps.willKnow') }}: {{ totalAfter.toLocaleString('ru-RU') }}
</template>
