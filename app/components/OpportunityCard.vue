<script setup lang="ts">
// ============================================================
// OpportunityCard.vue — проекция «выучишь слово → +N фраз».
// Карточка — ссылка на урок, где слово изучается: клик ведёт
// прямо к материалу, который откроет эти фразы.
// ============================================================
import { POS_LABELS } from '#shared/data/words'
import type { Word } from '#shared/types'
import { useT, useLocale } from '~/composables/useI18n'
import { phrasesWord } from '#shared/i18n/plural'

const props = defineProps<{
  word: Word
  newPhrases: number
  totalAfter: number
}>()

const t = useT()
const locale = useLocale()
</script>

<template lang="pug">
NuxtLink.block(:to="'/lessons/' + word.lesson")
  .card.bg-base-100.shadow-sm.border.cursor-pointer(class="hover:border-secondary hover:shadow-md transition-colors border-secondary/30")
    .card-body.p-3.gap-1
      .flex.items-center.gap-2
        span.text-xl {{ POS_LABELS[word.pos].emoji }}
        span.font-bold.text-primary.text-lg {{ word.es }}
        span.text-sm(class="text-base-content/60") — {{ word.ru[0] }}
        // Куда ведёт клик: урок с этим словом
        span.badge.badge-secondary.badge-outline.badge-sm(class="ml-auto shrink-0")
          | {{ t('opps.lesson', { n: word.lesson }) }}
      p.text-sm
        | {{ t('opps.learn', { es: word.es }) }}
        span.text-success.font-bold
          |  — {{ t('opps.newPhrases', { n: newPhrases.toLocaleString('ru-RU'), w: phrasesWord(newPhrases, locale) }) }}
      p.text-xs(class="text-base-content/50")
        | {{ t('opps.willKnow', { n: totalAfter.toLocaleString('ru-RU') }) }}
</template>
