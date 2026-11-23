<script setup lang="ts">
// ============================================================
// pages/index.vue — дашборд: статистика, серия дней, кольца
// прогресса, топ-возможности и кнопка продолжения учёбы.
// ============================================================
import { computed, onMounted } from 'vue'
import { useT } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { useInstall } from '~/composables/useInstall'
import {
  knownWordsCount,
  phraseStats,
  progressByPos,
  opportunities,
} from '#shared/stats'
import { currentStreak } from '#shared/streak'
import { WORD_COUNT } from '#shared/data/words'
import { LESSONS } from '#shared/data/lessons'
import { ACHIEVEMENTS } from '#shared/achievements'
import StatRing from '~/components/StatRing.vue'
import StreakWidget from '~/components/StreakWidget.vue'
import OpportunityCard from '~/components/OpportunityCard.vue'
import BadgeCard from '~/components/BadgeCard.vue'

const t = useT()
const {progress, ensureLoaded} = useProgress()
const {canInstall, install} = useInstall()
onMounted(() => {
  void ensureLoaded()
})

// Числа дашборда (пересчитываются от реактивного прогресса)
const wordsKnown = computed(() => knownWordsCount(progress.value))
const phrases = computed(() => phraseStats(progress.value))
const streak = computed(() => currentStreak(progress.value))
const answers = computed(() => progress.value.answers.correct)
const posProgress = computed(() => progressByPos(progress.value))
const opps = computed(() => opportunities(progress.value, 3))

// Первый непройденный урок (кнопка «Продолжить учёбу»)
const nextLesson = computed(() => LESSONS[0])

// Последние полученные достижения
const recentBadges = computed(() => {
  return ACHIEVEMENTS.filter((a) => progress.value.achievements[a.id])
    .sort((a, b) => (progress.value.achievements[b.id] ?? 0) - (progress.value.achievements[a.id] ?? 0))
    .slice(0, 4)
})
</script>

<template lang="pug">
// Приветствие и кнопка продолжения
section.hero.bg-base-100.rounded-2xl.shadow-sm.border.border-base-300.mb-4
  .hero-content.p-6.w-full.text-left.justify-between.flex-col(class="lg:flex-row lg:gap-8")
    .flex-1
      h1.text-3xl.font-bold.text-primary {{ t('dash.greeting') }}
      p.mt-1(class="text-base-content/60")
        | {{ t('dash.stats.wordsTotal', { n: WORD_COUNT }) }} ·
        | {{ t('dash.stats.phrasesTotal', { n: phrases.total.toLocaleString('ru-RU') }) }}
      NuxtLink.btn.btn-primary.mt-3(:to="`/lessons/${nextLesson.number}`") {{ t('dash.continue') }}

    .flex.gap-4.mt-4(class="lg:mt-0")
      StreakWidget(:streak="streak")

// Статистика: кольца
section.card.bg-base-100.shadow-sm.border.border-base-300.mb-4
  .card-body.p-4
    h2.card-title.text-lg {{ t('dash.progressByPos') }}
    .grid.grid-cols-3(class="sm:grid-cols-6 gap-2 mt-2")
      StatRing(
        v-for="p in posProgress.slice(0, 12)"
        :key="p.pos"
        :value="p.known"
        :total="p.total"
        :label="t('dash.stats.words')"
        :emoji="p.label.emoji"
        size="size-20"
      )

// Возможности «выучишь — будешь знать»
section.mb-4
  .flex.items-center.justify-between.mb-2
    h2.text-lg.font-semibold {{ t('dash.opportunities') }}
    NuxtLink.btn.btn-ghost.btn-sm(to="/opportunities") {{ t('dash.opportunitiesMore') }}
  .grid.grid-cols-1(class="md:grid-cols-3 gap-2")
    OpportunityCard(
      v-for="opp in opps"
      :key="opp.word.id"
      :word="opp.word"
      :new-phrases="opp.newPhrases"
      :total-after="opp.totalAfter"
    )

// Достижения + установка PWA
section
  .flex.items-center.justify-between.mb-2
    h2.text-lg.font-semibold {{ t('dash.badges') }}
    NuxtLink.btn.btn-ghost.btn-sm(to="/achievements") {{ t('dash.badgesAll') }}
  .grid.grid-cols-2(class="sm:grid-cols-4 gap-2")
    BadgeCard(
      v-for="a in recentBadges"
      :key="a.id"
      :achievement="a"
      :unlocked="true"
    )
  button.btn.btn-outline.btn-wide.mt-4(
    v-if="canInstall"
    @click="install()"
  )
    | 📲 {{ t('dash.install') }}
</template>
