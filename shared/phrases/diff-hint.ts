// ============================================================
// shared/phrases/diff-hint.ts — целевая подсказка при неверной
// сборке фразы.
//
// Общий tip шаблона («почему путают + лайфхак») полезен, но не
// отвечает на вопрос «ЧТО именно я сделал не так?». Здесь сравнивается
// собранная фраза с правильным ответом, и если ошибка однозначная —
// одна вставка / одна замена / одна перестановка — возвращается
// объяснение именно этого правила:
//
//   артикль        — пропущен, лишний, не тот род/число/определённость;
//   le/les         — получатель действия (dar, escribir, decir, gustar);
//                    lo/la — прямое дополнение, получателем не бывает;
//   контракция     — a + el = al, de + el = del;
//   личное «a»     — перед дополнением-человеком;
//   предлог        — en/con/sin/para/sobre…;
//   «no» и «que»   — позиция отрицания, связка hay que;
//   форма глагола  — согласование с подлежащим (son/es, tiene/tienen);
//   местоимение    — лишнее подлежащее опускается, es/son требует его;
//   порядок слов   — слова верные, но перемешаны.
//
// Если ошибок несколько или ошибка словарная (не то слово) —
// возвращается null: компонент показывает общий tip шаблона.
// ============================================================

import type { VerbPerson, Word } from '../types'
import { wordsByPos } from '../data/words'
import { bareAllowed } from './engine'

// ============================================================
// Словари токенов
// ============================================================

/** Артикль → род/число/определённость (по токену из фразы) */
export interface ArticleInfo {
  def: boolean
  gender: 'm' | 'f'
  number: 'sg' | 'pl'
}

const ARTICLE_INFO: Record<string, ArticleInfo> = {
  el: { def: true, gender: 'm', number: 'sg' },
  la: { def: true, gender: 'f', number: 'sg' },
  los: { def: true, gender: 'm', number: 'pl' },
  las: { def: true, gender: 'f', number: 'pl' },
  un: { def: false, gender: 'm', number: 'sg' },
  una: { def: false, gender: 'f', number: 'sg' },
  unos: { def: false, gender: 'm', number: 'pl' },
  unas: { def: false, gender: 'f', number: 'pl' },
}

/** Притяжательные / указательные / количество: токен → перевод */
const DET_TOKEN_RU: Record<string, string> = {
  mi: 'мой', mis: 'мои', tu: 'твой', tus: 'твои',
  su: 'его/её/ваш', sus: 'их/ваш (мн.)',
  nuestro: 'наш', nuestra: 'наша', nuestros: 'наши', nuestras: 'наши',
  este: 'этот', esta: 'эта', estos: 'эти', estas: 'эти',
  ese: 'тот', esa: 'та', esos: 'те', esas: 'те',
  mucho: 'много', mucha: 'много', muchos: 'много', muchas: 'много',
  poco: 'мало', poca: 'мало', pocos: 'мало', pocas: 'мало',
}

