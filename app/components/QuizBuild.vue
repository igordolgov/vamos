<script setup lang="ts">
// ============================================================
// QuizBuild.vue — собрать испанскую фразу из плиток-слов.
// После проверки фидбек занимает место пула плиток, а кнопка
// «Проверить» превращается в «Дальше» — ничего не прыгает и
// «Дальше» всегда под большим пальцем, без прокрутки.
//
// Собранные плитки можно ПЕРЕТАСКИВАТЬ до нажатия «Проверить»:
// pointer-события (не HTML5 DnD) — работает и на сенсорном экране,
// и мышью. Короткий тап по плитке по-прежнему возвращает её в пул.
//
// ПОЭТАПНЫЙ РЕЖИМ («Слова по шагам», prop stages): слова не видны
// все сразу — для каждой позиции ответа показывается свой набор
// кандидатов (верное слово + похожие отвлекающие). Выбор слова
// переводит на следующий шаг, возврат плитки — на предыдущий.
//
// Плитки — компактные (маленькие паддинги, стандартное скругление
// кнопок DaisyUI — пилюли читаются хуже). Зона сборки изначально
// держит ДВЕ строки плиток (min-h-[94px] на мобильном): фраза дорастает
// с одной строки до двух без сдвига кнопки — карточка не меняет размер.
// ============================================================
import { computed, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import type { WordTip } from '#shared/data/word-tips'
import { targetedHint } from '#shared/phrases/diff-hint'
import { splitRuPrompt } from '#shared/phrases/ru'
import type { PartOfSpeech } from '#shared/types'

const props = defineProps<{
  tiles: string[]
  answerTiles: string[]
  /** Роль каждой плитки (строка → часть речи): цвет плитки — по роли */
  tileWords?: Record<string, PartOfSpeech>
  hint: string
  /** Поэтапный режим: stages[k] — кандидаты для k-го слова ответа.
   *  Пусто/не задано — обычный режим, весь пул сразу */
  stages?: string[][]
  /** Допустимые варианты без подлежащего-местоимения («Eres alto») */
  altAnswers?: string[]
  /** Объяснение ошибки: почему путают и как запомнить — при неверном ответе */
  tip?: WordTip
}>()

const emit = defineEmits<{ answered: [correct: boolean]; next: [] }>()

const t = useT()
/** Выбранные плитки: индексы в исходном массиве tiles */
const selected = ref<number[]>([])
const revealed = ref(false)

// ============================================================
// Поэтапный режим: выбранные слова хранятся как СТРОКИ (в обычном
// режиме — индексы плиток пула: там пул один на всё упражнение,
// а шаги сменяются — связывать выбор с индексами текущего шага
// нельзя, поэтому в этом режиме строки удобнее)
// ============================================================
const staged = computed(() => (props.stages?.length ?? 0) > 0)
/** Выбранные слова по шагам */
const stagePicked = ref<string[]>([])
/** Кандидаты текущего шага: для следующего (ещё не собранного) слова.
 *  Возврат плитки уменьшает stagePicked — шаг и набор вернутся сами */
const currentStage = computed(() => props.stages?.[stagePicked.value.length] ?? [])

/** Единый класс плитки-слова: компактная, со стандартным скруглением
 *  кнопок DaisyUI (rounded-field) — полные пилюли нечитабельны.
 *  Фиксированная высота h-9 (36px) при шрифте 16px на мобильном
 *  (18px/h-10 на sm+) — без зависимости от line-height и без растяжения
 *  по flex-stretch. Две строки плиток + перенос gap-1 (4px) + паддинг
 *  зоны сборки p-2 (16px) + границы 2px = 94px — ровно резерв зоны
 *  сборки min-h-[94px]: кнопка не сдвигается никогда. Выбранная (и после
 *  проверки — вся пул) плитка остаётся пустым местом своего размера —
 *  слова не перепрыгивают */
const TILE = 'btn normal-case h-9 px-2.5 leading-none text-base sm:h-10 sm:px-3 sm:text-lg'

// ============================================================
// Цветовое кодирование: плитка окрашена по РОЛИ слова —
// глагол красный, существительное синее, предлог/артикль серый,
// местоимение янтарное, наречие зелёное (.word-tile--* в main.css).
// Так фраза учит структуре: кто? → что делает? → что/где.
// ============================================================
const POS_COLOR: Partial<Record<PartOfSpeech, string>> = {
  verb: 'verb',
  noun: 'noun',
  preposition: 'prep',
  determiner: 'prep',
  pronoun: 'pronoun',
  adverb: 'adverb',
}

/** Цветовой класс плитки по её роли (или '' — базовая) */
function posClass(tile: string): string {
  const pos = props.tileWords?.[tile.toLowerCase()]
  const color = pos ? POS_COLOR[pos] : undefined
  return color ? `word-tile--${color}` : ''
}

/** Класс плитки ПУЛА: после проверки весь пул невидим (место держится
 *  за фидбек); в обычном режиме выбранная плитка тоже невидима — пустое
 *  место её размера. В поэтапном режиме выбранные плитки пул не
 *  покидают: шаг сменился — весь набор сменился, прятать нечего */
function poolTileClass(i: number, tile?: string): string {
  const base = `${TILE} btn-outline word-tile ${posClass(tile ?? props.tiles[i] ?? '')}`
  if (staged.value) {
    return revealed.value ? `${base} invisible pointer-events-none` : base
  }
  return revealed.value || selected.value.includes(i)
    ? `${base} invisible pointer-events-none`
    : base
}

function pick(index: number) {
  if (revealed.value) return
  if (staged.value) {
    const tile = currentStage.value[index]
    if (tile === undefined) return
    stagePicked.value = [...stagePicked.value, tile]
    return
  }
  selected.value = [...selected.value, index]
}

function undo(index: number) {
  if (revealed.value) return
  selected.value = selected.value.filter((i) => i !== index)
}

/** Убрать слово из собранной фразы по позиции. В поэтапном режиме это
 *  шаг назад: currentStage пересчитается от длины stagePicked — набор
 *  кандидатов предыдущего шага вернётся тем же (этапы предвычислены) */
function undoPos(pos: number) {
  if (revealed.value) return
  if (staged.value) {
    stagePicked.value = stagePicked.value.filter((_, i) => i !== pos)
    return
  }
  undo(selected.value[pos]!)
}

// ============================================================
// Перетаскивание собранной плитки (до проверки): указатель вниз —
// захват; движение дальше 8px — это уже перетаскивание, а не тап.
// Плитка живо переезжает в позицию, над которой палец/курсор
// (до/после плитки — по тому, в какой половине попали). HTML5 DnD
// не годится: на iOS Safari drag-события не срабатывают.
// ============================================================
const buildZone = ref<HTMLElement | null>(null)
/** Позиция тащимой плитки в selected — для подсветки (реактивно) */
const dragPos = ref(-1)
/** Нереактивное состояние жеста (обновляется на каждом движении) */
let drag: { pos: number; startX: number; startY: number; moved: boolean } | null = null
/** После перетаскивания браузер шлёт click на плитку — подавляем,
 *  чтобы слово не вернулось в пул. Тап (без движения) обрабатывает
 *  сам click — он же работает с клавиатуры (Enter/Space) */
let suppressClick = false

function onBuiltPointerDown(e: PointerEvent, pos: number) {
  if (revealed.value) return
  suppressClick = false
  drag = { pos, startX: e.clientX, startY: e.clientY, moved: false }
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // без capture (jsdom/старые браузеры) перетаскивание всё равно работает
  }
}

