<script setup lang="ts">
// ============================================================
// QuizChoice.vue — упражнение «выбор из 4 вариантов».
// Показывает вопрос (ES или RU текст) и озвучку, если есть.
// После ответа под вариантами появляются результат и «Дальше» —
// кнопка в карточке, а не внизу экрана.
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
        span.ml-auto(v-if="revealed && i === answerIndex") ✓
        span.ml-auto(v-if="revealed && i === selected && i !== answerIndex") ✗

    // Результат и «Дальше» — в самой карточке, под вариантами:
    // кнопка не уезжает за нижний край экрана на телефоне
    template(v-if="revealed")
      p.text-center.text-2xl.font-bold.animate-feedback(
        :class="isCorrect ? 'text-success' : 'text-error'"
      )
        template(v-if="isCorrect") ✓ {{ t('practice.correct') }}
        template(v-else) ✗ {{ t('practice.answerWas') }} {{ options[answerIndex] }}
      button.btn.btn-primary.text-lg(@click="emit('next')") {{ t('practice.next') }}
</template>
