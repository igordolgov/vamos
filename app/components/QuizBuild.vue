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
// Плитки — компактные (маленькие паддинги, стандартное скругление
// кнопок DaisyUI — пилюли читаются хуже). Зона сборки изначально
// держит ДВЕ строки плиток (min-h-[102px]): фраза дорастает с одной
// строки до двух без сдвига кнопки — карточка не меняет размер.
// ============================================================
import { computed, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import type { WordTip } from '#shared/data/word-tips'
import { targetedHint } from '#shared/phrases/diff-hint'

const props = defineProps<{
  tiles: string[]
  answerTiles: string[]
  hint: string
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

/** Единый класс плитки-слова: компактная, со стандартным скруглением
 *  кнопок DaisyUI (rounded-field) — полные пилюли нечитабельны.
 *  Фиксированная высота h-10 (40px) при шрифте 16px (18px на sm+) —
 *  без зависимости от line-height и без растяжения по flex-stretch.
 *  Две строки плиток + перенос gap-1 (4px) + паддинг зоны сборки p-2
 *  (16px) + границы 2px = 102px — ровно резерв зоны сборки
 *  min-h-[102px]: кнопка не сдвигается никогда. Выбранная (и после
 *  проверки — вся пул) плитка остаётся пустым местом своего размера —
 *  слова не перепрыгивают */
const TILE = 'btn normal-case h-10 px-3 leading-none text-base sm:text-lg'

function tileClass(i: number): string {
  const base = `${TILE} btn-outline`
  return revealed.value || selected.value.includes(i)
    ? `${base} invisible pointer-events-none`
    : base
}

function pick(index: number) {
  if (revealed.value) return
  selected.value = [...selected.value, index]
}

function undo(index: number) {
  if (revealed.value) return
  selected.value = selected.value.filter((i) => i !== index)
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
 *  пальцем и вставляем до/после неё в зависимости от половины */
function reorderAt(x: number, y: number) {
  if (!drag || !buildZone.value) return
  for (const el of buildZone.value.querySelectorAll<HTMLElement>('[data-pos]')) {
    const pos = Number(el.dataset.pos)
    if (pos === drag.pos) continue
    const r = el.getBoundingClientRect()
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue
    const arr = [...selected.value]
    const [tile] = arr.splice(drag.pos, 1)
    const hovered = pos > drag.pos ? pos - 1 : pos
    const at = x < r.left + r.width / 2 ? hovered : hovered + 1
    arr.splice(at, 0, tile!)
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
  // pos — позиция в selected; undo ожидает индекс плитки в tiles
  undo(selected.value[pos]!)
}

/** Собранная фраза */
const built = computed(() => selected.value.map((i) => props.tiles[i]).join(' '))

/** Класс плитки в собранной фразе (та же пилюля): до проверки —
 *  обычная; после НЕверной проверки — подсветка позиций: зелёная
 *  плитка стоит на своём месте, красная — не на своём */
function builtClass(i: number): string {
  const base = TILE
  if (!revealed.value) return `${base} btn-primary`
  const pos = selected.value.indexOf(i)
  const expected = props.answerTiles[pos]?.toLowerCase()
  return `${base} ${props.tiles[i].toLowerCase() === expected ? 'btn-success' : 'btn-error'}`
}

/** Верно, если собран полный ответ без учёта регистра — точный или
 *  без подлежащего-местоимения, когда форма глагола однозначна.
 *  ВАЖНО: toLowerCase() со скобками — сравнение функции со строкой
 *  всегда false (баг «съеденных скобок» ломал проверку сборки). */
const isCorrect = computed(() => {
  const candidates = [props.answerTiles.join(' '), ...(props.altAnswers ?? [])]
  return candidates.some((c) => built.value.toLowerCase() === c.toLowerCase())
})

function check() {
  if (revealed.value || selected.value.length === 0) return
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
  const builtTokens = selected.value.map((i) => props.tiles[i])
  return targetedHint(builtTokens, props.answerTiles, props.altAnswers)
})
</script>

<template lang="pug">
.card.bg-base-100.shadow-lg.border.border-base-300.w-full
  .card-body(class="gap-2 sm:gap-3 p-3 sm:p-4")
    // Подсказка-перевод (задание)
    .text-center
      h2.text-xl.font-bold.text-base-content(class="sm:text-2xl") {{ hint }}

    // Собранная фраза: зона заранее держит ДВЕ строки плиток.
    // Расчёт резерва: 2 строки × 40px + перенос 4px + паддинг p-2 (16px)
    // + границы зоны 2px = 102px — фраза дорастает с 1 строки до 2 без
    // сдвига «Проверить/Дальше», карточка не меняет размер.
    // touch-none на плитках: вертикальное движение пальца — это
    // перетаскивание, а не прокрутка страницы (тащим в обе стороны)
    .border.border-dashed.border-base-300.rounded-2xl.p-2.flex.flex-wrap.gap-1.items-center(
      class="bg-base-200/50 min-h-[102px]"
      aria-label="Собранная фраза"
      ref="buildZone"
    )
      button(
        v-for="(i, pos) in selected"
        :key="i"
        :data-pos="pos"
        :class="[builtClass(i), dragPos === pos ? 'opacity-50 ring-2 ring-primary' : '']"
        class="touch-none select-none"
        @pointerdown="onBuiltPointerDown($event, pos)"
        @pointermove="onBuiltPointerMove"
        @pointerup="onBuiltPointerUp"
        @pointercancel="onBuiltPointerCancel"
        @click="onBuiltClick(pos)"
      )
        | {{ tiles[i] }}
      span(class="text-sm text-base-content/30" v-if="selected.length === 0") …

    // Пул плиток. После проверки кнопки остаются на местах, но невидимыми:
    // контейнер держит точную высоту пула, поэтому «Дальше» стоит ровно
    // там же, где была «Проверить». min-h-24 страхует фидбек с подписью
    // «Верный ответ:» и ответом на отдельных строках (до 2 строк текста).
    // items/content-start: плитки не растягиваются по высоте контейнера
    // (stretch по умолчанию при h-auto у плитки)
    .relative.min-h-24.flex.flex-wrap.gap-1.justify-center.items-start.content-start
      button(
        v-for="(tile, i) in tiles"
        :key="i"
        :class="tileClass(i)"
        :disabled="revealed || selected.includes(i)"
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

    // Объяснение ошибки: сначала — целевая подсказка про конкретную
    // ошибку (🎯 артикль, le/les, предлог, форма глагола…), если она
    // однозначная; иначе — общий разбор шаблона (почему путают +
    // лайфхак + пример)
    .w-full(v-if="revealed && !isCorrect")
      .rounded-xl.text-left(class="p-2.5 bg-warning/10 border border-warning/30")
        p.text-sm(class="leading-snug" v-if="focusHint")
          | 🎯 {{ focusHint }}
        template(v-else-if="tip")
          p.text-sm(class="leading-snug")
            | 💡 <b>{{ t('practice.tipWhy') }}:</b> {{ tip.why }}
          p.text-sm.mt-1(class="leading-snug")
            | 🧠 <b>{{ t('practice.tipHack') }}:</b> {{ tip.hack }}
          p.text-sm.mt-1(class="leading-snug" v-if="tip.ex")
            | 💬 <b>{{ t('practice.tipEx') }}:</b> «{{ tip.ex.es }}» — {{ tip.ex.ru }}

    // Кнопка: до проверки — «Проверить», после — «Дальше» (на том же месте)
    button.btn.text-lg(
      :class="revealed ? 'btn-primary' : 'bg-green-800'"
      :disabled="!revealed && selected.length === 0"
      @click="revealed ? emit('next') : check()"
    ) {{ revealed ? t('practice.next') : t('practice.check') }}
</template>