const QUANT = new Set(['mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'pocos', 'pocas'])

/** Местоимения-дополнения: косвенные (получатель) и прямые */
const IO_SET = new Set(['me', 'te', 'le', 'les', 'nos'])
const DO_SET = new Set(['lo', 'la', 'los', 'las'])

/** Подлежащие-местоимения */
const SUBJ_SET = new Set(['yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'ustedes', 'ellos', 'ellas'])

/** Глоссарий местоимений (без словарных поисков — детерминированно) */
const PRON_RU: Record<string, string> = {
  me: 'мне/меня', te: 'тебе', le: 'ему/ей', les: 'им', nos: 'нам/нас',
  lo: 'его', la: 'её', los: 'их (м.р.)', las: 'их (ж.р.)',
  yo: 'я', tú: 'ты', él: 'он', ella: 'она', usted: 'Вы (вежл.)',
  nosotros: 'мы', ustedes: 'Вы (мн. ч.)', ellos: 'они', ellas: 'они',
}

/** Глоссарий предлогов */
const PREP_RU: Record<string, string> = {
  a: 'к/в', de: 'из/от', en: 'в/на', con: 'с',
  para: 'для/чтобы', sin: 'без', sobre: 'о/на', por: 'по/через',
}

/** Лица для объяснения формы глагола */
const PERSON_RU: Record<VerbPerson, string> = {
  '1s': '«я»', '2s': '«ты»', '3s': '«он/она/вы»', '1p': '«мы»', '2p': '«вы (vosotros)»', '3p': '«они/вы (мн.)»',
}

/** Индекс форм глаголов: токен → глагол + лицо. Строится один раз. */
const VERB_FORMS: Map<string, { verb: Word; person: VerbPerson }> = (() => {
  const m = new Map<string, { verb: Word; person: VerbPerson }>()
  for (const v of wordsByPos('verb')) {
    for (const p of ['1s', '2s', '3s', '1p', '2p', '3p'] as VerbPerson[]) {
      const f = v.verb?.forms[p]
      if (f && !m.has(f)) m.set(f, { verb: v, person: p })
    }
  }
  return m
})()

const NOUNS: Word[] = wordsByPos('noun')

// ============================================================
// Словарный индекс: испанская форма (любая) → слово словаря.
// Нужен для СЛОВАРНЫХ ошибок («не то слово»): раньше замена
// существительного/наречия/прилагательного не классифицировалась
// (null) — пользователь видел только общий tip шаблона, а не
// подсказку про СВОЮ ошибку.
// ============================================================

/** Все формы слова: базовая, альтернативы, спряжения глагола,
 *  род/число прилагательного и местоимения, мн.ч. существительного */
function allWordForms(w: Word): string[] {
  const out = [w.es, ...(w.esAlt ?? [])]
  if (w.verb) out.push(...Object.values(w.verb.forms))
  if (w.adj) out.push(w.adj.m, w.adj.f, w.adj.mp, w.adj.fp)
  if (w.pronoun?.forms)
    out.push(w.pronoun.forms.m, w.pronoun.forms.f, w.pronoun.forms.mp, w.pronoun.forms.fp)
  if (w.nounPlural) out.push(w.nounPlural)
  return out.map((s) => s.toLowerCase()).filter(Boolean)
}

/** Индекс «форма → слова» строится один раз (словарь статичен) */
const TOKEN_WORDS: Map<string, Word[]> = (() => {
  const m = new Map<string, Word[]>()
  for (const w of wordsByPos('noun'))
    for (const f of allWordForms(w)) {
      const list = m.get(f)
      if (list) list.push(w)
      else m.set(f, [w])
    }
  for (const pos of ['verb', 'adjective', 'adverb', 'pronoun', 'determiner', 'preposition', 'question', 'conjunction', 'number', 'construction'] as const) {
    for (const w of wordsByPos(pos))
      for (const f of allWordForms(w)) {
        const list = m.get(f)
        if (list) list.push(w)
        else m.set(f, [w])
      }
  }
  return m
})()

/** Слово по испанской форме (первое в словаре) */
function tokenWord(token: string): Word | undefined {
  return TOKEN_WORDS.get(token.toLowerCase())?.[0]
}

/** Названия частей речи для словарных подсказок */
const POS_RU: Partial<Record<Word['pos'], string>> = {
  noun: 'существительное', verb: 'глагол', adjective: 'прилагательное',
  adverb: 'наречие', pronoun: 'местоимение', determiner: 'артикль/определитель',
  preposition: 'предлог', question: 'вопросительное слово', conjunction: 'союз',
  number: 'числительное', construction: 'конструкция',
}

/** Существительное по испанскому токену (ед.ч. или форма мн.ч.) */
function nounByToken(token: string): Word | undefined {
  if (!token) return undefined
  return NOUNS.find((w) => w.es === token || w.nounPlural === token)
}

function isPersonWord(w: Word | undefined): boolean {
  return !!w && (w.nounClass === 'person' || w.nounClass === 'family')
}

function isDetToken(t: string): boolean {
  return !!ARTICLE_INFO[t] || !!DET_TOKEN_RU[t]
}

// ============================================================
// Выравнивание: минимальная правка (Левенштейн с разбором операций)
// ============================================================

interface EditOp {
  kind: 'ins' | 'del' | 'sub'
  /** позиция лишнего токена в built (del/sub) */
  bi?: number
  /** позиция пропущенного токена в ответе (ins/sub) */
  ai?: number
}

function editScript(b: string[], a: string[]): { dist: number; ops: EditOp[] } {
  const n = b.length
  const m = a.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i]![0] = i
  for (let j = 0; j <= m; j++) dp[0]![j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i]![j] = Math.min(
        dp[i - 1]![j - 1]! + (b[i - 1] === a[j - 1] ? 0 : 1),
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
      )
    }
  }
  // Обратный проход: собираем операции минимальной правки
  const ops: EditOp[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && b[i - 1] === a[j - 1] && dp[i]![j] === dp[i - 1]![j - 1]) {
      i--
      j--
      continue
    }
    if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      ops.push({ kind: 'sub', bi: i - 1, ai: j - 1 })
      i--
      j--
      continue
    }
    if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      ops.push({ kind: 'del', bi: i - 1 })
      i--
      continue
    }
    ops.push({ kind: 'ins', ai: j - 1 })
    j--
  }
  ops.reverse()
  return { dist: dp[n]![m]!, ops }
}

