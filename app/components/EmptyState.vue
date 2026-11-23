<script setup lang="ts">
// ============================================================
// EmptyState.vue — аккуратная пустая заглушка.
// ============================================================
import { useT } from '~/composables/useI18n'

const t = useT()
defineProps<{ text: string; icon?: string }>()
</script>

<template lang="pug">
.flex.flex-col.items-center.gap-2.py-10.text-center
  span.text-4xl.opacity-50 {{ icon ?? '🪴' }}
  p(class="text-base-content/50") {{ text }}
</template>
