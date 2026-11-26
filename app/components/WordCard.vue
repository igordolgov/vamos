<script setup lang="ts">
// ============================================================
// WordCard.vue — карточка слова: испанское слово, перевод,
// грамматические данные, статус и озвучка. Кнопка «Уже знал» —
// пользователь подтверждает знание слова из словаря (в практику
// оно дальше попадает заметно реже, в статистике — как выученное).
// ============================================================
import { computed } from 'vue'
import type { Word } from '#shared/types'
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

const persons = ['yo', 'tú', 'usted', 'nosotros', 'ustedes'] as const

/** Спряжение глагола в настоящем времени */
const conjugationRows = computed(() => {
  const v = props.word.verb
  if (!v) return []
  const keys = ['1s', '2s', '3s', '1p', '3p'] as const
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
    gender: props.word.gender === 'f' ? 'женский род (la)' : 'мужской род (el)',
    plural: props.word.nounPlural,
  }
})
</script>

<template lang="pug">
.card.bg-base-100.shadow-sm.border.border-base-300(class="hover:shadow-md transition-shadow")
  .card-body.p-3(class="gap-1.5")
    // Заголовок: слово + статус
    .flex.items-start.justify-between.gap-2
      .flex.items-center.gap-2.min-w-0
        h3.font-bold.text-lg.text-primary.break-words {{ word.es }}
        SpeakButton(:text="word.es")
        span.text-xs(class="text-base-content/40" v-if="word.esAlt && word.esAlt.length")
          | = {{ word.esAlt.join(', ') }}
      .flex.flex-col.items-end.gap-1.shrink-0
        span.badge.badge-sm(:class="statusBadge") {{ statusText }}
        span.badge.badge-sm.badge-outline
          | {{ posLabel.emoji }} {{ posLabel[locale === 'es' ? 'es' : 'ru'] }}
        // «Уже знал»: пометка знания слова прямо из словаря.
        // Повторный клик снимает пометку (случайный клик не лишает контроля)
        button.btn.btn-xs(
          :class="starred ? 'btn-success btn-outline' : 'btn-ghost text-base-content/45'"
          :aria-pressed="!!starred"
          :aria-label="t('words.markKnown') + ': ' + word.es"
          @click.stop="emit('toggle-star')"
        )
          | ✨ {{ t('words.markKnown') }}

    // Перевод
    p(class="text-base-content/80") {{ word.ru.join(', ') }}

    // Подсказка
    p(class="text-xs text-base-content/50" v-if="word.ruHint") {{ word.ruHint }}

    // Существительное: род/мн.ч.
    p(class="text-xs text-base-content/60" v-if="nounInfo")
      | {{ nounInfo.gender }} · мн.ч.: {{ nounInfo.plural }}

    // Прилагательное: формы
    p.text-xs(v-if="adjForms")
      span(class="text-base-content/60") {{ t('words.forms') }}:
      span.ml-1 {{ adjForms.join(' · ') }}

    // Глагол: спряжение
    div(class="mt-0.5" v-if="conjugationRows.length")
      p(class="mb-1 text-xs text-base-content/60") {{ t('words.conjugation') }}
      .grid.grid-cols-2(class="gap-x-3 gap-y-0.5 sm:grid-cols-3")
        p.text-xs(v-for="row in conjugationRows" :key="row.person")
          span(class="text-base-content/50") {{ row.person }}:
          span.font-medium.ml-1 {{ row.form }}

    // Проекция «выучишь — узнаешь»
    p(class="mt-0.5 text-secondary text-xs" v-if="unlock && unlock > 0")
      | ⚡ {{ t('words.youLearn', { n: unlock.toLocaleString('ru-RU'), w: phrasesWord(unlock, locale) }) }}
</template>
