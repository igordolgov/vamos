<script setup lang="ts">
// ============================================================
// pages/achievements.vue — все бейджи.
// ============================================================
import { computed, onMounted } from 'vue'
import { useT } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { ACHIEVEMENTS } from '#shared/achievements'
import BadgeCard from '~/components/BadgeCard.vue'

const t = useT()
const {progress, ensureLoaded} = useProgress()
onMounted(() => {
  void ensureLoaded()
})

const badges = computed(() =>
  ACHIEVEMENTS.map((a) => ({ achievement: a, unlocked: !!progress.value.achievements[a.id] })),
)
const unlockedCount = computed(() => badges.value.filter((b) => b.unlocked).length)
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('ach.title') }}
p(class="text-base-content/60 mb-3") {{ t('ach.subtitle', { n: unlockedCount, total: ACHIEVEMENTS.length }) }}

.grid.grid-cols-2(class="sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3")
  BadgeCard(
    v-for="b in badges"
    :key="b.achievement.id"
    :achievement="b.achievement"
    :unlocked="b.unlocked"
  )
</template>
