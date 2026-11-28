<script setup lang="ts">
// ============================================================
// pages/review.vue — «Повторение»: флешки по интервалам (SRS)
// и слабые слова.
//
// Карточки: лицо — русский перевод, оборот — испанское слово
// с озвучкой, самооценка «Знаю / Не помню» двигает карточку по
// уровням Лейтнера (1→2→4→8→16→32 дня; ошибка — повтор сегодня).
// Ошибочная карточка показывается в этой же сессии ещё раз —
// в конце очереди, но не более одного повторного показа.
//
// Слабые слова: слова с ошибками из тестов и практики —
// кнопка запускает отдельную сессию практики по ним
// (/practice?pool=weak).
// ============================================================
import { computed, onMounted, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import { useProgress, applySrsReview } from '~/composables/useProgress'
import { unlockSpeech } from '~/composables/useSpeech'
import { srsQueue, srsDueCount, SRS_SESSION_LIMIT } from '#shared/srs'
import { weakWords, knownWordsCount } from '#shared/stats'
import { pluralRu } from '#shared/i18n/plural'
import type { Word } from '#shared/types'
import Flashcard from '~/components/Flashcard.vue'
import SpeakButton from '~/components/SpeakButton.vue'
import EmptyState from '~/components/EmptyState.vue'

const router = useRouter()
const t = useT()
const { progress, ensureLoaded } = useProgress()
onMounted(() => {
  void ensureLoaded()
})

// ============================================================
// Сессия карточек
// ============================================================
const mode = ref<'menu' | 'session' | 'done'>('menu')
/** Очередь сессии (может расти: ошибка возвращает карточку в конец) */
const list = ref<Word[]>([])
const hand = ref(0)
/** Монотонный счётчик — ключ компонента карточки (чистый переворот) */
const seq = ref(0)
/** Карточки, которые уже показали повторно (не более раза за сессию) */
const retried = ref(new Set<string>())
const knownCount = ref(0)
const unknownCount = ref(0)

const due = computed(() => srsDueCount(progress.value, Date.now()))
const dueWord = computed(() => pluralRu(due.value, ['карточка', 'карточки', 'карточек']))
const hasKnown = computed(() => knownWordsCount(progress.value) > 0)

const current = computed(() => list.value[hand.value] ?? null)

function start() {
  const queue = srsQueue(progress.value, Date.now(), SRS_SESSION_LIMIT)
  if (!queue.length) return
  // iOS/Safari: озвучка на перевороте работает, только если первый
  // speak() случился в жесте клика (кнопка «Повторить»)
  unlockSpeech()
  list.value = queue
  hand.value = 0
  knownCount.value = 0
  unknownCount.value = 0
  retried.value = new Set()
  seq.value++
  mode.value = 'session'
}

function rate(ok: boolean) {
  const word = current.value
  if (!word) return
  applySrsReview(word.id, ok)
  if (ok) knownCount.value++
  else {
    unknownCount.value++
    // Не вспомнил — карточка вернётся в конце этой же сессии (один раз),
    // после сессии она останется первой в очереди (срок = сейчас)
    if (!retried.value.has(word.id)) {
      retried.value.add(word.id)
      list.value = [...list.value, word]
    }
  }
  if (hand.value + 1 >= list.value.length) {
    mode.value = 'done'
    return
  }
  hand.value++
  seq.value++
}

/** «Завершить» посреди сессии: оценённые карточки уже сохранены */
function finish() {
  mode.value = 'done'
}

// ============================================================
// Слабые слова
// ============================================================
const weak = computed(() => weakWords(progress.value, 10))

function trainWeak() {
  void router.push('/practice?pool=weak')
}
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('review.title') }}
p(class="text-base-content/60 mb-2") {{ t('review.subtitle') }}

// Карточки: меню сессии
section.card.bg-base-100.shadow-sm.border.border-base-300.mb-2(v-if="mode === 'menu'")
  .card-body(class="p-3 sm:p-4 gap-2")
    .flex.items-center.justify-between(class="gap-2")
      h2.card-title.text-base 🔁 {{ t('review.cardsTitle') }}
      span.badge.badge-primary.font-medium(v-if="due > 0") {{ t('review.dueToday', { n: due, w: dueWord }) }}
    p(class="text-xs text-base-content/55") {{ t('review.intervals') }}
    button.btn.btn-primary.btn-wide(v-if="due > 0" @click="start()")
      | {{ t('review.start') }} · {{ due }}
    p(class="text-sm text-base-content/60" v-else-if="hasKnown") {{ t('review.allDone') }}
    EmptyState(v-else :text="t('review.empty')" icon="🔁")

// Сессия: карточка + самооценка
.max-w-xl.mx-auto.w-full(v-else-if="mode === 'session'")
  .flex.items-center.justify-between.mb-2
    p(class="text-sm text-base-content/60") {{ t('review.progress', { n: hand + 1, total: list.length }) }}
    button.btn.btn-ghost.btn-xs(@click="finish()") {{ t('practice.finish') }}
  Flashcard(v-if="current" :key="seq" :word="current" @rate="rate")

// Итоги сессии
.card.bg-base-100.shadow-sm.border.border-base-300.mb-2(v-else)
  .card-body.items-center(class="p-4 gap-1")
    h2.card-title.text-lg {{ t('review.done') }}
    p.font-medium
      span.text-success ✓ {{ knownCount }}
      span ·
      span.text-error.ml-1 ✗ {{ unknownCount }}
    button.btn.btn-primary.mt-1(v-if="due > 0" @click="start()") {{ t('review.again') }}
    button.btn.btn-ghost(@click="mode = 'menu'") {{ t('review.toMenu') }}

// Слабые слова: слова с ошибками + практика по ним
section.card.bg-base-100.shadow-sm.border.border-base-300.mb-2(v-if="mode === 'menu' && hasKnown")
  .card-body(class="p-3 sm:p-4 gap-2")
    h2.card-title.text-base 💪 {{ t('review.weakTitle') }}
    p(class="text-xs text-base-content/55") {{ t('review.weakHint') }}
    .divide-y(v-if="weak.length")
      .flex.items-center.gap-2(v-for="w in weak" :key="w.word.id" class="py-1.5")
        span.font-semibold.text-primary {{ w.word.es }}
        span.truncate(class="text-sm text-base-content/60") {{ w.word.ru[0] }}
        span.badge.badge-error.badge-outline.badge-sm.ml-auto.shrink-0 {{ t('review.weakErrors', { n: w.wrong }) }}
        SpeakButton(:text="w.word.es")
    EmptyState(v-else :text="t('review.weakEmpty')" icon="🎉")
    button.btn.btn-primary.btn-sm(v-if="weak.length" @click="trainWeak()")
      | 🎯 {{ t('review.weakTrain') }}
</template>
