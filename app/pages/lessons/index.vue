<script setup lang="ts">
// ============================================================
// lessons.vue — список уроков с прогрессом.
// ============================================================
import { computed, onMounted } from 'vue'
import { useT } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { progressByLessons } from '../../../shared/stats'
import LessonCard from '~/components/LessonCard.vue'

const t = useT()
const {progress, ensureLoaded} = useProgress()
onMounted(() => {
  void ensureLoaded()
})

const lessons = computed(() => progressByLessons(progress.value))
const totalKnown = computed(() => lessons.value.reduce((acc, l) => acc + l.known, 0))
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('lessons.title') }}
p(class="text-base-content/60 mb-4") {{ t('lessons.subtitle') }}

.grid.grid-cols-1(class="sm:grid-cols-2 lg:grid-cols-3 gap-3")
  LessonCard(
    v-for="lesson in lessons"
    :key="lesson.number"
    :number="lesson.number"
    :title-ru="lesson.titleRu"
    :title-es="lesson.titleEs"
    :hint-ru="lesson.hintRu"
    :known="lesson.known"
    :total="lesson.total"
  )

p(class="text-sm text-base-content/50 mt-4") {{ totalKnown }} {{ t('dash.stats.words') }}
</template>
