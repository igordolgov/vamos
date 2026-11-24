<script setup lang="ts">
// ============================================================
// QuizChoice.vue — упражнение «выбор из 4 вариантов».
// Показывает вопрос (ES или RU текст) и озвучку, если есть.
// После ответа результат и «Дальше» появляются в заранее
// зарезервированной зоне постоянной высоты — карточка не
// меняет размер, кнопка не сдвигается.
// ============================================================
import { computed, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  questionEs?: string
  questionRu?: string
  options: string[]
  answerIndex: number
}>()

const emit = defineEmits<{ answered: [correct: boolean]; next: [] }>()

const t = useT()
const selected = ref<number | null>(null)
const revealed = ref(false)

function choose(index: number) {
  if (revealed.value) return
  selected.value = index
  revealed.value = true
  emit('answered', index === props.answerIndex)
}

const isCorrect = computed(() => selected.value === props.answerIndex)

/** Класс кнопки-варианта: обычный / верный / ошибочный */
function btnClass(index: number): string {
  if (!revealed.value) return 'btn-outline'
  if (index === props.answerIndex) return 'btn-success'
  if (index === selected.value) return 'btn-error'
  return 'btn-ghost'
}
</script>

<template lang="pug">
.card.bg-base-100.shadow-lg.border.border-base-300.w-full
  .card-body(class="gap-3 sm:gap-4 p-3 sm:p-4")
    // Вопрос
    .text-center
      p.text-3xl.font-bold.mb-2(class="text-base-content/60" v-if="questionRu") {{ questionRu }}
      .flex.items-center.justify-center.gap-2(v-if="questionEs")
        h2.text-3xl.font-bold.text-primary {{ questionEs }}
        SpeakButton(:text="questionEs")

    // Варианты — 2 колонки (и на мобильных, и на десктопе)
    .grid.grid-cols-2(class="gap-1.5 sm:gap-2")
      button.btn.justify-start.text-left.h-auto.py-3.normal-case(
        v-for="(option, i) in options"
        :key="i"
        :class="btnClass(i)"
        :disabled="revealed && i !== answerIndex && i !== selected"
        @click="choose(i)"
      )
        span.text-lg {{ option }}
        // Значок всегда в DOM (невидимым плейсхолдером): ширина правой
        // части кнопки постоянна → перенос строк не меняется при ответе
        span.ml-auto(v-if="revealed && i === answerIndex") ✓
        span.ml-auto(v-else-if="revealed && i === selected") ✗
        span.ml-auto.invisible(v-else) ✓

    // Результат и «Дальше» — зарезервированная зона постоянной высоты:
    // существует до ответа (пустая), поэтому карточка не растёт и кнопка
    // не сдвигается при появлении результата. Подпись «Верный ответ:»
    // и сам ответ — на отдельных строках; min-h-24 (6rem) держит
    // подпись + две строки длинного ответа (максимум 43 символа)
    .min-h-24.flex.items-center.justify-center
      div.text-center.animate-feedback(v-if="revealed")
        template(v-if="isCorrect")
          p.text-2xl.font-bold.text-success ✓ {{ t('practice.correct') }}
        template(v-else)
          p.text-base.font-semibold.text-error(class="sm:text-lg") ✗ {{ t('practice.answerWas') }}
          p.text-xl.font-bold.text-base-content(class="sm:text-2xl") {{ options[answerIndex] }}
    button.btn.btn-primary.text-lg(
      :class="revealed ? 'visible' : 'invisible'"
      :tabindex="revealed ? 0 : -1"
      @click="emit('next')"
    ) {{ t('practice.next') }}
</template>
