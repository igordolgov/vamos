<script setup lang="ts">
// ============================================================
// pages/opportunities.vue — «выучишь X → будешь знать Y».
// ============================================================
import { computed, onMounted } from 'vue'
import { useT } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { opportunities, groupOpportunity, phraseStats, unlockKeys } from '#shared/stats'
import { ALL_WORDS, POS_LABELS } from '#shared/data/words'
import type { PartOfSpeech } from '#shared/types'
import OpportunityCard from '~/components/OpportunityCard.vue'
import UnlockKeyCard from '~/components/UnlockKeyCard.vue'
import EmptyState from '~/components/EmptyState.vue'

const t = useT()
const {progress, ensureLoaded} = useProgress()
onMounted(() => {
  void ensureLoaded()
})

const list = computed(() => opportunities(progress.value, 24))
const stats = computed(() => phraseStats(progress.value))
// Ключи: какие наборы слов откроют пока запертые шаблоны
const keys = computed(() => unlockKeys(progress.value, 4))

function fmt(n: number): string {
  return n.toLocaleString('ru-RU')
}

// Групповые проекции: выучить всю часть речи целиком
const groupOps = computed(() => {
  const posList = Object.keys(POS_LABELS) as PartOfSpeech[]
  return posList
    .map((pos) => {
      const words = ALL_WORDS.filter((w) => w.pos === pos)
      return { pos, label: POS_LABELS[pos], count: words.length, gain: groupOpportunity(progress.value, words) }
    })
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 6)
})
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('opps.title') }}
p(class="text-base-content/60 mb-3")
  | {{ t('opps.subtitle') }} ·
  | {{ fmt(stats.known) }} / {{ fmt(stats.total) }}

// Ключи к запертым шаблонам — главный ответ на вопрос
// «какие слова открывают фразы», поэтому идут первыми
div(v-if="keys.length" class="mb-6")
  h2.text-lg.font-bold(class="mb-1") {{ t('opps.keys') }}
  p(class="text-sm text-base-content/60 mb-3") {{ t('opps.keysHint') }}
  .grid.grid-cols-1(class="md:grid-cols-2 gap-3")
    UnlockKeyCard(
      v-for="k in keys"
      :key="k.words.map((w) => w.id).join('+')"
      :unlock="k"
    )

// Топ-слова по открытым фразам
.grid.grid-cols-1(class="md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6")
  OpportunityCard(
    v-for="opp in list"
    :key="opp.word.id"
    :word="opp.word"
    :new-phrases="opp.newPhrases"
    :total-after="opp.totalAfter"
  )
EmptyState(v-if="list.length === 0" text="¡Felicidades! Все слова выучены" icon="👑")

// Групповые проекции
.card.bg-base-100.shadow-sm.border.border-base-300
  .card-body.p-4
    h2.card-title.text-lg {{ t('opps.group') }}
    p(class="text-sm text-base-content/60") {{ t('opps.groupHint') }}
    .overflow-x-auto.mt-2
      table.table.table-sm
        thead
          tr
            th Часть речи
            th Слов
            th Открытых фраз
        tbody
          tr(v-for="g in groupOps" :key="g.pos")
            td {{ g.label.emoji }} {{ g.label.ru }}
            td {{ g.count }}
            td(class="text-success font-bold") +{{ fmt(g.gain) }}
</template>