function onBuiltPointerMove(e: PointerEvent) {
  if (!drag || revealed.value) return
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 8) return
    drag.moved = true
    dragPos.value = drag.pos
  }
  reorderAt(e.clientX, e.clientY)
}

/** Поставить тащимую плитку на позицию указателя: ищем плитку под
 *  пальцем и вставляем до/после неё в зависимости от половины.
 *  В поэтапном режиме переставляем строки stagePicked, в обычном —
 *  индексы выбранного */
function reorderAt(x: number, y: number) {
  if (!drag || !buildZone.value) return
  for (const el of buildZone.value.querySelectorAll<HTMLElement>('[data-pos]')) {
    const pos = Number(el.dataset.pos)
    if (pos === drag.pos) continue
    const r = el.getBoundingClientRect()
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue
    const hovered = pos > drag.pos ? pos - 1 : pos
    const at = x < r.left + r.width / 2 ? hovered : hovered + 1
    if (staged.value) {
      const arr = [...stagePicked.value]
      const [tile] = arr.splice(drag.pos, 1)
      arr.splice(at, 0, tile!)
      stagePicked.value = arr
      drag.pos = at
      dragPos.value = at
      return
    }
    const arr = [...selected.value]
    const [tile2] = arr.splice(drag.pos, 1)
    arr.splice(at, 0, tile2!)
    selected.value = arr
    drag.pos = at
    dragPos.value = at
    return
  }
}

function onBuiltPointerUp() {
  if (drag?.moved) suppressClick = true
  drag = null
  dragPos.value = -1
}

function onBuiltPointerCancel() {
  drag = null
  dragPos.value = -1
}

