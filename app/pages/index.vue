<script setup lang="ts">
// ============================================================
// pages/index.vue — дашборд: статистика, серия дней, кольца
// прогресса, топ-возможности и кнопка продолжения учёбы.
// ============================================================
import { computed, onMounted } from 'vue'
import { useT, useLocale } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { useInstall } from '~/composables/useInstall'
import {
  knownWordsCount,
  phraseStats,
  progressByPos,
  progressByLessons,
  opportunities,
  inProgressWords,
} from '#shared/stats'
import { currentStreak } from '#shared/streak'
import { WORD_COUNT } from '#shared/data/words'
import { LESSONS } from '#shared/data/lessons'
import { phrasesWord, pluralRu } from '#shared/i18n/plural'
import { ACHIEVEMENTS } from '#shared/achievements'
import StatRing from '~/components/StatRing.vue'
import StreakWidget from '~/components/StreakWidget.vue'
import OpportunityCard from '~/components/OpportunityCard.vue'
import BadgeCard from '~/components/BadgeCard.vue'

const t = useT()
const locale = useLocale()
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

// «Ты уже можешь сказать N фраз» — динамически от выученных слов
const phrasesYou = computed(() => phrases.value.known.toLocaleString('ru-RU'))
const phrasesYouWord = computed(() => phrasesWord(phrases.value.known, locale.value))

// «Повторить сегодня»: слова, начатые, но ещё не выученные —
// их повторение закрывает хвосты уроков
const reviewCount = computed(() => inProgressWords(progress.value).length)
const reviewWord = computed(() => pluralRu(reviewCount.value, ['слово', 'слова', 'слов']))

// Первый непройденный урок (кнопка «Продолжить учёбу»): первый урок,
// где есть невыученные слова — а не всегда урок 1; если выучено всё,
// ведём на последний (повторение)
const nextLesson = computed(() => {
  const lessons = progressByLessons(progress.value)
  return lessons.find((l) => l.known < l.total) ?? lessons[lessons.length - 1] ?? LESSONS[0]
})

// Последние полученные достижения
const recentBadges = computed(() => {
  return ACHIEVEMENTS.filter((a) => progress.value.achievements[a.id])
    .sort((a, b) => (progress.value.achievements[b.id] ?? 0) - (progress.value.achievements[a.id] ?? 0))
    .slice(0, 4)
})
</script>

<template lang="pug">
// Приветствие и кнопка продолжения
section.hero.bg-base-100.rounded-2xl.shadow-sm.border.border-base-300.mb-2
  .hero-content.p-3.w-full.text-left.justify-between.flex-col(class="sm:p-4 lg:flex-row lg:items-center lg:gap-6")
    .flex-1
      h1.font-bold.text-primary(class="text-2xl sm:text-3xl") {{ t('dash.greeting') }}
      p.mt-1(class="text-base-content/60")
        | {{ t('dash.stats.wordsTotal', { n: WORD_COUNT }) }} ·
        | {{ t('dash.stats.phrasesTotal', { n: phrases.total.toLocaleString('ru-RU') }) }}
      // Личный счётчик: сколько фраз ТЫ уже можешь сказать от выученных слов
      p(class="mt-0.5 font-semibold text-secondary")
        | {{ t('dash.stats.phrasesYou', { n: phrasesYou, w: phrasesYouWord }) }}
      NuxtLink.btn.btn-primary.mt-1.btn-sm(class="lg:btn-md" :to="`/lessons/${nextLesson.number}`") {{ t('dash.continue') }}

    .flex.gap-3.mt-2(class="lg:mt-0")
      StreakWidget(:streak="streak")

// Повторение: слова «в процессе» — карточка только когда есть что повторять
NuxtLink.card.bg-base-100.shadow-sm.border.border-base-300.mb-2.block(to="/practice" v-if="reviewCount > 0")
  .card-body(class="p-3 sm:p-4 flex-row items-center justify-between gap-2")
    h2.card-title.text-base 📌 {{ t('dash.review', { n: reviewCount, w: reviewWord }) }}
    span.btn.btn-primary.btn-sm {{ t('dash.reviewStart') }}

// Статистика: кольца (на десктопе — все 11 в один ряд)
section.card.bg-base-100.shadow-sm.border.border-base-300.mb-2
  .card-body(class="p-3 sm:p-4")
    h2.card-title.text-lg {{ t('dash.progressByPos') }}
    .grid.grid-cols-3(class="sm:grid-cols-6 lg:grid-cols-11 gap-x-2 gap-y-3 lg:gap-y-2 mt-1")
      StatRing(
        v-for="p in posProgress.slice(0, 12)"
        :key="p.pos"
        :value="p.known"
        :total="p.total"
        :label="locale === 'es' ? p.label.es : p.label.ru"
        size="size-20 lg:size-16"
      )

// Возможности «выучишь — будешь знать»
section.mb-2
  .flex.items-center.justify-between.mb-1
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
  .flex.items-center.justify-between.mb-1
    h2.text-lg.font-semibold {{ t('dash.badges') }}
    NuxtLink.btn.btn-ghost.btn-sm(to="/achievements") {{ t('dash.badgesAll') }}
  .grid.grid-cols-2(class="sm:grid-cols-4 gap-2")
    BadgeCard(
      v-for="a in recentBadges"
      :key="a.id"
      :achievement="a"
      :unlocked="true"
      compact=""
    )
  button.btn.btn-outline.btn-wide.mt-3(
    v-if="canInstall"
    @click="install()"
  )
    | 📲 {{ t('dash.install') }}
</template>
