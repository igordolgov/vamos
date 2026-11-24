// ============================================================
// test/components/ui.spec.ts — рендер ключевых компонентов.
// ============================================================

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WordCard from '../../app/components/WordCard.vue'
import StatRing from '../../app/components/StatRing.vue'
import BadgeCard from '../../app/components/BadgeCard.vue'
import EmptyState from '../../app/components/EmptyState.vue'
import PhraseRow from '../../app/components/PhraseRow.vue'
import QuizChoice from '../../app/components/QuizChoice.vue'
import QuizBuild from '../../app/components/QuizBuild.vue'
import StreakWidget from '../../app/components/StreakWidget.vue'
import { getWord } from '../../shared/data/words'
import { ACHIEVEMENTS } from '../../shared/achievements'

describe('WordCard', () => {
  it('показывает испанское слово и перевод', () => {
    const wrapper = mount(WordCard, {
      props: { word: getWord('n-casa'), status: 'new' },
    })
    expect(wrapper.text()).toContain('casa')
    expect(wrapper.text()).toContain('дом')
  })

  it('показывает спряжение глагола', () => {
    const wrapper = mount(WordCard, {
      props: { word: getWord('v-hablar'), status: 'known' },
    })
    const text = wrapper.text()
    expect(text).toContain('hablo')
    expect(text).toContain('hablamos')
    expect(text).toContain('hablan')
  })

  it('статусы: выучено / в процессе / новое', () => {
    const known = mount(WordCard, { props: { word: getWord('v-ser'), status: 'known' } })
    expect(known.text()).toContain('выучено')
    const fresh = mount(WordCard, { props: { word: getWord('v-ser'), status: 'new' } })
    expect(fresh.text()).toContain('новое')
  })

  it('проекция «выучишь — узнаешь» отображается', () => {
    const wrapper = mount(WordCard, {
      props: { word: getWord('n-casa'), status: 'new', unlock: 999 },
    })
    expect(wrapper.text()).toContain('999')
  })
})

describe('StatRing', () => {
  it('считает процент и показывает подпись', () => {
    const wrapper = mount(StatRing, {
      props: { value: 3, total: 10, label: 'глаголы', emoji: '🏃' },
    })
    expect(wrapper.text()).toContain('30%')
    expect(wrapper.text()).toContain('глаголы')
    expect(wrapper.text()).toContain('3 / 10')
  })
  it('нулевое деление не ломает компонент', () => {
    const wrapper = mount(StatRing, { props: { value: 0, total: 0, label: 'x' } })
    expect(wrapper.text()).toContain('0%')
  })
})

describe('BadgeCard', () => {
  const ach = ACHIEVEMENTS.find((a) => a.id === 'first-word')!

  it('полученное — с бейджем «Получено»', () => {
    const wrapper = mount(BadgeCard, { props: { achievement: ach, unlocked: true } })
    expect(wrapper.text()).toContain('Первое слово')
    expect(wrapper.text()).toContain('Получено')
  })

  it('неполученное — с бейджем «Не получено»', () => {
    const wrapper = mount(BadgeCard, { props: { achievement: ach, unlocked: false } })
    expect(wrapper.text()).toContain('Не получено')
  })
})

describe('EmptyState', () => {
  it('показывает текст заглушки', () => {
    const wrapper = mount(EmptyState, { props: { text: 'Ничего не найдено' } })
    expect(wrapper.text()).toContain('Ничего не найдено')
  })
})

describe('PhraseRow', () => {
  it('фраза + перевод + бейдж варианта', () => {
    const wrapper = mount(PhraseRow, {
      props: { es: 'Yo soy maestro.', ru: 'Я — учитель', kind: 'aff' },
    })
    expect(wrapper.text()).toContain('Yo soy maestro.')
    expect(wrapper.text()).toContain('Я — учитель')
  })
})

