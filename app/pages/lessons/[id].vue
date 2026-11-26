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
const {progress, ensureLoaded, setWordStar} = useProgress()
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
    const wp = progress.value.words[w.id]
    // «Уже знал» — пользователь подтвердил знание: слово выучено
    const status = wp && isWordKnown(wp)
      ? ('known' as const)
      : wp?.correct
        ? ('progress' as const)
        : ('new' as const)
    const opp = opportunityFor(progress.value, w.id)
    return { word: w, status, unlock: opp ? opp.newPhrases : null, starred: !!wp?.star }
  }),
)

// «Уже знал» из словаря: с тостом — как на странице «Слова»
function toggleStar(id: string, starred: boolean) {
  setWordStar(id, starred)
  if (starred) {
    const win = window as unknown as { __vamosToast?: (text: string, icon?: string) => void }
    win.__vamosToast?.(t('practice.starToast'), '✨')
  }
}
</script>

<template lang="pug">
.flex.items-center.justify-between.gap-2.mb-2
  NuxtLink.btn.btn-ghost.btn-sm.px-2(to="/lessons") ← {{ t('lessons.back') }}
  // Закрепление урока: практика только по словам этого урока
  NuxtLink.btn.btn-primary.btn-sm(v-if="lesson" :to="`/practice?lesson=${lesson.number}`")
    | 🎯 {{ t('lessons.practice') }}

template(v-if="lesson")
  h1.text-2xl.font-bold.text-primary № {{ lesson.number }} — {{ lesson.titleRu }}
  p(class="text-base-content/60 mb-3")
    | {{ lesson.titleEs }} · {{ lesson.hintRu }} ·
    | {{ t('lessons.knownOf', { known: knownCount, total: words.length }) }}

  // Что этот урок откроет
  p(class="text-sm text-secondary mb-2" v-if="lesson.unlocksFrom")
    | ⚡ {{ t('lessons.unlockHint') }}: {{ lesson.unlocksFrom }}

  .grid.grid-cols-1(class="md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3")
    WordCard(
      v-for="card in cards"
      :key="card.word.id"
      :word="card.word"
      :status="card.status"
      :unlock="card.unlock"
      :starred="card.starred"
      @toggle-star="toggleStar(card.word.id, !card.starred)"
    )

EmptyState(v-else='' :text="t('words.empty')" icon="📚")
</template>
