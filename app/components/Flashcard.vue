<script setup lang="ts">
// ============================================================
// Flashcard.vue — карточка интервального повторения.
// Лицо — русский перевод: нужно вспомнить слово по-испански,
// перевернуть карточку (озвучка — в жесте клика, браузеры не
// блокируют) и честно оценить себя: «Знаю» / «Не помню».
// Оценка двигает карточку по уровням Лейтнера (shared/srs.ts),
// поэтому важна честность — подсказки на лице нет.
// ============================================================
import { computed, ref } from 'vue'
import type { Word } from '#shared/types'
import { useT } from '~/composables/useI18n'
import { speakEs } from '~/composables/useSpeech'
import { splitRuPrompt } from '#shared/phrases/ru'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  /** Слово карточки (выученное: из knownSet) */
  word: Word
}>()

const emit = defineEmits<{ rate: [ok: boolean] }>()

const t = useT()
const flipped = ref(false)

/** Подсказки в скобках русского промпта («Вы (вежл.)») — серым */
const frontParts = computed(() => splitRuPrompt(props.word.ru[0] ?? ''))

function flip() {
  if (flipped.value) return
  flipped.value = true
  // Озвучка внутри жеста клика — не блокируется политикой активации
  void speakEs(props.word.es)
}
</script>

<template lang="pug">
div
  // Лицо карточки: вспомнить испанское слово и перевернуть
  .card.bg-base-100.shadow-lg.border.border-base-300.w-full.cursor-pointer.select-none(
    v-if="!flipped"
    role="button"
    tabindex="0"
    class="min-h-44"
    :aria-label="t('review.flip')"
    @click="flip()"
    @keydown.enter="flip()"
  )
    .card-body.items-center.justify-center(class="p-4 gap-1")
      p(class="text-sm text-base-content/60") {{ t('review.front') }}
      h2.font-bold.text-base-content(class="text-3xl sm:text-4xl")
        span(
          v-for="(p, i) in frontParts"
          :key="i"
          :class="p.hint ? 'font-normal text-xl text-base-content/50 sm:text-2xl' : ''"
        ) {{ p.text }}
      p.mt-2(class="text-xs text-base-content/40") {{ t('review.flip') }}

  // Оборот: испанское слово, озвучка и полный перевод
  .card.bg-base-100.shadow-lg.border.w-full(
    v-else
    class="min-h-44 border-primary/40"
  )
    .card-body.items-center.justify-center(class="p-4 gap-1")
      .flex.items-center.gap-2
        h2.font-bold.text-primary(class="text-3xl sm:text-4xl") {{ word.es }}
        SpeakButton(:text="word.es")
      p.font-medium(class="text-base-content/80") {{ word.ru.join(', ') }}
      p(v-if="word.ruHint" class="text-sm text-base-content/55") {{ word.ruHint }}

  // Самооценка — только после переворота; крупная — главные кнопки экрана
  .grid.grid-cols-2.gap-2.mt-2(v-if="flipped")
    button.btn.btn-outline.btn-error.text-base(@click="emit('rate', false)")
      | ✗ {{ t('review.dontKnow') }}
    button.btn.btn-success.text-base(@click="emit('rate', true)")
      | ✓ {{ t('review.know') }}
</template>
