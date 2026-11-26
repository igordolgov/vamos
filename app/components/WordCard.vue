<script setup lang="ts">
// ============================================================
// WordCard.vue — карточка слова: испанское слово, перевод,
// грамматические данные, статус и озвучка. Пилюли статуса
// («выучено»/«в процессе»/«новое») и кнопка «Уже знал» стоят
// в одной строке со словом. «Уже знал» — слово считается
// выученным и включается во фразы, как пройденное в уроках.
// ============================================================
import { computed } from 'vue'
import type { PartOfSpeech, Word } from '#shared/types'
import { POS_LABELS } from '#shared/data/words'
import { useT, useLocale } from '~/composables/useI18n'
import { phrasesWord } from '#shared/i18n/plural'
import SpeakButton from './SpeakButton.vue'

const props = defineProps<{
  word: Word
  /** Статус: known / progress / new */
  status?: 'known' | 'progress' | 'new'
  /** Сколько фраз откроет это слово (проекция) */
  unlock?: number | null
  /** Слово уже помечено «Уже знал» — кнопка показывает состояние */
  starred?: boolean
}>()

const emit = defineEmits<{ 'toggle-star': [] }>()

const t = useT()
const locale = useLocale()
const posLabel = computed(() => POS_LABELS[props.word.pos])
const statusBadge = computed(() => {
  if (props.status === 'known') return 'badge-success'
  if (props.status === 'progress') return 'badge-warning'
  return 'badge-ghost'
})
const statusText = computed(() => {
  if (props.status === 'known') return t('words.known')
  if (props.status === 'progress') return t('words.inProgress')
  return t('words.new')
})

/** Часть речи в единственном числе — для мета-строки карточки */
const POS_SINGULAR: Record<PartOfSpeech, { ru: string; es: string }> = {
  pronoun: { ru: 'местоимение', es: 'pronombre' },
  determiner: { ru: 'артикль', es: 'artículo' },
  verb: { ru: 'глагол', es: 'verbo' },
  noun: { ru: 'существительное', es: 'sustantivo' },
  adjective: { ru: 'прилагательное', es: 'adjetivo' },
  preposition: { ru: 'предлог', es: 'preposición' },
  adverb: { ru: 'наречие', es: 'adverbio' },
  question: { ru: 'вопрос', es: 'pregunta' },
  conjunction: { ru: 'союз', es: 'conjunción' },
  number: { ru: 'числительное', es: 'número' },
  construction: { ru: 'конструкция', es: 'construcción' },
}
const posSingular = computed(() => POS_SINGULAR[props.word.pos][locale.value === 'es' ? 'es' : 'ru'])

/** Полная парадигма лица: yo, tú, él/ella/Ud., nosotros, vosotros, ellos/ellas/Uds.
 *  (usted спрягается как él/ella, ustedes — как ellos: подпись показывает это) */
const persons = ['yo', 'tú', 'él/ella/Ud.', 'nosotros', 'vosotros', 'ellos/ellas/Uds.'] as const

/** Спряжение глагола в настоящем времени */
const conjugationRows = computed(() => {
  const v = props.word.verb
  if (!v) return []
  const keys = ['1s', '2s', '3s', '1p', '2p', '3p'] as const
  return persons.map((p, i) => ({
    person: p,
    form: v.forms[keys[i]!],
  }))
})

/** Формы прилагательного / определителя */
const adjForms = computed(() => {
  if (!props.word.adj) return null
  return [
    props.word.adj!.m,
    props.word.adj!.f,
    props.word.adj!.mp,
    props.word.adj!.fp,
  ]
})

/** Род и мн.ч. существительного */
const nounInfo = computed(() => {
  if (props.word.pos !== 'noun') return null
  return {
    gender: props.word.gender === 'f' ? 'ж.р. (la)' : 'м.р. (el)',
    plural: props.word.nounPlural,
  }
})
</script>

<template lang="pug">
.card.bg-base-100.border.border-base-300.shadow-sm(
  class="hover:shadow-md hover:border-primary/40 transition-all duration-200"
)
  .card-body.p-3(class="gap-1.5")
    // Заголовок: слово, озвучка и пилюли статуса — в одной строке
    .flex.flex-wrap.items-center(class="gap-x-2 gap-y-1")
      h3.font-bold.text-xl.leading-tight.text-primary(class="break-words") {{ word.es }}
      SpeakButton(:text="word.es")
      .flex.items-center.gap-1(class="ml-auto shrink-0")
        span.badge.badge-sm.font-medium(:class="statusBadge") {{ statusText }}
        // «Уже знал»: пометка знания слова прямо из словаря.
        // Повторный клик снимает пометку (случайный клик не лишает контроля)
        button.btn.btn-xs.px-2(
          :class="starred ? 'btn-success btn-outline font-medium' : 'btn-ghost text-base-content/45'"
          :aria-pressed="!!starred"
          :aria-label="t('words.markKnown') + ': ' + word.es"
          @click.stop="emit('toggle-star')"
        )
          | {{ starred ? '✓' : '✨' }} {{ t('words.markKnown') }}

    // Перевод (+ альтернативные испанские варианты, если есть)
    p.font-medium(class="text-base-content/85")
      | {{ word.ru.join(', ') }}
      span(
        v-if="word.esAlt && word.esAlt.length"
        class="ml-1.5 font-normal text-[0.8125rem] text-base-content/45"
      )
        | = {{ word.esAlt.join(', ') }}

    // Подсказка
    p(v-if="word.ruHint" class="text-[0.8125rem] leading-snug text-base-content/55") {{ word.ruHint }}

    // Часть речи + грамматика существительного (род, мн.ч.)
    p(class="text-[0.8125rem] text-base-content/60")
      | {{ posLabel.emoji }} {{ posSingular }}
      template(v-if="nounInfo")
        | &nbsp;· {{ nounInfo.gender }} · мн.ч.: {{ nounInfo.plural }}

    // Прилагательное: формы
    p(v-if="adjForms" class="text-[0.8125rem] text-base-content/60")
      | {{ t('words.forms') }}: {{ adjForms.join(' · ') }}

    // Глагол: спряжение (настоящее время, все лица)
    div(v-if="conjugationRows.length" class="mt-0.5")
      p(class="mb-1 text-[0.8125rem] text-base-content/60") {{ t('words.conjugation') }}
      .grid.grid-cols-2(class="gap-x-3 gap-y-0.5 sm:grid-cols-3")
        p(v-for="row in conjugationRows" :key="row.person" class="text-[0.8125rem]")
          span(class="text-base-content/45") {{ row.person }}
          span.font-medium.ml-1 {{ row.form }}

    // Проекция «выучишь — узнаешь»
    p(v-if="unlock && unlock > 0" class="mt-0.5 text-[0.8125rem] text-secondary")
      | ⚡ {{ t('words.youLearn', { n: unlock.toLocaleString('ru-RU'), w: phrasesWord(unlock, locale) }) }}
</template>
