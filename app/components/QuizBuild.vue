<script setup lang="ts">
// ============================================================
// QuizBuild.vue — собрать испанскую фразу из плиток-слов.
// После проверки фидбек занимает место пула плиток, а кнопка
// «Проверить» превращается в «Дальше» — ничего не прыгает и
// «Дальше» всегда под большим пальцем, без прокрутки.
// ============================================================
import { computed, ref } from 'vue'
import { useT } from '~/composables/useI18n'

const props = defineProps<{
  tiles: string[]
  answerTiles: string[]
  hint: string
}>()

const emit = defineEmits<{ answered: [correct: boolean]; next: [] }>()

const t = useT()
/** Выбранные плитки: индексы в исходном массиве tiles */
const selected = ref<number[]>([])
const revealed = ref(false)

/** Класс плитки: выбранная остаётся пустым местом своего размера,
 *  чтобы остальные слова не перепрыгивали и не мелькали при переносе */
function tileClass(i: number): string {
  const base = 'btn btn-outline btn-lg normal-case'
  return selected.value.includes(i) ? `${base} invisible pointer-events-none` : base
}

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
  .card-body(class="gap-3 sm:gap-4 p-3 sm:p-4")
    // Подсказка-перевод (задание)
    .text-center
      h2.text-xl.font-bold.text-base-content(class="sm:text-2xl") {{ hint }}

    // Собранная фраза
    .min-h-14.border.border-dashed.border-base-300.rounded-lg.p-2.flex.flex-wrap.gap-1.items-center(
      class="bg-base-200/50"
      aria-label="Собранная фраза"
    )
      button.btn.btn-primary.btn-md.text-lg(
        v-for="i in selected"
        :key="i"
        :disabled="revealed"
        @click="undo(i)"
      )
        | {{ tiles[i] }}
      span(class="text-sm text-base-content/30" v-if="selected.length === 0") …

    // До проверки — пул плиток (выбранная остаётся пустым местом
    // своего размера, остальные не сдвигаются)
    .flex.flex-wrap.gap-1.justify-center(v-if="!revealed")
      button(
        v-for="(tile, i) in tiles"
        :key="i"
        :class="tileClass(i)"
        :disabled="selected.includes(i)"
        @click="pick(i)"
      )
        | {{ tile }}

    // После проверки — результат на месте пула: карточка не растёт,
    // кнопка под ней остаётся ровно там же, где была «Проверить»
    .min-h-14.flex.items-center.justify-center(v-else)
      p.text-center.text-lg.font-bold(
        :class="isCorrect ? 'text-success' : 'text-error'"
      )
        template(v-if="isCorrect") ✓ {{ t('practice.correct') }}
        template(v-else) ✗ {{ t('practice.answerWas') }} {{ answerTiles.join(' ') }}

    // Кнопка: до проверки — «Проверить», после — «Дальше» (на том же месте)
    button.btn.text-lg(
      :class="revealed ? 'btn-primary' : 'bg-green-800'"
      :disabled="!revealed && selected.length === 0"
      @click="revealed ? emit('next') : check()"
    ) {{ revealed ? t('practice.next') : t('practice.check') }}
</template>
