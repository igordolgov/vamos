<script setup lang="ts">
// ============================================================
// QuizBuild.vue — собрать испанскую фразу из плиток-слов.
// После проверки фидбек занимает место пула плиток, а кнопка
// «Проверить» превращается в «Дальше» — ничего не прыгает и
// «Дальше» всегда под большим пальцем, без прокрутки.
// ============================================================
import { computed, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import { speakEs } from '~/composables/useSpeech'
import type { WordTip } from '#shared/data/word-tips'
import { glossLine } from '#shared/gloss'

const props = defineProps<{
  tiles: string[]
  answerTiles: string[]
  hint: string
  /** Допустимые варианты без подлежащего-местоимения («Eres alto») */
  altAnswers?: string[]
  /** Объяснение ошибки: почему путают и как запомнить — при неверном ответе */
  tip?: WordTip
}>()

const emit = defineEmits<{ answered: [correct: boolean]; next: [] }>()

const t = useT()
/** Выбранные плитки: индексы в исходном массиве tiles */
const selected = ref<number[]>([])
const revealed = ref(false)

/** Класс плитки: выбранная (и после проверки — вся пул) остаётся пустым
 *  местом своего размера — слова не перепрыгивают, а после проверки
 *  пул держит точную высоту, поэтому «Дальше» не сдвигается */
function tileClass(i: number): string {
  const base = 'btn btn-outline btn-lg normal-case'
  return revealed.value || selected.value.includes(i)
    ? `${base} invisible pointer-events-none`
    : base
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

/** Класс плитки в собранной фразе: до проверки — обычная; после
 *  НЕверной проверки — подсветка позиций: зелёная плитка стоит на
 *  своём месте, красная — не на своём (видно, где именно ошибка) */
function builtClass(i: number): string {
  if (!revealed.value) return 'btn-primary'
  const pos = selected.value.indexOf(i)
  const expected = props.answerTiles[pos]?.toLowerCase()
  return props.tiles[i].toLowerCase() === expected ? 'btn-success' : 'btn-error'
}

/** Верно, если собран полный ответ без учёта регистра — точный или
 *  без подлежащего-местоимения, когда форма глагола однозначна.
 *  ВАЖНО: toLowerCase() со скобками — сравнение функции со строкой
 *  всегда false (баг «съеденных скобок» ломал проверку сборки). */
const isCorrect = computed(() => {
  const candidates = [props.answerTiles.join(' '), ...(props.altAnswers ?? [])]
  return candidates.some((c) => built.value.toLowerCase() === c.toLowerCase())
})

function check() {
  if (revealed.value || selected.value.length === 0) return
  revealed.value = true
  // Неверная сборка: верная фраза озвучивается — слух закрепляет
  // правильный порядок слов вместе с разбором
  if (!isCorrect.value) void speakEs(props.answerTiles.join(' '))
  emit('answered', isCorrect.value)
}

/** Пословный разбор верной фразы: слово → перевод (tengo — имею) */
const gloss = computed(() => glossLine(props.answerTiles.join(' ')))
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
      button.btn.btn-md.text-lg(
        v-for="i in selected"
        :key="i"
        :class="builtClass(i)"
        @click="undo(i)"
      )
        | {{ tiles[i] }}
      span(class="text-sm text-base-content/30" v-if="selected.length === 0") …

    // Пул плиток. После проверки кнопки остаются на местах, но невидимыми:
    // контейнер держит точную высоту пула, поэтому «Дальше» стоит ровно
    // там же, где была «Проверить». min-h-24 страхует фидбек с подписью
    // «Верный ответ:» и ответом на отдельных строках (до 2 строк текста)
    .relative.min-h-24.flex.flex-wrap.gap-1.justify-center
      button(
        v-for="(tile, i) in tiles"
        :key="i"
        :class="tileClass(i)"
        :disabled="revealed || selected.includes(i)"
        @click="pick(i)"
      )
        | {{ tile }}

      // Результат — поверх места плиток: подпись и сам ответ на
      // отдельных строках, с pop-анимацией
      .absolute.inset-0.flex.items-center.justify-center(v-if="revealed")
        div.text-center.animate-feedback
          template(v-if="isCorrect")
            p.text-2xl.font-bold.text-success ✓ {{ t('practice.correct') }}
          template(v-else)
            p.text-base.font-semibold.text-error(class="sm:text-lg") ✗ {{ t('practice.answerWas') }}
            p.text-xl.font-bold.text-base-content(class="sm:text-2xl") {{ answerTiles.join(' ') }}

    // Объяснение ошибки: почему легко путать и лайфхак запоминания,
    // пример и пословный разбор верной фразы. Появляется только
    // при неверном ответе
    .w-full(v-if="revealed && !isCorrect && tip")
      .rounded-xl.text-left(class="p-2.5 bg-warning/10 border border-warning/30")
        p.text-sm(class="leading-snug")
          | 💡 <b>{{ t('practice.tipWhy') }}:</b> {{ tip.why }}
        p.text-sm.mt-1(class="leading-snug")
          | 🧠 <b>{{ t('practice.tipHack') }}:</b> {{ tip.hack }}
        p.text-sm.mt-1(class="leading-snug" v-if="tip.ex")
          | 💬 <b>{{ t('practice.tipEx') }}:</b> «{{ tip.ex.es }}» — {{ tip.ex.ru }}
        p.text-sm.mt-1(class="leading-snug" v-if="gloss")
          | 🔍 <b>{{ t('practice.gloss') }}:</b> {{ gloss }}

    // Кнопка: до проверки — «Проверить», после — «Дальше» (на том же месте)
    button.btn.text-lg(
      :class="revealed ? 'btn-primary' : 'bg-green-800'"
      :disabled="!revealed && selected.length === 0"
      @click="revealed ? emit('next') : check()"
    ) {{ revealed ? t('practice.next') : t('practice.check') }}
</template>
