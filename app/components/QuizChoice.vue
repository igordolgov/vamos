<script setup lang="ts">
// ============================================================
// QuizChoice.vue — упражнение «выбор из 4 вариантов».
// Показывает вопрос (ES или RU текст) и озвучку, если есть.
// ============================================================
import { ref } from 'vue'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  questionEs?: string
  questionRu?: string
  options: string[]
  answerIndex: number
}>()

const emit = defineEmits<{ answered: [correct: boolean] }>()

const selected = ref<number | null>(null)
const revealed = ref(false)

function choose(index: number) {
  if (revealed.value) return
  selected.value = index
  revealed.value = true
  emit('answered', index === props.answerIndex)
}

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

    // Варианты — 2 колонки
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
</template>