function sameMultiset(x: string[], y: string[]): boolean {
  if (x.length !== y.length) return false
  const sx = [...x].sort()
  const sy = [...y].sort()
  return sx.every((s, i) => s === sy[i])
}

// ============================================================
// Классификация одиночных правок
// ============================================================

/** Подсказка про получателя: le/les vs lo/la/… (правило получателя) */
function ioSubHint(bt: string, at: string): string {
  const bothIO = IO_SET.has(bt) && IO_SET.has(at)
  if (bothIO && (bt === 'le' || bt === 'les') && (at === 'le' || at === 'les')) {
    return '«le» — одному получателю (ему/ей/вам), «les» — нескольким (им). Получатель ставится ПЕРЕД глаголом: «Le escribo una carta» — «пишу ему письмо».'
  }
  if (at === 'le' || at === 'les') {
    return `Получатель действия («кому?») — «${at}»: Le doy el libro — «даю ЕМУ книгу». Так работают dar, escribir, decir, gustar… А «${bt}» (${PRON_RU[bt] ?? bt}) — прямое дополнение («что?»), получателя оно не выражает.`
  }
  return `me — «мне/меня», te — «тебе», le — «ему/ей», nos — «нам», les — «им». По переводу здесь нужен «${at}» (${PRON_RU[at] ?? at}).`
}

/** Артикли/определители: замена одного на другой */
function detSubHint(bt: string, at: string, a: string[], ai: number, b: string[], bi: number): string {
  const ab = ARTICLE_INFO[bt]
  const aa = ARTICLE_INFO[at]
  const nounTok = a[ai + 1] ?? b[bi + 1] ?? ''
  const np = nounTok ? `${at} ${nounTok}` : at
  if (ab && aa) {
    if (ab.def !== aa.def) {
      return `Определённый артикль («el/la» — «тот самый») и неопределённый («un/una» — «какой-то/один») — не взаимозаменяемы. По переводу здесь «${np}».`
    }
    if (ab.number !== aa.number) {
      return `Артикль согласуется в числе с существительным: мн.ч. → «${np}».`
    }
    const noun = nounByToken(nounTok)
    if (noun?.gender) {
      const trap =
        noun.articleGender && noun.articleGender !== noun.gender
          ? ' (ж.р. с ударного «а-» берёт «el»: el agua, el mapa)'
          : ''
      return `Артикль согласуется в роде: «${nounTok}» — ${noun.gender === 'f' ? 'ж.р.' : 'м.р.'}${trap} → «${np}».`
    }
    return `Артикль согласуется с существительным в роде и числе: «${np}».`
  }
  if (QUANT.has(bt) && QUANT.has(at)) {
    return `Количество согласуется с существительным в роде и числе: «${np}» (mucha — ж.р., muchos/muchas — мн.ч.).`
  }
  const ruA = DET_TOKEN_RU[at]
  const ruB = DET_TOKEN_RU[bt]
  if (ruA && ruB) return `«${bt}» — это «${ruB}», а по переводу нужно «${at}» — «${ruA}».`
  if (ruA) {
    return `В переводе есть «${ruA}» — нужен определитель «${at}», а не артикль «${bt}». Артикль рядом с ним не ставится: «${np}».`
  }
  if (ruB) return `Определитель «${bt}» («${ruB}») здесь не подходит — по переводу нужен «${at}»: «${np}».`
  return `Здесь нужен «${at}», а не «${bt}»: «${np}».`
}

