// ============================================================
// test/unit/phrase-scan.spec.ts — скан качества русских переводов.
//
// 1. Исчерпывающая проверка всех именных групп (сущ. × определитель ×
//    прилагательное) в именительном и винительном падеже.
// 2. Систематический обход заполнений всех шаблонов фраз (все слова
//    «изучены») и проверка переводов на ошибки падежа/согласования:
//    «дешёвая музыку», «хорошяя», «мой музыка», «есть дешёвую музыку»,
//    «? идея» и т.п.
// ============================================================

import { describe, it, expect } from 'vitest'
import { TEMPLATES, npRuAcc } from '../../shared/phrases/templates'
import { walkFills, detWords } from '../../shared/phrases/engine'
import { ruDetForm, ruAdjForm, ruNounForm } from '../../shared/phrases/ru'
import { ALL_WORDS } from '../../shared/data/words'
import type { GramNumber, Word } from '../../shared/types'

const KNOWN = new Set(ALL_WORDS.map((w) => w.id))

/** «хорошяя», «высокяя» — твёрдая основа после к/г/х/ж/ш/щ/ч требует -ая */
const VELAR_YA = /[кгхжшщч]яя/

/** «большые», «плохые», «какые» — правило жи-ши: после к/г/х/ж/ш/ч/щ мн.ч. на -ие */
const VELAR_YS = /[кгхжшщч]ые/

/** пояснение в скобках не должно попадать в переводы: «дорогой (цена)».
 *  Разрешённые скобки — маркеры артиклей (жалоба: промпт «Учитель хочет
 *  маленький хлеб» отвечает и «El maestro…», и «Un maestro…»):
 *  «(вообще)» у gustar (el/la = «еда в принципе»),
 *  «(конкретный/ая/…)» у el/la и «(какой-то/какая-то/…)» у un/una */
const PARENS = /[()]/

const GENERAL_MARKER = '(вообще)'

const ARTICLE_HINT_MARKER = /\((?:вообще|конкретн[а-яё]*|как[а-яё]*-то)\)/gi

/** прилагательное в им.п. при существительном в вин.п.: «дешёвая музыку» */
const ADJ_NOM_ACC_NOUN = /[а-яё]+(?:ая|яя)\s+[а-яё]+[ую]\b/

/** определитель м.р. + прилагательное ж.р.: «мой красивая» */
const MASC_DET_FEM_ADJ = /\b(?:мой|твой|наш|этот|тот)\s+[а-яё]+(?:ая|яя)\b/

/** вин.п. после «есть» (нужен им.п.): «есть дешёвую музыку» */
const ACC_AFTER_EST = /\bесть\s+[а-яё]+(?:ую|юю)\b/

/** определитель м.р. + существительное ж./ср.р.: «мой музыка», «мой время» */
const MASC_DET_FEM_NOUN = /\b(?:мой|твой|наш|этот|тот)\s+([а-яё]+(?:а|я|о|е|мя))\b/

/** существительные м.р. на -а/-я («мой мужчина» — корректно) */
const MASC_NOUN_ON_A = new Set(['мужчина', 'папа', 'дядя', 'дедушка'])

/** незаполненная падежная аннотация: «думаю ? идея» */
const MISSING_CASE = /[а-яё] \? /

/** неисчисляемые без un/una и без мн.ч.; цвета × фильм/фото; comida/agua — массовые */
const BAD_ES =
  /una? (leche|azúcar|sal|arroz|comida|agua)|\b(leches|azúcares|arroces)\b|\b(dos|unas) sales\b|película (negra|blanca|roja|verde|azul|amarilla)|foto (negra|blanca|roja|verde|azul|amarilla)/i

const OTHER_GARBAGE = /undefined|NaN/

