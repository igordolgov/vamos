// ============================================================
// test/unit/data.spec.ts — валидация словаря.
// Словарь — «живые данные» приложения: ошибка в нём ломает фразы.
// ============================================================

import { describe, it, expect } from 'vitest'
import { ALL_WORDS, WORD_COUNT, WORDS_BY_ID, POS_LABELS } from '../../shared/data/words'
import { LESSONS } from '../../shared/data/lessons'
import { WORD_TIPS, PHRASE_TIPS } from '../../shared/data/word-tips'
import { allTemplates } from '../../shared/phrases/templates'
import type { PartOfSpeech } from '../../shared/types'

describe('Словарь', () => {
  it('содержит ~313 слов', () => {
    expect(WORD_COUNT).toBe(ALL_WORDS.length)
    expect(WORD_COUNT).toBeGreaterThanOrEqual(300)
    expect(WORD_COUNT).toBeLessThanOrEqual(330)
  })

  it('идентификаторы уникальны', () => {
    const ids = ALL_WORDS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('все слова имеют перевод и урок', () => {
    for (const w of ALL_WORDS) {
      expect(w.id, w.id).toBeTruthy()
      expect(w.es, w.id).toBeTruthy()
      expect(w.ru.length, w.id).toBeGreaterThan(0)
      expect(w.lesson, w.id).toBeGreaterThanOrEqual(1)
      expect(w.lesson, w.id).toBeLessThanOrEqual(LESSONS.length)
    }
  })

  it('уроки в данных совпадают с LESSONS', () => {
    const lessonsWithData = new Set(ALL_WORDS.map((w) => w.lesson))
    expect(lessonsWithData.size).toBe(LESSONS.length)
    for (const l of LESSONS) {
      expect(lessonsWithData.has(l.number), 'урок ' + l.number).toBe(true)
    }
  })

  it('существительные: род, мн.ч., класс', () => {
    for (const w of ALL_WORDS.filter((w) => w.pos === 'noun')) {
      expect(['m', 'f'], w.id).toContain(w.gender)
      expect(w.nounPlural, w.id).toBeTruthy()
      expect(w.nounClass, w.id).toBeTruthy()
    }
  })

  it('глаголы: 5 испанских форм, 6 русских (кроме ser/estar/gustar)', () => {
    for (const w of ALL_WORDS.filter((w) => w.pos === 'verb')) {
      expect(Object.keys(w.verb!.forms).length, w.id).toBe(5)
      const noRuForms = ['v-ser', 'v-estar', 'v-gustar']
      if (!noRuForms.includes(w.id)) {
        expect(w.verb!.ruForms?.length, w.id).toBe(6)
        expect(w.verb!.ruInf, w.id).toBeTruthy()
      }
    }
  })

  it('транзитивные глаголы с дополнением имеют семантику objClasses', () => {
    for (const w of ALL_WORDS.filter((w) => w.verb?.transitive)) {
      // hablo español обрабатывается отдельным шаблоном — исключение
      if (w.id === 'v-hablar') continue
      expect((w.verb!.objClasses?.length ?? 0) > 0 || PERSON_VERBS.has(w.id), w.id).toBe(true)
    }
  })

  it('прилагательные: 4 формы согласования', () => {
    for (const w of ALL_WORDS.filter((w) => w.pos === 'adjective')) {
      expect(w.adj?.m, w.id).toBeTruthy()
      expect(w.adj?.f, w.id).toBeTruthy()
      expect(w.adj?.mp, w.id).toBeTruthy()
      expect(w.adj?.fp, w.id).toBeTruthy()
    }
  })

  it('русский род определён у всех существительных', () => {
    for (const w of ALL_WORDS.filter((w) => w.pos === 'noun')) {
      expect(['m', 'f', 'n'], w.id).toContain(w.ruGender)
    }
  })

  it('местоимения-подлежащие имеют лицо и рус. генитив', () => {
    for (const w of ALL_WORDS.filter((w) => w.pronoun?.role === 'subject')) {
      expect(w.pronoun!.person, w.id).toBeTruthy()
      expect(w.pronoun!.ruGen, w.id).toBeTruthy()
    }
  })

  it('быстрый индекс по id согласован', () => {
    expect(Object.keys(WORDS_BY_ID).length).toBe(WORD_COUNT)
    expect(WORDS_BY_ID['v-ser'].es).toBe('ser')
  })

  it('названия частей речи полные для всех POS', () => {
    const posList = ALL_WORDS.map((w) => w.pos)
    for (const pos of new Set(posList) as Set<PartOfSpeech>) {
      expect(POS_LABELS[pos], pos).toBeTruthy()
    }
  })
})

describe('Подсказки ошибок (word-tips)', () => {
  it('ключи WORD_TIPS существуют в словаре', () => {
    for (const id of Object.keys(WORD_TIPS)) {
      expect(WORDS_BY_ID[id], id).toBeTruthy()
    }
  })

  it('ключи PHRASE_TIPS существуют среди шаблонов фраз', () => {
    const templateIds = new Set(allTemplates().map((t) => t.id))
    for (const id of Object.keys(PHRASE_TIPS)) {
      expect(templateIds.has(id), id).toBe(true)
    }
  })

  it('у каждой подсказки есть «почему» и «лайфхак»', () => {
    for (const [id, tip] of [...Object.entries(WORD_TIPS), ...Object.entries(PHRASE_TIPS)]) {
      expect(tip.why.length, id).toBeGreaterThanOrEqual(10)
      expect(tip.hack.length, id).toBeGreaterThanOrEqual(5)
    }
  })
})

// Глаголы с личным «a» — дополнение-лицо
const PERSON_VERBS = new Set(['v-ver', 'v-ayudar', 'v-llamar', 'v-conocer', 'v-esperar', 'v-buscar'])
