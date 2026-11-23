<script setup lang="ts">
// ============================================================
// UnlockKeyCard.vue — карточка-«ключ»: словам не хватает
// обязательных слов шаблонов; выучите набор — откроются фразы.
// ============================================================
import type { UnlockKey } from '#shared/stats'
import { useT, useLocale } from '~/composables/useI18n'
import { phrasesWord } from '#shared/i18n/plural'

defineProps<{ unlock: UnlockKey }>()

const t = useT()
const locale = useLocale()

function fmt(n: number): string {
  return n.toLocaleString('ru-RU')
}
</script>

<template lang="pug">
.card.bg-base-100.shadow-sm.border(class="hover:border-secondary transition-colors border-secondary/30")
  .card-body.p-3.gap-1
    .flex.flex-wrap.items-center.gap-1
      span.badge.badge-primary.badge-sm(v-for="w in unlock.words" :key="w.id")
        | {{ w.es }} · {{ t('opps.lesson', { n: w.lesson }) }}
    p.text-sm(class="text-base-content/70")
      | {{ unlock.words.map((w) => w.ru[0]).join(', ') }}
    p.text-sm
      span.font-bold.text-success
        | +{{ fmt(unlock.potential) }} {{ t('opps.keysTemplates', { w: phrasesWord(unlock.potential, locale), tpl: unlock.templates }) }}
</template>