function checkRu(ru: string): string | null {
  if (VELAR_YA.test(ru)) return `твёрдая основа + «-яя»: «${ru}»`
  if (VELAR_YS.test(ru)) return `жи-ши: мн.ч. на «-ые» после к/г/х/ж/ш/ч/щ: «${ru}»`
  // маркер «(вообще)» и подсказки артиклей «(конкретный)»/«(какой-то)»
  // разрешены, остальные скобки — нет
  if (PARENS.test(ru.replaceAll(GENERAL_MARKER, '').replaceAll(ARTICLE_HINT_MARKER, ''))) {
    return `скобки в переводе: «${ru}»`
  }
  if (ADJ_NOM_ACC_NOUN.test(ru)) return `им.п. при вин.п.: «${ru}»`
  if (MASC_DET_FEM_ADJ.test(ru)) return `определитель м.р. + прил. ж.р.: «${ru}»`
  if (ACC_AFTER_EST.test(ru)) return `вин.п. после «есть»: «${ru}»`
  if (MISSING_CASE.test(ru)) return `нет падежной аннотации: «${ru}»`
  if (OTHER_GARBAGE.test(ru)) return `мусор в переводе: «${ru}»`
  const m = MASC_DET_FEM_NOUN.exec(ru)
  if (m && !MASC_NOUN_ON_A.has(m[1]!)) return `определитель м.р. + сущ. ж./ср.р.: «${ru}»`
  return null
}

// ============================================================
// 1. Исчерпывающий скан именных групп (все сущ. × определители × прил.)
// ============================================================

const NOUNS: Word[] = ALL_WORDS.filter((w) => w.pos === 'noun')
const ADJECTIVES: Word[] = ALL_WORDS.filter((w) => w.pos === 'adjective')
const DETS: Array<Word | null> = [null, ...detWords('object')]

/** Именительная группа (подлежащее / «есть» / «нравится»): det + adj + noun */
function npRuNom(noun: Word, det: Word | null, adj: Word | null): string {
  const g = noun.ruGender ?? 'm'
  const num: GramNumber = noun.ruPluralOnly ? 'pl' : 'sg'
  const parts: string[] = []
  if (det && !det.det?.definite && !det.det?.indefinite && !det.det?.quantity) {
    parts.push(ruDetForm(det, g, num))
  }
  if (adj) {
    const masc = adj.ruByClass?.[noun.nounClass ?? 'thing'] ?? (adj.ru[0] ?? adj.adj!.m)
    parts.push(ruAdjForm(masc, g, num))
  }
  parts.push(ruNounForm(noun, num))
  return parts.join(' ')
}

describe('Именные группы: падеж и согласование (исчерпывающе)', () => {
  it('ни одна именная группа не нарушает согласование', () => {
    const violations: string[] = []
    let checked = 0

    for (const noun of NOUNS) {
      for (const det of DETS) {
        for (const adj of [...ADJECTIVES, null]) {
          const fill: Record<string, Word | GramNumber | null> = {
            'x#noun': noun,
            'x#det': det,
            'x#adj': adj,
            'x#num': 'sg',
          }
          // винительный (дополнение транзитивного глагола)
          const acc = npRuAcc(fill, 'x')
          checked++
          const badAcc = checkRu(acc)
          if (badAcc) violations.push(`acc ${noun.es}/${det?.es ?? '∅'}/${adj?.es ?? '∅'}: ${badAcc}`)
          // именительный (подлежащее / «есть» / «нравится»)
          const nom = npRuNom(noun, det, adj)
          checked++
          const badNom = checkRu(nom)
          if (badNom) violations.push(`nom ${noun.es}/${det?.es ?? '∅'}/${adj?.es ?? '∅'}: ${badNom}`)
        }
      }
    }

    expect(violations.length, `${checked} групп проверено. Примеры:\n` + violations.slice(0, 30).join('\n')).toBe(0)
  })
})

// ============================================================
// 2. Скан русских переводов всех шаблонов фраз (обход заполнений)
// ============================================================

const MAX_LEAVES = 120_000

describe('Скан русских переводов всех шаблонов фраз', () => {
  it(
    'ни одна фраза не нарушает падеж/согласование',
    { timeout: 240_000 },
    () => {
      const violations: string[] = []
      let checked = 0

      for (const t of TEMPLATES) {
        checked += walkFills(t, KNOWN, (fill, kind) => {
          const bad = checkRu(t.ru(fill, kind))
          if (bad) violations.push(`[${t.id}] ${bad}`)
          const es = t.render(fill, kind)
          if (BAD_ES.test(es)) violations.push(`[${t.id}] недопустимое испанское: «${es}»`)
        }, { maxLeaves: MAX_LEAVES })
      }

      expect(
        violations.length,
        `проверено ${checked} фраз, ошибок ${violations.length}. Примеры:\n` + violations.slice(0, 40).join('\n'),
      ).toBe(0)
    },
    { timeout: 240_000 },
  )
})