/** Замена токена */
function classifySub(bt: string, at: string, a: string[], ai: number, b: string[], bi: number): string | null {
  // le/les ↔ lo/la/… — правило получателя (dar, escribir, decir, gustar)
  if ((IO_SET.has(at) && (IO_SET.has(bt) || DO_SET.has(bt))) || (IO_SET.has(bt) && DO_SET.has(at))) {
    return ioSubHint(bt, at)
  }
  if (isDetToken(bt) && isDetToken(at)) return detSubHint(bt, at, a, ai, b, bi)
  const vb = VERB_FORMS.get(bt)
  const va = VERB_FORMS.get(at)
  if (vb && va) {
    if (vb.verb.id === va.verb.id) {
      return `Форма глагола зависит от того, кто делает: «${at}» — ${PERSON_RU[va.person]}. «${bt}» — ${PERSON_RU[vb.person]}. Глагол «${vb.verb.es}» (${vb.verb.ru[0] ?? ''}) согласуется с подлежащим.`
    }
    return `По переводу нужен глагол «${at}» (${va.verb.ru[0] ?? ''}), а не «${bt}» (${vb.verb.ru[0] ?? ''}).`
  }
  // СЛОВАРНАЯ замена («не то слово»): оба токена известны словарю —
  // объясняем, какое слово нужно и почему вставленное не подходит
  const wa = tokenWord(at)
  const wb = tokenWord(bt)
  if (wa && wb) {
    if (wa.pos === 'preposition' && wb.pos === 'preposition') {
      return `По переводу здесь нужен предлог «${at}» (${PREP_RU[at] ?? wa.ru[0] ?? ''}), а не «${bt}» (${PREP_RU[bt] ?? wb.ru[0] ?? ''}).`
    }
    if (wa.pos === 'verb' && wb.pos !== 'verb') {
      return `«${bt}» (${wb.ru[0] ?? bt}) — ${POS_RU[wb.pos] ?? 'не глагол'}, а по переводу здесь глагол: «${at}» (${wa.ru[0] ?? at}).`
    }
    if (wb.pos === 'verb' && wa.pos !== 'verb') {
      return `«${bt}» — глагол («${wb.ru[0] ?? bt}»), а по переводу здесь ${POS_RU[wa.pos] ?? 'другое слово'}: «${at}» (${wa.ru[0] ?? at}).`
    }
    return `По переводу нужно слово «${at}» (${wa.ru.join(', ')}), а не «${bt}» (${wb.ru.join(', ')}).`
  }
  if (wa) return `По переводу здесь нужно слово «${at}» (${wa.ru.join(', ')}) — «${bt}» не подходит.`
  return null
}

/** Первый следующий токен-существительное (перепрыгивая артикли) */
function nextNoun(a: string[], from: number): Word | undefined {
  for (let j = from; j < a.length; j++) {
    const w = nounByToken(a[j]!)
    if (w) return w
  }
  return undefined
}

