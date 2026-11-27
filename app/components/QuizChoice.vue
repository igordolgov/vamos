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
import type { WordTip } from '#shared/data/word-tips'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  questionEs?: string
  questionRu?: string
  options: string[]
  answerIndex: number
  /** Объяснение ошибки: почему путают и как запомнить — при неверном ответе */
  tip?: WordTip
  /** Что означает каждый отвлекающий вариант: текст варианта → «это …» */
  optionNotes?: Record<string, string>
}>()

const emit = defineEmits<{ answered: [correct: boolean]; next: [] }>()

const t = useT()
const selected = ref<number | null>(null)
const revealed = ref(false)

function choose(index: number) {
  if (revealed.value) return
  selected.value = index
  revealed.value = true
  // Без автоматической озвучки после ответа: пользователь сам решает,
  // слушать ли слово ещё раз (кнопка 🔊). Автоозвучка здесь звучала
  // плохо — особенно в аудио-упражнении, где варианты русские
  const correct = index === props.answerIndex
  emit('answered', correct)
}

const isCorrect = computed(() => selected.value === props.answerIndex)

/** Пояснение выбранного неверного варианта: «где» — это «dónde» */
const pickedNote = computed(() => {
  if (selected.value === null || selected.value === props.answerIndex) return null
  const opt = props.options[selected.value]
  const note = props.optionNotes?.[opt]
  return note ? `«${opt}» — ${note}` : null
})

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
  .card-body(class="gap-2 sm:gap-4 p-3 sm:p-4")
    // Вопрос (на мобильном чуть меньше — карточка должна уместиться
    // на экране вместе с вариантами и фидбеком)
    .text-center
      p.text-2xl.font-bold.mb-1(class="sm:text-3xl sm:mb-2 text-base-content/60" v-if="questionRu") {{ questionRu }}
      .flex.items-center.justify-center.gap-2(v-if="questionEs")
        h2.text-2xl.font-bold.text-primary(class="sm:text-3xl") {{ questionEs }}
        SpeakButton(:text="questionEs")

    // Варианты — 2 колонки (и на мобильных, и на десктопе);
    // компактные на мобильном (py-1.5/text-base), на sm+ — крупнее
    .grid.grid-cols-2(class="gap-1.5 sm:gap-2")
      button.btn.justify-start.text-left.normal-case(
        class="py-1.5 sm:py-3 h-auto"
        v-for="(option, i) in options"
        :key="i"
        :class="btnClass(i)"
        :disabled="revealed && i !== answerIndex && i !== selected"
        @click="choose(i)"
      )
        span.text-base(class="sm:text-lg") {{ option }}
        // Значок всегда в DOM (невидимым плейсхолдером): ширина правой
        // части кнопки постоянна → перенос строк не меняется при ответе
        span.ml-auto(v-if="revealed && i === answerIndex") ✓
        span.ml-auto(v-else-if="revealed && i === selected") ✗
        span.ml-auto.invisible(v-else) ✓

    // Результат и «Дальше» — зарезервированная зона постоянной высоты:
    // существует до ответа (пустая), поэтому карточка не растёт и кнопка
    // не сдвигается при появлении результата. Подпись «Верный ответ:»
    // и сам ответ — на отдельных строках; min-h-20 (5rem) держит
    // подпись + две строки длинного ответа (максимум 43 символа)
    .min-h-20.flex.items-center.justify-center
      div.text-center.animate-feedback(v-if="revealed")
        template(v-if="isCorrect")
          p.text-2xl.font-bold.text-success ✓ {{ t('practice.correct') }}
        template(v-else)
          p.text-base.font-semibold.text-error(class="sm:text-lg") ✗ {{ t('practice.answerWas') }}
          p.text-xl.font-bold.text-base-content(class="sm:text-2xl") {{ options[answerIndex] }}
          // Почему выбранный вариант неверен: что он на самом деле означает
          p.text-sm(class="mt-0.5 text-error/70" v-if="pickedNote") {{ pickedNote }}

    // Объяснение ошибки: почему легко путать и лайфхак запоминания,
    // пример употребления. Появляется только при неверном ответе —
    // карточка вырастает один раз, всё объяснение читается до «Дальше»
    .w-full(v-if="revealed && !isCorrect && tip")
      .rounded-xl.text-left(class="p-2 bg-warning/10 border border-warning/30")
        p.text-sm(class="leading-snug")
          | 💡 <b>{{ t('practice.tipWhy') }}:</b> {{ tip.why }}
        p.text-sm(class="mt-0.5 leading-snug")
          | 🧠 <b>{{ t('practice.tipHack') }}:</b> {{ tip.hack }}
        p.text-sm(class="mt-0.5 leading-snug" v-if="tip.ex")
          | 💬 <b>{{ t('practice.tipEx') }}:</b> «{{ tip.ex.es }}» — {{ tip.ex.ru }}

    button.btn.btn-primary.text-lg(
      :class="revealed ? 'visible' : 'invisible'"
      :tabindex="revealed ? 0 : -1"
      @click="emit('next')"
    ) {{ t('practice.next') }}
</template>
