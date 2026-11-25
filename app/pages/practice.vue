<script setup lang="ts">
// ============================================================
// pages/practice.vue — тренировочная сессия:
// тест-выбор / сборка фразы / аудио, счёт, итоги.
// Режим закрепления урока: /practice?lesson=N — пул только из
// слов этого урока (кнопка «Практика» на странице урока).
// ============================================================
import { computed, onMounted, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import { speakEs, unlockSpeech } from '~/composables/useSpeech'
import { useProgress, applyAnswer, markAlreadyKnown } from '~/composables/useProgress'
import { makeExercise, type Exercise, type ExerciseKind } from '#shared/practice'
import { knownWordsCount } from '#shared/stats'
import QuizChoice from '~/components/QuizChoice.vue'
import QuizBuild from '~/components/QuizBuild.vue'
import SessionResult from '~/components/SessionResult.vue'
import SpeakButton from '~/components/SpeakButton.vue'

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

function startWith(k: ExerciseKind | 'mixed') {
  kind.value = k
  startSession()
}

function startSession() {
  // iOS/Safari: первый speak() обязан случиться внутри жеста —
  // разблокируем синтез в контексте клика, дальше авто-озвучка
  // (по таймеру) работает без ограничений
  unlockSpeech()
  index.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  newWords.value = []
  mode.value = 'session'
  nextExercise()
}

// ============================================================
// Без повторов: два одинаковых предложения (или слова) подряд —
// скучно. Сигнатура — само предложение; повторяем генерацию,
// пока не получим другое (при маленьком пуле — смиряемся с повтором)
// ============================================================
let lastSignature: string | null = null

function exerciseSignature(ex: Exercise): string {
  if (ex.kind === 'build') return 'b:' + (ex.answerTiles ?? []).join(' ').toLowerCase()
  return 'q:' + (ex.questionEs ?? '') + '|' + (ex.questionRu ?? '')
}

function generateUnique(chosen: ExerciseKind): Exercise | null {
  const opts = { lesson: lessonFilter.value || undefined }
  let ex = makeExercise(chosen, progress.value, Math.random, opts)
  for (let i = 0; i < 8 && ex && lastSignature && exerciseSignature(ex) === lastSignature; i++) {
    ex = makeExercise(chosen, progress.value, Math.random, opts)
  }
  if (ex) lastSignature = exerciseSignature(ex)
  return ex
}

function nextExercise() {
  lastCorrect.value = null
  const chosen = pickKind()
  current.value = generateUnique(chosen)
  // Страховка: если выбранный тип не собрался (например, в миксе попалась
  // сборка без подходящих шаблонов) — пробуем тест-выбор, и только потом
  // завершаем сессию
  if (!current.value && chosen !== 'choice') {
    current.value = generateUnique('choice')
  }
  if (!current.value) {
    mode.value = 'result'
    return
  }
  // Автоозвучка аудио-упражнения — синхронно в контексте жеста
  // (клик по кнопке типа / «Дальше» / свайп). Отложенный по таймеру
  // speak() десктопные браузеры блокируют (строгая политика
  // активации), синхронный вызов разрешён везде. iOS: первый speak()
  // обязан случиться в жесте — это делает unlockSpeech() в startSession
  const ex = current.value
  if (ex.kind === 'audio' && ex.speak) void speakEs(ex.speak)
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

/** «Уже выучил»: пометить слово/фразу — будут попадаться реже,
 *  и сразу показать следующее упражнение (без подсчёта в сессию) */
function markKnown() {
  if (!current.value) return
  markAlreadyKnown(current.value)
  const w = window as unknown as { __vamosToast?: (text: string, icon?: string) => void }
  w.__vamosToast?.(t('practice.starToast'), '✨')
  nextExercise()
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
  if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    // лёгкая отдача (виброотклик): Android/Chrome — короткая вибрация,
    // iOS Safari не поддерживает Vibration API и молча игнорирует вызов
    try { navigator.vibrate?.(10) } catch { /* нет поддержки — без отдачи */ }
    goNext()
  }
}
</script>

<template lang="pug">
h1.text-2xl.font-bold.text-primary {{ t('practice.title') }}

// Баннер режима закрепления урока
.alert.mb-2(v-if="lessonFilter" class="bg-primary/10 py-2 border border-primary/40")
  span.text-sm.font-medium {{ t('practice.lessonMode', { n: lessonFilter }) }}
  NuxtLink.btn.btn-ghost.btn-xs(to="/practice") {{ t('practice.lessonAll') }}

// Меню выбора типа упражнения: клик по карточке сразу запускает
// сессию. Стеклянные квадратные карточки (.glass-card в main.css):
// на мобильном 2 колонки с квадратом 1:1, от sm — ряд из 4,
// ширина ограничена (max-w-2xl), чтобы карточки оставались
// соразмерными на широких экранах
div.mb-2(v-if="mode === 'menu'")
  h2.card-title.text-lg.mb-2(class="sm:text-xl") {{ t('practice.source') }}
  .grid.grid-cols-2.w-full.max-w-2xl(class="gap-2.5 sm:gap-3 sm:grid-cols-4 mx-auto")
    button.glass-card.glass-card--success(type="button" @click="startWith('choice')")
      span.glass-card-icon(aria-hidden="true") ✅
      span.glass-card-label {{ t('practice.choice') }}
    button.glass-card.glass-card--accent(type="button" @click="startWith('build')")
      span.glass-card-icon(aria-hidden="true") 🧩
      span.glass-card-label {{ t('practice.build') }}
    button.glass-card.glass-card--info(type="button" @click="startWith('audio')")
      span.glass-card-icon(aria-hidden="true") 🔊
      span.glass-card-label {{ t('practice.audio') }}
    button.glass-card.glass-card--primary(type="button" @click="startWith('mixed')")
      span.glass-card-icon(aria-hidden="true") 🎲
      span.glass-card-label {{ t('practice.mixed') }}

// Сессия: свайп после ответа листает к следующему упражнению
.max-w-xl.mx-auto(
  v-else-if="mode === 'session'"
  @touchstart.passive="onTouchStart"
  @touchend.passive="onTouchEnd"
)
  // Одна строка: прогресс слева, «Уже выучил» в центре, счёт справа —
  // экономит вертикальное место, чтобы сессия помещалась на один экран
  // (учитывая верхнюю/нижнюю панели мобильного браузера)
  .flex.items-center.justify-between.mb-2(class="gap-1")
    p(class="text-sm text-base-content/60 shrink-0") {{ t('practice.progress', { n: index + 1, total: SESSION_LENGTH }) }}
    button.btn.btn-md.border-primary(
      class="h-7 min-h-0 text-base-content/50"
      @click="markKnown()"
    )
      span.text-sm ✨
      | {{ t('practice.alreadyKnown') }}
    p.text-sm(class="shrink-0")
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
      :tip="current.tip"
      :option-notes="current.optionNotes"
      @answered="onAnswered"
      @next="goNext"
    )

    QuizBuild(
      v-else-if="current.kind === 'build'"
      :key="index"
      :tiles="current.tiles ?? []"
      :answer-tiles="current.answerTiles ?? []"
      :alt-answers="current.altAnswers"
      :hint="current.hint ?? ''"
      :tip="current.tip"
      @answered="onAnswered"
      @next="goNext"
    )

    // Аудио: озвучка + выбор перевода
    template(v-else-if="current.kind === 'audio'")
      .card.bg-base-100.shadow-lg.border.border-base-300.w-full.mb-2
        .card-body.p-4.items-center
          p(class="text-sm text-base-content/60") {{ t('practice.listen') }}
          // Белая иконка на зелёном: рупор + две звуковые волны
          button.btn.btn-circle.btn-lg.btn-success(@click="speakAudio()" :aria-label="t('practice.listen')")
            svg(
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-10 h-10 text-white"
              aria-hidden="true"
            )
              path(d="M11 5 6 9H2v6h4l5 4V5Z")
              path(d="M15.54 8.46a5 5 0 0 1 0 7.07")
              path(d="M19.07 4.93a10 10 0 0 1 0 14.14")

          // Написание услышанного — после ответа: звук и буквы вместе.
          // Зона зарезервирована (min-h-10), чтобы карточка не прыгала
          .min-h-10.flex.items-center.justify-center.gap-2
            .animate-feedback.flex.items-center.gap-2(v-if="lastCorrect !== null && current.speak")
              span.text-2xl.font-bold.text-primary {{ current.speak }}
              SpeakButton(:text="current.speak")

      QuizChoice(
        :key="'audio-' + index"
        :options="current.options"
        :answer-index="current.answerIndex"
        :tip="current.tip"
        :option-notes="current.optionNotes"
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
