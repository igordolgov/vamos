<script setup lang="ts">
// ============================================================
// QuizBuild.vue — собрать испанскую фразу из плиток-слов.
// ============================================================
import { computed, ref } from 'vue'
import { useT } from '~/composables/useI18n'

const props = defineProps<{
  tiles: string[]
  answerTiles: string[]
  hint: string
}>()

const emit = defineEmits<{ answered: [correct: boolean] }>()

const t = useT()
/** Выбранные плитки: индексы в исходном массиве tiles */
const selected = ref<number[]>([])
const revealed = ref(false)

/** Плитки, которые ещё не выбраны */
const remaining = computed(() =>
  props.tiles.map((tile, i) => ({ tile, i })).filter(({ i }) => !selected.value.includes(i)),
)

function pick(index: number) {
  if (revealed.value) return
  selected.value = [...selected.value, index]
}

function undo(index: number) {
  if (revealed.value) return
  selected.value = selected.value.filter((i) => i !== index)
}

/** Собранная фраза */
const built = computed(() => selected.value.map((i) => props.tiles[i]).join(' '))

/** Верно, если собран полный ответ без учёта регистра.
 *  ВАЖНО: toLowerCase() со скобками — сравнение функции со строкой
 *  всегда false (баг «съеденных скобок» ломал проверку сборки). */
const isCorrect = computed(() =>
  selected.value.length === props.answerTiles.length &&
  built.value.toLowerCase() === props.answerTiles.join(' ').toLowerCase(),
)

function check() {
  if (revealed.value || selected.value.length === 0) return
  revealed.value = true
  emit('answered', isCorrect.value)
}
</script>

<template lang="pug">
.card.bg-base-100.shadow-lg.border.border-base-300.w-full
  .card-body(class="p-3 sm:p-4 gap-3 sm:gap-4")
    // Подсказка-перевод
    .text-center
      p(class="text-sm text-base-content/60") {{ t('practice.buildHint') }}
      h2.text-2xl.font-bold.text-base-content {{ hint }}

    // Собранная фраза
    .min-h-14.border.border-dashed.border-base-300.rounded-lg.p-2.flex.flex-wrap.gap-1.items-center(
      class="bg-base-200/50"
      aria-label="Собранная фраза"
    )
      button.btn.btn-primary.btn-sm(v-for="i in selected" :key="i" @click="undo(i)")
        | {{ tiles[i] }}
      span(class="text-sm text-base-content/30" v-if="selected.length === 0") …

    // Плитки
    .flex.flex-wrap.gap-1.justify-center
      button.btn.btn-outline.btn-sm.normal-case(
        v-for="r in remaining"
        :key="r.i"
        :disabled="revealed"
        @click="pick(r.i)"
      )
        | {{ r.tile }}

    // Кнопка проверки
    button.btn.btn-primary(:disabled="selected.length === 0 || revealed" @click="check()") {{ t('practice.check') }}

    // Результат
    p.text-center.mt-1(v-if="revealed")
      span.font-bold(:class="isCorrect ? 'text-success' : 'text-error'")
        | {{ isCorrect ? '✓ ¡Correcto!' : '✗ ' + answerTiles.join(' ') }}
</template>