/** Вставка (в ответе есть токен, в сборке его нет) */
function classifyIns(at: string, a: string[], ai: number): string | null {
  if (IO_SET.has(at)) {
    return `Не хватает «${at}» (${PRON_RU[at]}) — это получатель действия («кому?»). Он ставится ПЕРЕД глаголом: Le doy el libro — «я даю ему книгу». С dar/escribir/decir получатель обязателен, если в переводе есть «кому».`
  }
  if (ARTICLE_INFO[at]) {
    const info = ARTICLE_INFO[at]!
    const nounTok = a[ai + 1] ?? ''
    const noun = nounByToken(nounTok)
    if (info.def) {
      // gustar: «нравится рис» → Me gusta EL arroz — то, что нравится,
      // подлежащее и несёт артикль (еда вообще); жалоба пользователя
      const prev = ai > 0 ? a[ai - 1] : undefined
      if (prev === 'gusta' || prev === 'gustan') {
        return `То, что нравится, — подлежащее и стоит с артиклем: «${at} ${nounTok}». Me gusta el arroz — «нравится рис» (еда вообще); «Me gusta arroz» — ошибка.`
      }
      const gender = noun?.gender ? ` («${nounTok}» — ${noun.gender === 'f' ? 'ж.р.' : 'м.р.'})` : ''
      return `Существительное в испанском почти не обходится без артикля: нужен «${at} ${nounTok}» — определённый артикль «тот самый»${gender}.`
    }
    return `В переводе «какой-то/несколько» — нужен неопределённый артикль: «${at} ${nounTok}».`
  }
  if (DET_TOKEN_RU[at]) {
    return `В переводе есть «${DET_TOKEN_RU[at]}» — нужен определитель «${at}».`
  }
  if (at === 'a') {
    const next = nextNoun(a, ai + 1)
    if (isPersonWord(next)) {
      return 'Перед дополнением-человеком нужен предлог «a»: Veo a la maestra — «вижу учительницу». Перед вещами «a» не ставится.'
    }
    return `Не хватает предлога «a» (${PREP_RU.a}).`
  }
  if (at === 'al' || at === 'del') {
    return `Не хватает «${at}» — это слияние: ${at === 'al' ? 'a + el = al' : 'de + el = del'} («${at} banco»). В испанском a и de всегда сливаются с «el».`
  }
  if (at === 'no') {
    return 'Не хватает «no» — отрицание ставится ПЕРЕД глаголом (и перед le/les): No le doy el libro.'
  }
  if (at === 'que') {
    return 'Нужен «que»: конструкция «hay que + инфинитив» — «надо что-то делать».'
  }
  if (PREP_RU[at]) {
    return `Не хватает предлога «${at}» (${PREP_RU[at]}): испанский глагол часто требует предлог, которого нет в русском.`
  }
  if (SUBJ_SET.has(at)) {
    return `Здесь нужно местоимение «${at}» (${PRON_RU[at] ?? at}): по форме глагола не понять, кто делает — она одинакова для él/ella/usted.`
  }
  const v = VERB_FORMS.get(at)
  if (v) {
    return `Пропущен глагол: «${at}» (${v.verb.ru[0] ?? ''}). В испанском предложении глагол обязателен.`
  }
  // Словарный fallback: пропущено известное слово (существительное,
  // прилагательное, наречие…) — раньше возвращался null и показывался
  // общий tip вместо объяснения КОНКРЕТНОЙ ошибки
  const w = tokenWord(at)
  if (w) {
    if (w.pos === 'noun') {
      return `Пропущено существительное «${at}» (${w.ru.join(', ')}): в переводе есть «${w.ru[0]}» — во фразе это слово должно стоять.`
    }
    if (w.pos === 'adjective') {
      return `Пропущено прилагательное «${at}» (${w.ru.join(', ')}): в переводе есть «${w.ru[0]}». Прилагательное ставится ПОСЛЕ существительного и согласуется с ним в роде и числе.`
    }
    return `Пропущено слово «${at}» (${w.ru.join(', ')}): в переводе есть «${w.ru[0]}».`
  }
  return null
}

/** Лишний токен (в сборке есть, в ответе нет) */
function classifyDel(bt: string, b: string[], bi: number): string | null {
  if (IO_SET.has(bt)) {
    return `«${bt}» (${PRON_RU[bt]}) — только когда есть получатель («кому?»). В этой фразе получателя нет — местоимение лишнее.`
  }
  if (SUBJ_SET.has(bt)) {
    return 'Местоимение-подлежащее обычно опускают: форма глагола сама говорит, кто делает — «(Yo) tengo un gato». В этом задании фраза собирается без него.'
  }
  if (bt === 'a') {
    return 'Личное «a» нужно только перед людьми: Veo a la maestra, но Veo la película. Здесь дополнение — не человек.'
  }
  if (bt === 'no') {
    return 'Здесь отрицание не нужно — перевод утвердительный. «no» ставится только перед глаголом в отрицании.'
  }
  if (ARTICLE_INFO[bt]) {
    const prev = bi > 0 ? b[bi - 1] : undefined
    const nextTok = b[bi + 1] ?? ''
    const nounTok = nextTok
    if (isDetToken(nextTok)) {
      // «la mi casa» — артикль рядом с другим определителем не ставится
      return `Артикль не ставится рядом с другим определителем: «${nextTok}» (${DET_TOKEN_RU[nextTok] ?? 'определитель'}) уже определяет существительное. «mi casa», не «la mi casa».`
    }
    if (prev === 'hay') {
      return 'После «hay» неисчисляемое стоит без артикля: Hay agua, Hay ropa, Hay comida. Артикль — только со счётными: Hay una idea.'
    }
    if (prev === 'sin') return 'После «sin» артикля нет: sin azúcar — «без сахара».'
    const noun = nounByToken(nounTok)
    if (noun && noun.id === 'n-casa' && prev === 'en') {
      return '«En casa» — устойчивое выражение («дома») — без артикля.'
    }
    if (noun && bareAllowed(noun, 'sg')) {
      return `«${nounTok}» здесь без артикля: речь о веществе/понятии в целом, не о конкретном (Tengo ropa, Como pan, Hablo español).`
    }
    return 'Здесь артикль не нужен: перевод говорит о предмете вообще (вещество, язык, класс), а не о конкретном.'
  }
  if (DET_TOKEN_RU[bt]) {
    return `Определитель «${bt}» (${DET_TOKEN_RU[bt]}) здесь лишний — в переводе нет «${DET_TOKEN_RU[bt]}».`
  }
  // Словарный fallback: лишнее известное слово («не то слово вставлено»)
  const w = tokenWord(bt)
  if (w) {
    return `Слово «${bt}» (${w.ru.join(', ')}) здесь лишнее: в переводе его нет.`
  }
  return null
}