function onBuiltClick(pos: number) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  undoPos(pos)
}

/** Собранная фраза: слова по позициям — в обоих режимах */
const builtWords = computed<string[]>(() =>
  staged.value ? stagePicked.value : selected.value.map((i) => props.tiles[i]!),
)

/** Собранная фраза (строкой) */
const built = computed(() => builtWords.value.join(' '))

/** Класс плитки в собранной фразе (та же пилюля): до проверки —
 *  цвет по роли слова (глагол красный, сущ. синее…; без роли —
 *  базовая btn-primary); после НЕверной проверки — подсветка позиций:
 *  зелёная плитка стоит на своём месте, красная — не на своём */
function builtClass(pos: number): string {
  const word = builtWords.value[pos] ?? ''
  const base = `${TILE} word-tile`
  if (!revealed.value) return `${base} ${posClass(word) || 'btn-primary'}`
  const expected = props.answerTiles[pos]?.toLowerCase()
  return `${base} ${word.toLowerCase() === expected ? 'btn-success' : 'btn-error'}`
}

/** Озвучка собранной фразы — в шапке сессии (practice.vue, speakBuilt) */

/** Верно, если собран полный ответ без учёта регистра — точный или
 *  без подлежащего-местоимения, когда форма глагола однозначна.
 *  ВАЖНО: toLowerCase() со скобками — сравнение функции со строкой
 *  всегда false (баг «съеденных скобок» ломал проверку сборки). */
const isCorrect = computed(() => {
  const candidates = [props.answerTiles.join(' '), ...(props.altAnswers ?? [])]
  return candidates.some((c) => built.value.toLowerCase() === c.toLowerCase())
})

function check() {
  if (revealed.value || builtWords.value.length === 0) return
  revealed.value = true
  // Без автоматической озвучки после ответа — только ручные кнопки 🔊
  emit('answered', isCorrect.value)
}

/** Целевая подсказка про КОНКРЕТНУЮ ошибку. Сравнивает собранную фразу
 *  с ответом: если ошибка однозначная (пропущен/лишний артикль, lo вместо
 *  le, контракция a+el, форма глагола, порядок слов…) — объясняется
 *  именно это правило. Если ошибок несколько или не то слово — null,
 *  и показывается общий tip шаблона (why/hack). */
const focusHint = computed<string | null>(() => {
  if (!revealed.value || isCorrect.value) return null
  return targetedHint(builtWords.value, props.answerTiles, props.altAnswers)
})

// ============================================================
// Подсказки в скобках («(известный)», «(какой-то)») — серым обычным
// шрифтом: это служебные метки артикля, а не слова для сборки.
// В обеих темах приглушённый цвет различим, но не спорит с заданием.
// ============================================================
const hintParts = computed(() => splitRuPrompt(props.hint ?? ''))
</script>

