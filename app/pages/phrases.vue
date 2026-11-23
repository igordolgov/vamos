<script setup lang="ts">
// ============================================================
// pages/phrases.vue — комбинаторный генератор фраз:
// фильтры по группе и варианту, пагинация, озвучка.
// ============================================================
import { computed, onMounted, ref, watch } from 'vue'
import { useT, useLocale } from '~/composables/useI18n'
import { useProgress } from '~/composables/useProgress'
import { allTemplates } from '#shared/phrases/templates'
import { enumerateTemplate, countTemplate } from '#shared/phrases/engine'
import { knownSet, phraseStats, unlockKeys } from '#shared/stats'
import { PHRASE_GROUPS, KIND_LABELS } from '#shared/phrases/schema'
import type { PhraseGroup, PhraseKind } from '#shared/phrases/schema'
import PhraseRow from '~/components/PhraseRow.vue'
import UnlockKeyCard from '~/components/UnlockKeyCard.vue'
import EmptyState from '~/components/EmptyState.vue'

const t = useT()
const locale = useLocale()
const {progress, ensureLoaded} = useProgress()
onMounted(() => {
  void ensureLoaded()
})

const PAGE_SIZE = 20
const page = ref(0)
const groupFilter = ref<PhraseGroup | 'all'>('all')
const kindFilter = ref<PhraseKind | 'all'>('all')

const known = computed(() => knownSet(progress.value))
const stats = computed(() => phraseStats(progress.value))
// Ключи: какими словами открываются пока запертые шаблоны
const keys = computed(() => unlockKeys(progress.value, 2))

function fmt(n: number): string {
  return n.toLocaleString('ru-RU')
}

// Шаблон, соответствующий фильтрам и доступный по выученным словам.
// Предпочитаем первый шаблон, в котором РЕАЛЬНО есть фразы: у первых
// по порядку шаблонов счёт может быть 0 (нужны детерминаторы и т.п.),
// а фразы при этом открываются в более поздних шаблонах.
const activeTemplate = computed(() => {
  const templates = allTemplates()
  const eligible = templates.filter((tpl) => tpl.requires.every((id) => known.value.has(id)))
  const byGroup = eligible.filter((tpl) => groupFilter.value === 'all' || tpl.group === groupFilter.value)
  const byKind = byGroup.filter((tpl) => kindFilter.value === 'all' || tpl.variants.includes(kindFilter.value as never))
  const pool = byKind.length ? byKind : byGroup
  return pool.find((tpl) => countTemplate(tpl, known.value) > 0) ?? pool[0] ?? eligible[0] ?? null
})

// Страница фраз выбранного шаблона
const pageData = computed(() => {
  const tpl = activeTemplate.value
  if (!tpl) return { phrases: [], total: 0 }
  return enumerateTemplate(tpl, known.value, page.value * PAGE_SIZE, PAGE_SIZE)
})

watch([groupFilter, kindFilter], () => {
  page.value = 0
})

const kinds: Array<PhraseKind | 'all'> = ['all', 'aff', 'neg', 'yesno', 'qw']
const kindLabel = (k: PhraseKind | 'all') =>
  k === 'all' ? t('phrases.kindAll') : KIND_LABELS[k][locale.value === 'es' ? 'es' : 'ru']
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('phrases.title') }}
p(class="text-base-content/60 mb-4")
  | {{ t('phrases.subtitle', { known: fmt(stats.known), total: fmt(stats.total) }) }}

// Фильтры
.flex.flex-wrap.gap-2.mb-4
  select.select.select-bordered.select-sm.w-52(v-model="groupFilter")
    option(value="all") {{ t('phrases.groupAll') }}
    option(v-for="g in PHRASE_GROUPS" :key="g" :value="g") {{ g }}
  select.select.select-bordered.select-sm.w-48(v-model="kindFilter")
    option(v-for="k in kinds" :key="k" :value="k") {{ kindLabel(k) }}

template(v-if="activeTemplate && pageData.total > 0")
  p(class="text-xs text-base-content/50 mb-2")
    | {{ activeTemplate.id }} · {{ t('phrases.total', { n: fmt(pageData.total) }) }}

  // Страница фраз
  .flex.flex-col.gap-2
    PhraseRow(
      v-for="p in pageData.phrases"
      :key="p.key"
      :es="p.es"
      :ru="p.ru"
      :kind="p.kind"
    )

  // Пагинация
  .join.mt-4.w-fit(v-if="pageData.total > PAGE_SIZE")
    button.join-item.btn.btn-sm(:disabled="page === 0" @click="page--") ←
    button.join-item.btn.btn-sm.btn-ghost {{ page + 1 }}
    button.join-item.btn.btn-sm(:disabled="(page + 1) * PAGE_SIZE >= pageData.total" @click="page++") →

template(v-else)
  // Подсказка: какие слова откроют фразы (когда список пуст)
  .card.bg-base-100.shadow-sm.border.border-base-300(class="mb-4" v-if="keys.length")
    .card-body.p-4.gap-2
      h2.card-title.text-base {{ t('phrases.keysTitle') }}
      p(class="text-sm text-base-content/60") {{ t('phrases.keysIntro') }}
      .grid.grid-cols-1(class="md:grid-cols-2 gap-3")
        UnlockKeyCard(
          v-for="k in keys"
          :key="k.words.map((w) => w.id).join('+')"
          :unlock="k"
        )
  EmptyState(:text="t('phrases.empty')" icon="💬")
</template>