/** Контракции проверяются до выравнивания: «a el» ломает выравнивание */
function contractionHint(b: string[], answer: string[]): string | null {
  for (let i = 0; i < b.length - 1; i++) {
    const cur = b[i]!
    const next = b[i + 1]!
    if ((cur === 'a' || cur === 'de') && next === 'el') {
      const fused = cur === 'a' ? 'al' : 'del'
      if (!answer.includes(fused)) continue // слияния здесь не ожидается — дальше разберёт выравнивание
      return `Предлог всегда сливается с артиклем «el»: ${cur} + el = ${fused} (${fused} banco — «${cur === 'a' ? 'к банку' : 'из банка'}»). «${cur} el» в испанском не бывает.`
    }
  }
  return null
}

const ORDER_HINT =
  'Слова все верные, но порядок другой. В испанском: кто? → что делает? → что? Отрицание «no» и местоимение-получатель (le/les) ставятся ПЕРЕД глаголом: No le doy el libro.'

// ============================================================
// Главный вход
// ============================================================

/**
 * Целевая подсказка по разнице собранной фразы и ответа.
 *
 * built — токены пользователя, answer — правильный ответ (с
 * заглавными — нормализуются), altAnswers — допустимые варианты без
 * подлежащего-местоимения. Возвращает текст подсказки про КОНКРЕТНОЕ
 * правило или null, если ошибка не однозначная (несколько правок,
 * словарная ошибка) — тогда показывается общий tip шаблона.
 */
export function targetedHint(
  built: string[],
  answer: string[],
  altAnswers?: string[],
): string | null {
  const b = built.map((s) => s.trim().toLowerCase()).filter(Boolean)
  const answers: string[][] = [
    answer.map((s) => s.trim().toLowerCase()).filter(Boolean),
    ...(altAnswers ?? []).map((s) =>
      s
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    ),
  ]
  if (b.length === 0 || answers[0]!.length === 0) return null

  // Точное совпадение (регистр/пробелы) — подсказка не нужна
  if (answers.some((a) => a.join(' ') === b.join(' '))) return null

  // Контракция — до выравнивания (a el = 2 токена против al)
  const contraction = contractionHint(b, answers[0]!)
  if (contraction) return contraction

  // Перестановка: слова те же, порядок другой
  if (answers.some((a) => sameMultiset(b, a))) return ORDER_HINT

  // Однозначная правка: сравниваем с ответом и с альтернативами,
  // берём ту версию, где правка минимальна
  let best: { dist: number; hint: string | null } | null = null
  for (const a of answers) {
    const { dist, ops } = editScript(b, a)
    let hint: string | null = null
    if (dist <= 1 && ops.length === 1) {
      const op = ops[0]!
      hint =
        op.kind === 'sub'
          ? classifySub(b[op.bi!]!, a[op.ai!]!, a, op.ai!, b, op.bi!)
          : op.kind === 'ins'
            ? classifyIns(a[op.ai!]!, a, op.ai!)
            : classifyDel(b[op.bi!]!, b, op.bi!)
    }
    if (!best || dist < best.dist || (dist === best.dist && hint && !best.hint)) {
      best = { dist, hint }
    }
    if (best.hint && best.dist <= 1) break
  }
  return best && best.dist <= 1 ? best.hint : null
}
