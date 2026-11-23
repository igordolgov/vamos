<script setup lang="ts">
// ============================================================
// BadgeCard.vue — карточка достижения.
// ============================================================
import { useT, useLocale } from '~/composables/useI18n'
import type { Achievement } from '#shared/achievements'

const props = defineProps<{
  achievement: Achievement
  unlocked: boolean
}>()

const t = useT()
const locale = useLocale()
</script>

<template lang="pug">
.card(:class="unlocked ? 'bg-base-100 shadow-sm border border-accent/40' : 'bg-base-200 opacity-60'")
  .card-body.p-3.gap-1.items-center.text-center
    span.text-4xl(:class="unlocked ? '' : 'grayscale'") {{ achievement.icon }}
    h3.font-semibold.text-sm(:class="unlocked ? 'text-primary' : 'text-base-content/50'")
      | {{ locale === 'es' ? achievement.titleEs : achievement.titleRu }}
    p.text-xs(class="text-base-content/60") {{ achievement.descRu }}
    span.badge.badge-sm(:class="unlocked ? 'badge-success' : 'badge-ghost'")
      | {{ unlocked ? t('ach.unlocked') : t('ach.locked') }}
</template>
