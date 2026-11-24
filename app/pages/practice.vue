<script setup lang="ts">
// ============================================================
// pages/practice.vue — тренировочная сессия:
// тест-выбор / сборка фразы / аудио, счёт, итоги.
// Режим закрепления урока: /practice?lesson=N — пул только из
// слов этого урока (кнопка «Практика» на странице урока).
// ============================================================
import { computed, onMounted, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import { speakEs } from '~/composables/useSpeech'
import { useProgress, applyAnswer } from '~/composables/useProgress'
import { makeExercise, type Exercise, type ExerciseKind } from '#shared/practice'
import { knownWordsCount } from '#shared/stats'
import QuizChoice from '~/components/QuizChoice.vue'
import QuizBuild from '~/components/QuizBuild.vue'
import SessionResult from '~/components/SessionResult.vue'

const route = useRoute()
const t = useT()
const {progress, ensureLoaded} = useProgress()
onMounted(() => {
  void ensureLoaded()
})

// ============================================================
// Состояние сессии
// ============================================================
const SESSION_LENGTH = 10

const mode = ref<'menu' | 'session' | 'result'>('menu')
const kind = ref<ExerciseKind | 'mixed'>('choice')
const current = ref<Exercise | null>(null)
const index = ref(0)
const correctCount = ref(0)
const wrongCount = ref(0)
const newWords = ref<Array<{ es: string; ru: string[] }>>([])
const lastCorrect = ref<boolean | null>(null)

// Пул практики всегда содержит новые слова — блокировать нечего
const wordsKnown = computed(() => knownWordsCount(progress.value))

// Режим «микс» чередует типы упражнений
function pickKind(): ExerciseKind {
  if (kind.value !== 'mixed') return kind.value
  const types: ExerciseKind[] = ['choice', 'build', 'audio']
  return types[Math.floor(Math.random() * types.length)]
}

// Закрепление урока: /practice?lesson=N (0 или мусор — весь словарь)
const lessonFilter = computed(() => {
  const n = Number(route.query.lesson)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
})

function startSession() {
  index.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  newWords.value = []
  mode.value = 'session'
  nextExercise()
}

function nextExercise() {
  lastCorrect.value = null
  const opts = { lesson: lessonFilter.value || undefined }
  const chosen = pickKind()
  current.value = makeExercise(chosen, progress.value, Math.random, opts)
  // Страховка: если выбранный тип не собрался (например, в миксе попалась
  // сборка без подходящих шаблонов) — пробуем тест-выбор, и только потом
  // завершаем сессию
  if (!current.value && chosen !== 'choice') {
    current.value = makeExercise('choice', progress.value, Math.random, opts)
  }
  if (!current.value) {
    mode.value = 'result'
    return
  }
}

function onAnswered(correct: boolean) {
  if (!current.value || lastCorrect.value !== null) return
  lastCorrect.value = correct
  const newly = applyAnswer(current.value, correct)
  if (correct) correctCount.value++
  else wrongCount.value++
  if (newly.length) newWords.value = [...newWords.value, ...newly.map((w) => ({ es: w.es, ru: w.ru }))]
}

function goNext() {
  index.value++
  if (index.value >= SESSION_LENGTH) {
    mode.value = 'result'
    return
  }
  nextExercise()
}

function speakAudio() {
  if (current.value?.speak) speakEs(current.value.speak)
}

// ============================================================
// Свайп-жест: после ответа горизонтальный свайп по экрану = «Дальше»
// (кнопка тоже работает — жест лишь ускоряет привычный путь)
// ============================================================
let touchStart: { x: number; y: number } | null = null

function onTouchStart(e: TouchEvent) {
  if (lastCorrect.value === null) return
  const t = e.changedTouches[0]
  touchStart = { x: t.clientX, y: t.clientY }
}

function onTouchEnd(e: TouchEvent) {
  if (!touchStart || lastCorrect.value === null) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStart.x
  const dy = t.clientY - touchStart.y
  touchStart = null
  // только явный горизонтальный свайп ≥ 60px — не путаем с прокруткой страницы
  if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goNext()
}
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('practice.title') }}

// Баннер режима закрепления урока
.alert.mb-2(v-if="lessonFilter" class="bg-primary/10 py-2 border border-primary/40")
  span.text-sm.font-medium {{ t('practice.lessonMode', { n: lessonFilter }) }}
  NuxtLink.btn.btn-ghost.btn-xs(to="/practice") {{ t('practice.lessonAll') }}

// Меню выбора типа упражнения
.card.bg-base-100.shadow-sm.border.border-base-300.mb-2(v-if="mode === 'menu'")
  .card-body(class="gap-2.5 p-3 sm:p-4")
    h2.card-title.text-lg {{ t('practice.source') }}
    .grid.grid-cols-2(class="gap-2 sm:grid-cols-4")
      button.btn.btn-outline(:class="kind === 'choice' ? 'btn-primary' : ''" @click="kind = 'choice'")
        | ✅ {{ t('practice.choice') }}
      button.btn.btn-outline(:class="kind === 'build' ? 'btn-primary' : ''" @click="kind = 'build'")
        | 🧩 {{ t('practice.build') }}
      button.btn.btn-outline(:class="kind === 'audio' ? 'btn-primary' : ''" @click="kind = 'audio'")
        | 🔊 {{ t('practice.audio') }}
      button.btn.btn-outline(:class="kind === 'mixed' ? 'btn-primary' : ''" @click="kind = 'mixed'")
        | 🎲 {{ t('practice.mixed') }}
    button.btn.btn-primary(class="w-full sm:w-64" @click="startSession") {{ t('practice.start') }}

// Сессия: свайп после ответа листает к следующему упражнению
.max-w-xl.mx-auto(
  v-else-if="mode === 'session'"
  @touchstart.passive="onTouchStart"
  @touchend.passive="onTouchEnd"
)
  .flex.items-center.justify-between.mb-2
    p(class="text-sm text-base-content/60") {{ t('practice.progress', { n: index + 1, total: SESSION_LENGTH }) }}
    p.text-sm
      span(class="font-bold text-success") {{ correctCount }} ✓
      span(class="ml-2 font-bold text-error") {{ wrongCount }} ✗

  template(v-if="current")
    QuizChoice(
      v-if="current.kind === 'choice'"
      :key="index"
      :question-es="current.questionEs"
      :question-ru="current.questionRu"
      :options="current.options"
      :answer-index="current.answerIndex"
      @answered="onAnswered"
      @next="goNext"
    )

    QuizBuild(
      v-else-if="current.kind === 'build'"
      :key="index"
      :tiles="current.tiles ?? []"
      :answer-tiles="current.answerTiles ?? []"
      :hint="current.hint ?? ''"
      @answered="onAnswered"
      @next="goNext"
    )

    // Аудио: озвучка + выбор перевода
    template(v-else-if="current.kind === 'audio'")
      .card.bg-base-100.shadow-lg.border.border-base-300.w-full.mb-2
        .card-body.p-4.items-center
          p(class="text-sm text-base-content/60") {{ t('practice.listen') }}
          button.btn.btn-circle.btn-lg.btn-primary(@click="speakAudio()") 🔊

      QuizChoice(
        :key="'audio-' + index"
        :options="current.options"
        :answer-index="current.answerIndex"
        @answered="onAnswered"
        @next="goNext"
      )

// Итоги
SessionResult(
  v-else=''
  :correct="correctCount"
  :wrong="wrongCount"
  :new-words="newWords"
  @again="startSession"
  @finish="mode = 'menu'"
)
</template>