<template lang="pug">
.card.bg-base-100.shadow-lg.border.border-base-300.w-full
  .card-body(class="gap-2 sm:gap-3 p-3 sm:p-4")
    // Подсказка-перевод (задание). Части в скобках — подсказки артикля:
    // серый нежирный шрифт (span-части), задание — жирным целиком
    .text-center
      h2.text-xl.font-bold.text-base-content(class="sm:text-2xl")
        span(
          v-for="(p, i) in hintParts"
          :key="i"
          :class="p.hint ? 'font-normal text-base-content/50' : ''"
        ) {{ p.text }}

    // Собранная фраза: зона заранее держит ДВЕ строки плиток.
    // Расчёт резерва на мобильном: 2 строки × 36px + перенос 4px + паддинг
    // p-2 (16px) + границы зоны 2px = 94px (на sm+ плитки h-10 → 102px) —
    // фраза дорастает с 1 строки до 2 без сдвига «Проверить/Дальше»,
    // карточка не меняет размер.
    // touch-none на плитках: вертикальное движение пальца — это
    // перетаскивание, а не прокрутка страницы (тащим в обе стороны).
    // Ключ = позиция: при перестановке DOM-узлы остаются на местах
    // (меняется содержимое) — pointer-capture перетаскивания не рвётся
    .border.border-dashed.border-base-300.rounded-2xl.p-2.flex.flex-wrap.gap-1.items-center(
      class="bg-base-200/50 min-h-[94px] sm:min-h-[102px]"
      aria-label="Собранная фраза"
      ref="buildZone"
    )
      button(
        v-for="(w, pos) in builtWords"
        :key="pos"
        :data-pos="pos"
        :class="[builtClass(pos), dragPos === pos ? 'opacity-50 ring-2 ring-primary' : '']"
        class="touch-none select-none"
        @pointerdown="onBuiltPointerDown($event, pos)"
        @pointermove="onBuiltPointerMove"
        @pointerup="onBuiltPointerUp"
        @pointercancel="onBuiltPointerCancel"
        @click="onBuiltClick(pos)"
      )
        | {{ w }}
      span(class="text-sm text-base-content/30" v-if="builtWords.length === 0") …

    // Пул плиток. Обычный режим — весь пул сразу. Поэтапный («Слова
    // по шагам») — только кандидаты ТЕКУЩЕГО шага: верное слово среди
    // похожих; выбор слова переводит на следующий шаг (набор меняется
    // целиком). После проверки кнопки остаются на местах, но невидимыми:
    // контейнер держит точную высоту пула, поэтому «Дальше» стоит ровно
    // там же, где была «Проверить». min-h-24 страхует фидбек с подписью
    // «Верный ответ:» и ответом на отдельных строках (до 2 строк текста).
    // items/content-start: плитки не растягиваются по высоте контейнера
    // (stretch по умолчанию при h-auto у плитки)
    .relative.min-h-24.flex.flex-wrap.gap-1.justify-center.items-start.content-start
      template(v-if="!staged")
        button(
          v-for="(tile, i) in tiles"
          :key="i"
          :class="poolTileClass(i)"
          :disabled="revealed || selected.includes(i)"
          @click="pick(i)"
        )
          | {{ tile }}
      template(v-else)
        // Номер шага: сколько слов собрано из скольких — чтобы
        // пользователь видел, где он во фразе. Когда фраза собрана
        // целиком, шага «лишнего» нет — индикатор прячется
        p.w-full.text-center.text-xs(
          v-if="!revealed && stagePicked.length < answerTiles.length"
          class="text-base-content/50 select-none"
        ) {{ t('practice.stagedStep', { n: stagePicked.length + 1, total: answerTiles.length }) }}
        button(
          v-for="(tile, i) in currentStage"
          :key="stagePicked.length + '-' + i"
          :class="poolTileClass(i, tile)"
          :disabled="revealed"
          @click="pick(i)"
        )
          | {{ tile }}

      // Результат — поверх места плиток: подпись и сам ответ на
      // отдельных строках, с pop-анимацией
      .absolute.inset-0.flex.items-center.justify-center(v-if="revealed")
        div.text-center.animate-feedback
          template(v-if="isCorrect")
            p.text-2xl.font-bold.text-success ✓ {{ t('practice.correct') }}
          template(v-else)
            p.text-base.font-semibold.text-error(class="sm:text-lg") ✗ {{ t('practice.answerWas') }}
            p.text-xl.font-bold.text-base-content(class="sm:text-2xl") {{ answerTiles.join(' ') }}

    // «Послушать целиком» переехало в шапку сессии (рядом с 👍/👎) —
    // экономит строку на мобильном (см. practice.vue, speakBuilt())

    // Объяснение ошибки: сначала — целевая подсказка про конкретную
    // ошибку (🎯 артикль, le/les, предлог, форма глагола…), если она
    // однозначная; иначе — общий разбор шаблона (почему путают +
    // лайфхак + пример)
    .w-full(v-if="revealed && !isCorrect")
      .rounded-xl.text-left(class="p-2 bg-warning/10 border border-warning/30")
        p.text-sm(class="leading-snug" v-if="focusHint")
          | 🎯 {{ focusHint }}
        template(v-else-if="tip")
          p.text-sm(class="leading-snug")
            | 💡 <b>{{ t('practice.tipWhy') }}:</b> {{ tip.why }}
          p.text-sm(class="mt-0.5 leading-snug")
            | 🧠 <b>{{ t('practice.tipHack') }}:</b> {{ tip.hack }}
          p.text-sm(class="mt-0.5 leading-snug" v-if="tip.ex")
            | 💬 <b>{{ t('practice.tipEx') }}:</b> «{{ tip.ex.es }}» — {{ tip.ex.ru }}

    // Кнопка: до проверки — «Проверить», после — «Дальше» (на том же месте).
    // «Проверить»: тёмно-зелёный фон + ЯВНЫЙ белый текст — в обеих темах
    // контраст ≥ 4.5:1 (без text-white DaisyUI кладёт base-content: на
    // светлой теме тёмный текст на тёмно-зелёном сливается)
    button.btn.text-lg(
      :class="revealed ? 'btn-primary' : 'bg-green-800 text-white'"
      :disabled="!revealed && builtWords.length === 0"
      @click="revealed ? emit('next') : check()"
    ) {{ revealed ? t('practice.next') : t('practice.check') }}
</template>
