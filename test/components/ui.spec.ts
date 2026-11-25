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

  it('неверный ответ: «Верный ответ:» и сам ответ — на отдельных строках', async () => {
    const wrapper = mount(QuizChoice, {
      props: { questionEs: 'casa', options: ['дом', 'еда', 'книга', 'ночь'], answerIndex: 0 },
    })
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([false])
    // подпись и ответ — два отдельных абзаца в зоне фидбека
    const fb = wrapper.find('.animate-feedback')
    const lines = fb.findAll('p')
    expect(lines).toHaveLength(2)
    expect(lines[0]!.text()).toContain('Верный ответ:')
    expect(lines[0]!.classes()).toContain('text-error')
    expect(lines[1]!.text()).toBe('дом')
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

  it('после ответа в карточке появляются результат и «Дальше» (emits next)', async () => {
    const wrapper = mount(QuizChoice, {
      props: { questionEs: 'casa', options: ['дом', 'еда', 'книга', 'ночь'], answerIndex: 0 },
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([true])
    // результат + «Дальше» под вариантами
    expect(wrapper.text()).toContain('¡Correcto!')
    expect(wrapper.find('.animate-feedback').exists()).toBe(true)
    const next = wrapper.findAll('button').at(-1)!
    expect(next.text()).toBe('Дальше')
    await next.trigger('click')
    expect(wrapper.emitted('next')).toBeTruthy()
  })

  it('зона результата зарезервирована до ответа — карточка не меняет размер', () => {
    const wrapper = mount(QuizChoice, {
      props: { questionEs: 'casa', options: ['дом', 'еда', 'книга', 'ночь'], answerIndex: 0 },
    })
    // зона фидбека существует и до ответа (пустая, постоянной высоты)
    expect(wrapper.find('.min-h-24').exists()).toBe(true)
    expect(wrapper.find('.animate-feedback').exists()).toBe(false)
    // «Дальше» уже в DOM (держит своё место), но невидима до ответа
    const next = wrapper.findAll('button').at(-1)!
    expect(next.text()).toBe('Дальше')
    expect(next.classes()).toContain('invisible')
    // клик по невидимой кнопке до ответа всё равно ведёт дальше (безвредно),
    // а после ответа кнопка становится видимой
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
    const builtBtns = wrapper.findAll('[aria-label="Собранная фраза"] button').map((b) => b.text())
    expect(builtBtns).toEqual(['Yo', 'quiero', 'hablar'])
    // зона сборки заранее держит ДВЕ строки плиток (резерв 102px):
    // кнопка «Проверить/Дальше» не сдвигается, когда фраза растёт с 1 до 2 строк
    const area = wrapper.find('[aria-label="Собранная фраза"]')
    expect(area.exists()).toBe(true)
    expect(area.classes()).toContain('rounded-2xl')
    // плитки — компактные, со стандартным скруглением DaisyUI
    // (НЕ пилюли rounded-full — их трудно читать), высота 40px
    // (две строки = ровно резерв 102px), паддинги меньше btn-lg
    const tile = area.findAll('button')[0]!
    expect(tile.classes()).not.toContain('rounded-full')
    expect(tile.classes()).toContain('h-10')
    expect(tile.classes()).toContain('px-3')
    expect(tile.classes()).not.toContain('btn-lg')
    await checkBtn(wrapper).trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([true])
  })

  it('неправильный порядок → answered(false) и показ верного ответа на месте плиток', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'Я хочу говорить' },
    })
    await tileBtn(wrapper, 'hablar').trigger('click')
    await tileBtn(wrapper, 'Yo').trigger('click')
    await tileBtn(wrapper, 'quiero').trigger('click')
    await checkBtn(wrapper).trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([false])
    // верный порядок показан в фидбеке (поверх невидимого пула плиток)
    expect(wrapper.text()).toContain('Yo quiero hablar')
    const fb = wrapper.find('.animate-feedback')
    expect(fb.exists()).toBe(true)
    // подпись «Верный ответ:» — отдельная строка, красная
    const label = fb.findAll('p')[0]!
    expect(label.classes()).toContain('text-error')
    expect(label.text()).toContain('Верный ответ:')
    // пул плиток остаётся в DOM (держит высоту для «Дальше»), но невидим
    const pool = wrapper.findAll('button.btn-outline')
    expect(pool.length).toBe(3)
    expect(pool.every((b) => b.classes().includes('invisible'))).toBe(true)
  })

  it('принимает ответ без подлежащего-местоимения («Eres alto»)', async () => {
    // Ответ «Tú eres alto»: форма eres однозначна — местоимение опускается
    const wrapper = mount(QuizBuild, {
      props: {
        tiles: ['tú', 'eres', 'alto', 'en'],
        answerTiles: ['Tú', 'eres', 'alto'],
        altAnswers: ['eres alto'],
        hint: 'Ты высокий',
      },
    })
    await tileBtn(wrapper, 'eres').trigger('click')
    await tileBtn(wrapper, 'alto').trigger('click')
    await checkBtn(wrapper).trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([true])
  })

  it('после проверки кнопка становится «Дальше» и emits next', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'x' },
    })
    await tileBtn(wrapper, 'Yo').trigger('click')
    await tileBtn(wrapper, 'quiero').trigger('click')
    await tileBtn(wrapper, 'hablar').trigger('click')
    const btn = checkBtn(wrapper)
    expect(btn.text()).toBe('Проверить')
    await btn.trigger('click')
    expect(wrapper.emitted('answered')).toBeTruthy()
    // кнопка на том же месте — теперь «Дальше»
    const next = checkBtn(wrapper)
    expect(next.text()).toBe('Дальше')
    expect(next.classes()).toContain('btn-primary')
    await next.trigger('click')
    expect(wrapper.emitted('next')).toBeTruthy()
  })

  it('фидбек после проверки — крупный, поверх пула, с анимацией', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'x' },
    })
    await tileBtn(wrapper, 'Yo').trigger('click')
    await tileBtn(wrapper, 'quiero').trigger('click')
    await tileBtn(wrapper, 'hablar').trigger('click')
    await checkBtn(wrapper).trigger('click')
    const fb = wrapper.find('.animate-feedback')
    expect(fb.find('p').classes()).toContain('text-success')
    expect(fb.text()).toContain('¡Correcto!')
    // фидбек лежит в absolute-контейнере поверх невидимого пула
    expect(fb.element.parentElement!.className).toContain('absolute')
  })

  it('клик по собранному слову возвращает его в плитки', async () => {
    const wrapper = mount(QuizBuild, {
      props: { tiles: TILES, answerTiles: ANSWER, hint: 'x' },
    })
    await tileBtn(wrapper, 'Yo').trigger('click')
    expect(wrapper.findAll('[aria-label="Собранная фраза"] button')).toHaveLength(1)
    // undo из зоны ответа
    await wrapper.find('[aria-label="Собранная фраза"] button').trigger('click')
    expect(wrapper.findAll('[aria-label="Собранная фраза"] button')).toHaveLength(0)
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
    await wrapper.find('[aria-label="Собранная фраза"] button').trigger('click')
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

  it('ошибка-правило: целевая подсказка (🎯) вместо общего tip', async () => {
    // Собрано без артикля «la» — подсказка должна быть именно про артикль
    const wrapper = mount(QuizBuild, {
      props: {
        tiles: ['mujer', 'come', 'pan'],
        answerTiles: ['La', 'mujer', 'come', 'pan'],
        hint: 'Женщина ест хлеб',
        tip: { why: 'ОБЩИЙ РАЗБОР ШАБЛОНА', hack: 'общий лайфхак' },
      },
    })
    await tileBtn(wrapper, 'mujer').trigger('click')
    await tileBtn(wrapper, 'come').trigger('click')
    await tileBtn(wrapper, 'pan').trigger('click')
    await checkBtn(wrapper).trigger('click')
    expect(wrapper.emitted('answered')![0]).toEqual([false])
    const text = wrapper.text()
    expect(text).toContain('🎯')
    expect(text).toMatch(/артикл/i)
    expect(text).toContain('la mujer')
    // общий tip скрыт — подсказка целевая
    expect(text).not.toContain('ОБЩИЙ РАЗБОР ШАБЛОНА')
  })

  it('две ошибки: целевой подсказки нет — общий tip показывается', async () => {
    const wrapper = mount(QuizBuild, {
      props: {
        tiles: ['tengo', 'la', 'ropa', 'vieja'],
        answerTiles: ['Tengo', 'ropa'],
        hint: 'У меня есть одежда',
        tip: { why: 'ОБЩИЙ РАЗБОР ШАБЛОНА', hack: 'общий лайфхак' },
      },
    })
    await tileBtn(wrapper, 'tengo').trigger('click')
    await tileBtn(wrapper, 'la').trigger('click')
    await tileBtn(wrapper, 'ropa').trigger('click')
    await tileBtn(wrapper, 'vieja').trigger('click')
    await checkBtn(wrapper).trigger('click')
    const text = wrapper.text()
    expect(text).not.toContain('🎯')
    expect(text).toContain('💡')
    expect(text).toContain('ОБЩИЙ РАЗБОР ШАБЛОНА')
  })
})
