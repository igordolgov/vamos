<script setup lang="ts">
// ============================================================
// SessionResult.vue — итог тренировочной сессии.
// ============================================================
import { useT } from '~/composables/useI18n'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  correct: number
  wrong: number
  newWords: Array<{ es: string; ru: string[] }>
}>()

const emit = defineEmits<{ again: []; finish: [] }>()

const t = useT()
const total = props.correct + props.wrong
const percent = total > 0 ? Math.round((props.correct / total) * 100) : 0
</script>

<template lang="pug">
.card.bg-base-100.shadow-lg.border.border-base-300.w-full.max-w-md.mx-auto
  .card-body(class="p-4 sm:p-5 gap-3 sm:gap-4 items-center text-center")
    h2.text-2xl.font-bold.text-primary {{ t('practice.result') }}

    .radial-progress.text-primary.font-semibold(
      :style="{ '--value': percent, '--size': '6rem', '--thickness': '0.5rem' }"
      role="progressbar"
      :aria-valuenow="percent"
    )
      span.text-lg {{ percent }}%

    p(class="text-base-content/70")
      | {{ t('practice.resultCorrect') }}: {{ correct }} ·
      | {{ t('practice.resultWrong') }}: {{ wrong }}

    // Новые выученные слова
    .w-full(v-if="newWords.length")
      p.text-success.font-semibold {{ t('practice.newWords', { n: newWords.length }) }}
      .flex.flex-wrap.gap-1.justify-center(class="mt-1.5")
        span.badge.badge-success.badge-outline(
          v-for="w in newWords"
          :key="w.es"
        )
          | {{ w.es }} — {{ w.ru[0] }}

    .flex.gap-2(class="mt-1.5")
      button.btn.btn-primary(@click="emit('again')") {{ t('practice.again') }}
      button.btn.btn-ghost(@click="emit('finish')") {{ t('practice.toDashboard') }}
</template>
