<script setup lang="ts">
// ============================================================
// QuizActive.vue — «Активный перевод» (RU → ES): вспомнить
// испанское слово по русскому и ВВЕСТИ его с клавиатуры.
// Не выбор из вариантов — активное воспроизведение: именно оно
// переводит слово в активный словарь.
//
// Проверка — без придирок: регистр, ¿?¡!. и УДАРЕНИЯ не важны
// («telefono» = «teléfono», клавиатура без испанской раскладки
// не превращается в ошибки). Верный акцентированный вариант
// показывается в фидбеке и озвучивается кнопкой.
// ============================================================
import { computed, nextTick, onMounted, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import { normalizeTyped } from '#shared/practice'
import { splitRuPrompt } from '#shared/phrases/ru'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  /** Русский промпт («телефон», «определённый артикль м.р.») */
  questionRu: string
  /** Каноничный ответ для ввода (нижний регистр) */
  typeAnswer: string
  /** Допустимые альтернативы написания (esAlt) */
  altTypeAnswers?: string[]
  /** Краткое пояснение (после ответа) */
  explanation?: string
}>()

const emit = defineEmits<{ answered: [correct: boolean]; next: [] }>()

const t = useT()
const input = ref('')
const revealed = ref(false)
const field = ref<HTMLInputElement | null>(null)

/** Подсказки в скобках внутри промпта — серым (как в «Сборке фразы») */
const promptParts = computed(() => splitRuPrompt(props.questionRu ?? ''))

/** Верным считается совпадение с каноничным ответом или esAlt
 *  после нормализации (регистр/ударения/пунктуация не важны) */
const isCorrect = computed(() => {
  const typed = normalizeTyped(input.value)
  if (!typed) return false
  const variants = [props.typeAnswer, ...(props.altTypeAnswers ?? [])]
  return variants.some((v) => normalizeTyped(v) === typed)
})

function check() {
  if (revealed.value || !input.value.trim()) return
  revealed.value = true
  emit('answered', isCorrect.value)
}

function onNext() {
  emit('next')
}

onMounted(() => {
  // Автофокус: режим ввода — клавиатура нужна сразу
  void nextTick(() => field.value?.focus())
})
</script>

<template lang="pug">
.card.bg-base-100.shadow-lg.border.border-base-300.w-full
  .card-body(class="gap-2 sm:gap-3 p-3 sm:p-4")
    // Задание: вспомни и введи слово
    .text-center
      p(class="text-sm text-base-content/60") {{ t('practice.questionRuEs') }}
      h2.text-xl.font-bold.text-base-content(class="sm:text-2xl")
        span(
          v-for="(p, i) in promptParts"
          :key="i"
          :class="p.hint ? 'font-normal text-base-content/50' : ''"
        ) {{ p.text }}

    // Поле ввода: до проверки — ввод, после — результат
    div
      input.input.input-lg.w-full.text-center.text-xl(
        v-if="!revealed"
        ref="field"
        v-model="input"
        type="text"
        :placeholder="t('practice.typeHere')"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        @keyup.enter="check()"
      )
      .text-center(v-else)
        p.text-2xl.font-bold(class="animate-feedback" :class="isCorrect ? 'text-success' : 'text-error'")
          | {{ isCorrect ? '✓' : '✗' }} {{ input.trim() }}
        p(class="text-sm text-base-content/60 mt-1" v-if="!isCorrect") {{ t('practice.answerWas') }}
        .flex.items-center.justify-center.gap-2.mt-1
          span.text-2xl.font-bold.text-primary {{ typeAnswer }}
          SpeakButton(:text="typeAnswer")

    // Кнопка: «Проверить» → «Дальше» на том же месте
    button.btn.text-lg(
      :class="revealed ? 'btn-primary' : 'bg-green-800 text-white'"
      :disabled="!revealed && !input.trim()"
      @click="revealed ? onNext() : check()"
    ) {{ revealed ? t('practice.next') : t('practice.check') }}
</template>