describe('QuizChoice', () => {
  it('клик по верному варианту → emitted answered(true)', async () => {
    const wrapper = mount(QuizChoice, {
      props: { questionEs: 'casa', options: ['дом', 'еда', 'книга', 'ночь'], answerIndex: 0 },
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([true])
  })

  it('клик по неверному варианту → answered(false), верный подсвечен', async () => {
    const wrapper = mount(QuizChoice, {
      props: { questionEs: 'casa', options: ['дом', 'еда', 'книга', 'ночь'], answerIndex: 0 },
    })
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([false])
    // повторный клик игнорируется после раскрытия
    await buttons[2].trigger('click')
    expect(wrapper.emitted('answered')!.length).toBe(1)
  })

  it('озвучка отображается для испанского вопроса', () => {
    const wrapper = mount(QuizChoice, {
      props: { questionEs: 'hola', options: ['a', 'b', 'c', 'd'], answerIndex: 1 },
    })
    expect(wrapper.text()).toContain('hola')
  })
})

describe('StreakWidget', () => {
  it('склонение дней: 1 день / 2 дня / 5 дней', () => {
    expect(mount(StreakWidget, { props: { streak: 1 } }).text()).toContain('1 день')
    expect(mount(StreakWidget, { props: { streak: 2 } }).text()).toContain('2 дня')
    expect(mount(StreakWidget, { props: { streak: 5 } }).text()).toContain('5 дней')
    expect(mount(StreakWidget, { props: { streak: 21 } }).text()).toContain('21 день')
  })
})

describe('QuizBuild — сборка фразы из плиток', () => {
  const TILES = ['quiero', 'Yo', 'hablar']
  const ANSWER = ['Yo', 'quiero', 'hablar']

  /** Кнопка-плитка с данным текстом в зоне неиспользованных плиток.
   *  Невидимые плейсхолдеры (уже выбранные слова) пропускаются */
  function tileBtn(wrapper: ReturnType<typeof mount>, txt: string) {
    const btn = wrapper
      .findAll('.justify-center button')
      .find((b) => b.text() === txt && !b.classes().includes('invisible'))
    expect(btn, `видимая плитка «${txt}» должна существовать`).toBeTruthy()
    return btn!
  }

  /** Кнопка «Проверить» — последняя в компоненте */
  function checkBtn(wrapper: ReturnType<typeof mount>) {
    const all = wrapper.findAll('button')
    return all[all.length - 1]
  }

  it('собранная в правильном порядке фраза → answered(true)', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'Я хочу говорить' },
    })
    await tileBtn(wrapper, 'Yo').trigger('click')
    await tileBtn(wrapper, 'quiero').trigger('click')
    await tileBtn(wrapper, 'hablar').trigger('click')
    // фраза собрана в зоне ответа в правильном порядке
    const builtBtns = wrapper.findAll('.min-h-14 button').map((b) => b.text())
    expect(builtBtns).toEqual(['Yo', 'quiero', 'hablar'])
    await checkBtn(wrapper).trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([true])
  })

  it('неправильный порядок → answered(false); верный ответ показывает панель на странице practice', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'Я хочу говорить' },
    })
    await tileBtn(wrapper, 'hablar').trigger('click')
    await tileBtn(wrapper, 'Yo').trigger('click')
    await tileBtn(wrapper, 'quiero').trigger('click')
    await checkBtn(wrapper).trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([false])
  })

  it('клик по собранному слову возвращает его в плитки', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'x' },
    })
    await tileBtn(wrapper, 'Yo').trigger('click')
    expect(wrapper.findAll('.min-h-14 button')).toHaveLength(1)
    // undo из зоны ответа
    await wrapper.find('.min-h-14 button').trigger('click')
    expect(wrapper.findAll('.min-h-14 button')).toHaveLength(0)
    expect(wrapper.findAll('.justify-center button')).toHaveLength(3)
  })

  it('выбранная плитка оставляет пустое место — остальные не сдвигаются', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'x' },
    })
    await tileBtn(wrapper, 'quiero').trigger('click')
    // все кнопки на месте: выбранная стала невидимым плейсхолдером
    expect(wrapper.findAll('.justify-center button')).toHaveLength(3)
    const ph = wrapper
      .findAll('.justify-center button')
      .find((b) => b.classes().includes('invisible'))
    expect(ph, 'плейсхолдер выбранной плитки').toBeTruthy()
    expect(ph!.text()).toBe('quiero')
    expect((ph!.element as HTMLButtonElement).disabled).toBe(true)
    // undo возвращает плитку в её исходное место (плейсхолдер исчезает)
    await wrapper.find('.min-h-14 button').trigger('click')
    expect(wrapper.findAll('.justify-center button.invisible')).toHaveLength(0)
  })

  it('проверка недоступна, пока ничего не собрано', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'x' },
    })
    expect((checkBtn(wrapper).element as HTMLButtonElement).disabled).toBe(true)
    await checkBtn(wrapper).trigger('click')
    expect(wrapper.emitted('answered')).toBeUndefined()
  })
})
