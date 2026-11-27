<script setup lang="ts">
// ============================================================
// pages/practice.vue — тренировочная сессия:
// тест-выбор / сборка фразы / аудио, счёт, итоги.
// Режим закрепления урока: /practice?lesson=N — пул только из
// слов этого урока (кнопка «Практика» на странице урока).
// ============================================================
import { computed, onMounted, ref, watch } from 'vue'
import { useT } from '~/composables/useI18n'
import { speakEs, unlockSpeech } from '~/composables/useSpeech'
import { useProgress, applyAnswer, markAlreadyKnown, likeExercise, dislikeExercise } from '~/composables/useProgress'
import { makeExercise, type Exercise, type ExerciseKind } from '#shared/practice'
import { knownWordsCount } from '#shared/stats'
import QuizChoice from '~/components/QuizChoice.vue'
import QuizBuild from '~/components/QuizBuild.vue'
import QuizActive from '~/components/QuizActive.vue'
import MicCompare from '~/components/MicCompare.vue'
import SessionResult from '~/components/SessionResult.vue'
import SpeakButton from '~/components/SpeakButton.vue'

const route = useRoute()
const router = useRouter()
const t = useT()
const {progress, ensureLoaded, setProgressSetting} = useProgress()
onMounted(() => {
  void ensureLoaded()
  // Перезагрузка внутри сессии: ?mode=… в URL остался, а состояние сессии
  // потеряно — возвращаемся в меню и чистим URL (иначе меню не увидеть:
  // watcher не сработает, а mode-состояние пустое)
  if (route.query.mode) void router.replace({ query: { ...route.query, mode: undefined } })
})

// ============================================================
// Состояние сессии
// ============================================================
const SESSION_LENGTH = 10

const mode = ref<'menu' | 'session' | 'result'>('menu')
const kind = ref<ExerciseKind | 'mixed'>('choice')
const current = ref<Exercise | null>(null)
const index = ref(0)
/** Монотонный счётчик упражнений: ключ компонента — каждое новое
 *  упражнение перемонтируется с чистым состоянием (даже при пропуске
 *  фразы через 👎, когда index не меняется) */
const seq = ref(0)
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

// ============================================================
// «Нравится» / «Не нравится» — реакция на фразу в «Сборке фразы».
// 👍 — фраза в личной коллекции и будет показываться чаще;
// 👎 — фраза вообще больше не показывается (сразу к следующей).
// Счётчики сессии при этом не трогаются — это не ответ.
// ============================================================
function likeCurrent() {
  if (!current.value) return
  const key = likeExercise(current.value)
  if (key) {
    const w = window as unknown as { __vamosToast?: (text: string, icon?: string) => void }
    w.__vamosToast?.(t('practice.likeToast'), '❤️')
  }
}

function dislikeCurrent() {
  if (!current.value) return
  const key = dislikeExercise(current.value)
  if (key) {
    const w = window as unknown as { __vamosToast?: (text: string, icon?: string) => void }
    w.__vamosToast?.(t('practice.dislikeToast'), '🙈')
    // скрытая фраза больше не нужна — сразу к следующей
    lastSignature = null
    nextExercise()
  }
}

// Поэтапная сборка («Слова по шагам»): усложнённый режим — плитки
// открываются шаг за шагом, рядом с похожими словами. Настройка
// хранится в прогрессе (settings.stagedBuild) — действует и для
// «Сборки фразы», и для «Микса»
const stagedBuild = computed(() => progress.value.settings.stagedBuild ?? false)

function toggleStaged(e: Event) {
  setProgressSetting('stagedBuild', (e.target as HTMLInputElement).checked)
}

// Закрепление урока: /practice?lesson=N (0 или мусор — весь словарь)
const lessonFilter = computed(() => {
  const n = Number(route.query.lesson)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
})

