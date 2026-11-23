<script setup lang="ts">
// ============================================================
// pages/lessons/[id].vue — слова урока + проекция «что откроет».
// ============================================================
import { computed, onMounted } from 'vue'
import { useT } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { getLesson } from '#shared/data/lessons'
import { wordsByLesson } from '#shared/data/words'
import { knownSet, opportunityFor } from '#shared/stats'
import { isWordKnown } from '#shared/types'
import WordCard from '~/components/WordCard.vue'
import EmptyState from '~/components/EmptyState.vue'

const route = useRoute()
const t = useT()
const {progress, ensureLoaded} = useProgress()
onMounted(() => {
  void ensureLoaded()
})

const lessonNumber = computed(() => Number(route.params.id) || 1)
const lesson = computed(() => getLesson(lessonNumber.value))
const words = computed(() => wordsByLesson(lessonNumber.value))
const known = computed(() => knownSet(progress.value))

const knownCount = computed(() => words.value.filter((w) => known.value.has(w.id)).length)

const cards = computed(() =>
  words.value.map((w) => {
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
NuxtLink.btn.btn-ghost.btn-sm.mb-2(to="/lessons") ← {{ t('lessons.back') }}

template(v-if="lesson")
  h1.text-2xl.font-bold.text-primary № {{ lesson.number }} — {{ lesson.titleRu }}
  p(class="text-base-content/60 mb-1") {{ lesson.titleEs }} · {{ lesson.hintRu }}
  p(class="text-sm text-base-content/50 mb-4") {{ t('lessons.knownOf', { known: knownCount, total: words.length }) }}

  // Что этот урок откроет
  p(class="text-sm text-secondary mb-4" v-if="lesson.unlocksFrom")
    | ⚡ {{ t('lessons.unlockHint') }}: {{ lesson.unlocksFrom }}

  .grid.grid-cols-1(class="md:grid-cols-2 gap-3")
    WordCard(
      v-for="card in cards"
      :key="card.word.id"
      :word="card.word"
      :status="card.status"
      :unlock="card.unlock"
    )

EmptyState(v-else='' :text="t('words.empty')" icon="📚")
</template>
