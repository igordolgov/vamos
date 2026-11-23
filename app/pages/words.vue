<script setup lang="ts">
// ============================================================
// pages/words.vue — словарь: фильтры по частям речи, поиск,
// статусы и проекции «выучишь — узнаешь».
// ============================================================
import { computed, onMounted, ref } from 'vue'
import { useT, useLocale } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { ALL_WORDS, POS_LABELS } from '#shared/data/words'
import { knownSet, opportunityFor } from '#shared/stats'
import { isWordKnown } from '#shared/types'
import type { PartOfSpeech } from '#shared/types'
import WordCard from '~/components/WordCard.vue'
import EmptyState from '~/components/EmptyState.vue'

const t = useT()
const locale = useLocale()
const {progress, ensureLoaded} = useProgress()
onMounted(() => {
  void ensureLoaded()
})

const search = ref('')
const posFilter = ref<PartOfSpeech | 'all'>('all')

const posOptions = (Object.keys(POS_LABELS) as PartOfSpeech[]).map((pos) => ({
  pos,
  label: `${POS_LABELS[pos].emoji} ${POS_LABELS[pos][locale.value === 'es' ? 'es' : 'ru']}`,
}))

const known = computed(() => knownSet(progress.value))

const filtered = computed(() =>
  ALL_WORDS.filter((w) => {
    if (posFilter.value !== 'all' && w.pos !== posFilter.value) return false
    if (search.value) {
      const q = search.value.toLowerCase()
      const haystack = [w.es, w.esAlt?.join(' ') ?? '', w.ru.join(' ')].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }),
)

const cards = computed(() =>
  filtered.value.slice(0, 60).map((w) => {
    const status = isWordKnown(progress.value.words[w.id])
      ? ('known' as const)
      : progress.value.words[w.id]?.correct
        ? ('progress' as const)
        : ('new' as const)
    const opp = opportunityFor(progress.value, w.id)
    return { word: w, status, unlock: opp ? opp.newPhrases : null }
  }),
)
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('words.title') }}
p(class="text-base-content/60 mb-4") {{ t('words.subtitle', { n: ALL_WORDS.length }) }}

// Фильтры
.flex.flex-wrap.gap-2.mb-4
  input.input.input-bordered.input-sm.w-40(
    v-model="search"
    :placeholder="t('words.search')"
    type="search"
  )
  select.select.select-bordered.select-sm.w-56(v-model="posFilter")
    option(value="all") {{ t('words.filterAll') }}
    option(v-for="o in posOptions" :key="o.pos" :value="o.pos") {{ o.label }}

// Карточки
.grid.grid-cols-1(class="md:grid-cols-2 gap-3")
  WordCard(
    v-for="card in cards"
    :key="card.word.id"
    :word="card.word"
    :status="card.status"
    :unlock="card.unlock"
  )

EmptyState(v-if="cards.length === 0" :text="t('words.empty')" icon="🔍")
</template>