function startWith(k: ExerciseKind | 'mixed') {
  kind.value = k
  startSession()
  // Сессия получает свой шаг истории (?mode=build): жест «назад» и
  // повторный клик по «Практике» в нижней панели возвращают в меню
  // выбора источника, а не покидают раздел (см. watch ниже)
  void router.push({ query: { ...route.query, mode: k } }).catch(() => {})
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
// Выход из сессии в меню без потери «предыдущего раздела»:
// жест «назад» стирает ?mode из URL, повторный клик по «Практике»
// нижней панели ведёт на /practice без ?mode — в обоих случаях
// возвращаемся в меню выбора источника
// ============================================================
watch(
  () => route.query.mode,
  (m) => {
    if (!m && mode.value !== 'menu') {
      mode.value = 'menu'
      index.value = 0
      current.value = null
    }
  },
)

/** Итоги → меню: чистим ?mode из URL (не оставляем шаг истории) */
function finishToMenu() {
  mode.value = 'menu'
  if (route.query.mode) void router.replace({ query: { ...route.query, mode: undefined } })
}

// ============================================================
// Без повторов: два одинаковых предложения (или слова) подряд —
// скучно. Сигнатура — само предложение; повторяем генерацию,
// пока не получим другое (при маленьком пуле — смиряемся с повтором)
// ============================================================
let lastSignature: string | null = null

function exerciseSignature(ex: Exercise): string {
  if (ex.kind === 'build') return 'b:' + (ex.answerTiles ?? []).join(' ').toLowerCase()
  if (ex.kind === 'active') return 'a:' + (ex.questionRu ?? '')
  return 'q:' + (ex.questionEs ?? '') + '|' + (ex.questionRu ?? '')
}

function generateUnique(chosen: ExerciseKind): Exercise | null {
  const opts = { lesson: lessonFilter.value || undefined, staged: stagedBuild.value }
  let ex = makeExercise(chosen, progress.value, Math.random, opts)
  for (let i = 0; i < 8 && ex && lastSignature && exerciseSignature(ex) === lastSignature; i++) {
    ex = makeExercise(chosen, progress.value, Math.random, opts)
  }
  if (ex) lastSignature = exerciseSignature(ex)
  return ex
}

function nextExercise() {
  lastCorrect.value = null
  seq.value++
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

/** «Послушать целиком» в «Сборке фразы»: кнопка в шапке рядом с 👍/👎 —
 *  после проверки, интонация целой фразы (а не отдельных слов).
 *  Раньше отдельная строка в карточке — на мобильном съедала экран */
function speakBuilt() {
  const tiles = current.value?.answerTiles
  if (tiles?.length) void speakEs(tiles.join(' '))
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
// Заголовок — только в меню и в итогах: в сессии он съедает пол-экрана
// на мобильном, а контекст и так есть в строке «Вопрос N из 10»
h1.text-2xl.font-bold.text-primary(v-if="mode !== 'session'") {{ t('practice.title') }}

// Баннер режима закрепления урока
.alert.mb-2(v-if="lessonFilter" class="bg-primary/10 py-2 border border-primary/40")
  span.text-sm.font-medium {{ t('practice.lessonMode', { n: lessonFilter }) }}
  NuxtLink.btn.btn-ghost.btn-xs(to="/practice") {{ t('practice.lessonAll') }}

// Меню выбора типа упражнения: клик по карточке сразу запускает
// сессию. Стеклянные карточки (.glass-card в main.css):
// на мобильном 2 колонки, пропорция 5:3 (ниже квадрата — меню
// помещается на экран), от sm — 3, от lg — 5,
// ширина ограничена (max-w-3xl)
div.mb-2(v-if="mode === 'menu'")
  h2.card-title.text-lg.mb-2(class="sm:text-xl") {{ t('practice.source') }}
  .grid.grid-cols-2.w-full.max-w-3xl(class="gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5 mx-auto")
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
    button.glass-card(type="button" @click="startWith('active')")
      span.glass-card-icon(aria-hidden="true") ⌨️
      span.glass-card-label {{ t('practice.active') }}

  // Поэтапный режим «Сборки фразы»: усложнение по переключателю.
  // Плитки показываются не все сразу, а шаг за шагом — верное слово
  // среди похожих (вопросительные с вопросительными, формы глагола
  // с формами того же глагола)
  .flex.flex-col.items-center.gap-1.mt-1.mb-2(class="max-w-2xl mx-auto")
    label.flex.items-center.gap-2.cursor-pointer.select-none
      input.toggle.toggle-sm.toggle-primary(type="checkbox" :checked="stagedBuild" @change="toggleStaged($event)")
      span.text-sm.font-medium {{ t('practice.staged') }}
    p.text-xs.text-center(class="text-base-content/50 max-w-md") {{ t('practice.stagedHint') }}

// Сессия: свайп после ответа листает к следующему упражнению
.max-w-xl.mx-auto(
  v-else-if="mode === 'session'"
  @touchstart.passive="onTouchStart"
  @touchend.passive="onTouchEnd"
)
  // Одна строка: прогресс слева, реакция на фразу в центре, счёт справа —
  // экономит вертикальное место, чтобы сессия помещалась на один экран.
  // В «Сборке фразы» центр — кнопки 👍/👎 (личная коллекция / скрыть),
  // после проверки рядом 🔊 «Послушать целиком» (переехало из карточки:
  // экономит строку на мобильном); в остальных режимах — прежняя
  // кнопка «Уже выучил» и счёт ✓/✗
  .flex.items-center.justify-between.mb-2(class="gap-1")
    p(class="text-sm text-base-content/60 shrink-0") {{ t('practice.progress', { n: index + 1, total: SESSION_LENGTH }) }}
    .flex.items-center.gap-1(v-if="current?.kind === 'build' && current.answerTiles")
      button.btn.btn-md.border-success(
        class="h-7 min-h-0"
        :title="t('practice.like')"
        :aria-label="t('practice.like')"
        @click="likeCurrent()"
      )
        span 👍
      button.btn.btn-md.border-error(
        class="h-7 min-h-0"
        :title="t('practice.dislike')"
        :aria-label="t('practice.dislike')"
        @click="dislikeCurrent()"
      )
        span 👎
      button.btn.btn-md.border-primary(
        v-if="lastCorrect !== null"
        class="h-7 min-h-0"
        :title="t('practice.listenAll')"
        :aria-label="t('practice.listenAll')"
        @click="speakBuilt()"
      )
        span 🔊
    template(v-else)
      button.btn.btn-md.border-primary(
        class="h-7 min-h-0 text-base-content/50"
        @click="markKnown()"
      )
        span.text-sm ✨
        | {{ t('practice.alreadyKnown') }}
    p.text-sm(class="shrink-0" v-if="current?.kind !== 'build'")
      span(class="font-bold text-success") {{ correctCount }} ✓
      span(class="ml-2 font-bold text-error") {{ wrongCount }} ✗

  template(v-if="current")
    QuizChoice(
      v-if="current.kind === 'choice'"
      :key="seq"
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
      :key="seq"
      :tiles="current.tiles ?? []"
      :answer-tiles="current.answerTiles ?? []"
      :tile-words="current.tileWords"
      :stages="current.stages"
      :alt-answers="current.altAnswers"
      :hint="current.hint ?? ''"
      :tip="current.tip"
      @answered="onAnswered"
      @next="goNext"
    )

    // Активный перевод (RU → ES): вспомнить слово и ввести
    QuizActive(
      v-else-if="current.kind === 'active'"
      :key="seq"
      :question-ru="current.questionRu ?? ''"
      :type-answer="current.typeAnswer ?? ''"
      :alt-type-answers="current.altTypeAnswers"
      :explanation="current.explanation"
      @answered="onAnswered"
      @next="goNext"
    )

    // Аудио: озвучка + выбор перевода. Компактная карточка — на мобильном
    // нужно уместить вместе с вариантами и микрофоном
    template(v-else-if="current.kind === 'audio'")
      .card.bg-base-100.shadow-lg.border.border-base-300.w-full.mb-2
        .card-body.p-3.items-center(class="gap-1.5")
          p(class="text-sm text-base-content/60") {{ t('practice.listen') }}
          // Белая иконка на зелёном: рупор + две звуковые волны
          button.btn.btn-circle.btn-md.btn-success(@click="speakAudio()" :aria-label="t('practice.listen')")
            svg(
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-7 h-7 text-white"
              aria-hidden="true"
            )
              path(d="M11 5 6 9H2v6h4l5 4V5Z")
              path(d="M15.54 8.46a5 5 0 0 1 0 7.07")
              path(d="M19.07 4.93a10 10 0 0 1 0 14.14")

          // Написание услышанного — после ответа: звук и буквы вместе.
          // Зона зарезервирована (min-h-9), чтобы карточка не прыгала
          .min-h-9.flex.items-center.justify-center.gap-2
            .animate-feedback.flex.items-center.gap-2(v-if="lastCorrect !== null && current.speak")
              span.text-2xl.font-bold.text-primary {{ current.speak }}
              SpeakButton(:text="current.speak")

          // Микрофон: записать себя и сравнить с эталоном
          MicCompare(v-if="lastCorrect !== null && current.speak" :reference="current.speak")

      QuizChoice(
        :key="'audio-' + seq"
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
  @finish="finishToMenu"
)
</template>
