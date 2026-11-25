// check-articles.mjs — аудит правил испанских артиклей во всех фразах.
//
// Правила проверки:
//  R1  сокр. a+el→al, de+el→del (никогда «a el» / «de el»)
//  R2  hay/no hay + только un/una/mucho/poco/голая форма/числительные
//      (не el/la/los/las/притяжательные/указательные)
//  R3  артикль согласуется с существительным в роде и числе
//      (el agua — ж.р. с м.р. артиклем учитывается через articleGender)
//  R4  личное «a» перед дополнением-лицом (Veo A la maestra)
//  R5  ser + профессия — без артикля (Es maestra, не «Es una maestra»)
//  R6  данные: пол существительного против окончания (-a/-o),
//      исключения должны быть помечены (gender/articleGender)
//
// Запуск: npx vite-node scripts/check-articles.mjs
import { allTemplates } from '../shared/phrases/templates.ts'
import { walkFills, templateReady } from '../shared/phrases/engine.ts'
import { ALL_WORDS } from '../shared/data/words/index.ts'

const known = new Set(ALL_WORDS.map((w) => w.id))

// ---- словарь форм существительных для проверки согласования ----
const nounByForm = new Map()
const personForms = new Set()
for (const w of ALL_WORDS) {
  if (w.pos !== 'noun') continue
  nounByForm.set(w.es.toLowerCase(), w)
  if (w.nounPlural) nounByForm.set(w.nounPlural.toLowerCase(), w)
  if (w.nounClass === 'person' || w.nounClass === 'family') {
    personForms.add(w.es.toLowerCase())
    if (w.nounPlural) personForms.add(w.nounPlural.toLowerCase())
  }
}

// формы глаголов, требующих личное «a» перед дополнением-лицом
const PERSON_OBJ_VERBS = ['v-ver', 'v-buscar', 'v-esperar', 'v-conocer', 'v-querer']
const personVerbForms = new Set()
for (const id of PERSON_OBJ_VERBS) {
  const v = ALL_WORDS.find((w) => w.id === id)
  if (v?.verb) for (const f of Object.values(v.verb.forms)) personVerbForms.add(f.toLowerCase())
}

const ARTICLE_GENDER = {
  el: 'm', un: 'm', los: 'mp', unos: 'mp',
  la: 'f', una: 'f', las: 'fp', unas: 'fp',
}
const ARTICLE_NUMBER = { el: 'sg', un: 'sg', la: 'sg', una: 'sg', los: 'pl', las: 'pl', unos: 'pl', unas: 'pl' }

// ---- правила на тексте фразы ----
const RULES = [
  { id: 'R1', re: /\b(a|de) el\b/i, msg: 'нет сокращения al/del' },
  { id: 'R2', re: /\b(hay|no hay)\s+(el|la|los|las|mi|mis|tu|tus|su|sus|nuestro|nuestra|nuestros|este|esta|estos|estas|ese|esa|eso)\b/i, msg: 'hay + не тот определитель' },
]

// счётные абстрактные и языки — «голой» формы не бывает: «hay una idea»,
// «tengo un problema», «hablo el español»-контексты с артиклем
const COUNTABLE_ABSTRACT = new Set(['año','canción','día','historia','hora','idea','mañana','manera','mes','minuto','momento','mundo','noche','nombre','palabra','parte','pregunta','problema','razón','respuesta','semana','tarde','verdad'])
const LANGUAGES = new Set(['español','inglés','ruso'])
const NEED_ARTICLE = new Set([...COUNTABLE_ABSTRACT, ...LANGUAGES])

// неисчисляемые: без неопределённого артикля и без «много/мало» во мн.ч.
// («un agua» корректно по RAE — ж.р. с м.р. артиклем, не флагаем)
const UNCOUNTABLE = new Set(['ropa', 'dinero', 'tiempo', 'música'])
const UNCOUNTABLE_PL = new Set(['ropa', 'dinero', 'tiempo', 'música', 'agua'])
const HAY_LIKE = new Set(['hay', 'tengo', 'tienes', 'tiene', 'tenemos', 'tienen'])
const PREPS = new Set(['a', 'de', 'en', 'con', 'para', 'por', 'sobre', 'entre', 'desde', 'hasta', 'antes', 'después', 'cerca', 'lejos'])

/** R7: после предлога существительное должно иметь определитель
 *  (исключения: sin — всегда голая; casa — идиоматично голая;
 *  sobre + абстрактное — тема без артикля) */
function checkPrepBare(es) {
  const out = []
  const words = es.toLowerCase().replace(/[¿?¡!.]/g, '').split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    if (!PREPS.has(words[i])) continue
    const nounW = nounByForm.get(words[i + 1])
    if (!nounW) continue // артикль/определитель/глагол — не голая группа
    if (words[i] === 'sin') continue
    if (nounW.id === 'n-casa') continue
    if (words[i] === 'sobre' && nounW.nounClass === 'abstract') continue
    out.push(`голая форма после «${words[i]}»: ${words[i]} ${words[i + 1]}`)
  }
  return out
}

/** R8: hay/tener + голое счётное абстрактное или язык */
function checkBareCountable(es) {
  const out = []
  const words = es.toLowerCase().replace(/[¿?¡!.]/g, '').split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    if (!HAY_LIKE.has(words[i])) continue
    if (NEED_ARTICLE.has(words[i + 1])) out.push(`голое счётное: ${words[i]} ${words[i + 1]}`)
  }
  return out
}

/** R9/R10: неопределённый артикль и «много/мало» во мн.ч. с неисчисляемым */
function checkUncountable(es) {
  const out = []
  const words = es.toLowerCase().replace(/[¿?¡!.]/g, '').split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    const nounW = nounByForm.get(words[i + 1])
    if (!nounW || !UNCOUNTABLE_PL.has(nounW.es.toLowerCase())) continue
    if (['un', 'una', 'unos', 'unas'].includes(words[i]) && UNCOUNTABLE.has(nounW.es.toLowerCase())) {
      out.push(`un/una + неисчисляемое: ${words[i]} ${words[i + 1]}`)
    }
    if (['mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'pocos', 'pocas'].includes(words[i]) && ARTICLE_NUMBER[words[i]] === 'pl') {
      out.push(`много/мало во мн.ч.: ${words[i]} ${words[i + 1]}`)
    }
  }
  return out
}

/** R3: артикль против рода/числа существительного */
function checkAgreement(es) {
  const out = []
  const words = es.toLowerCase().replace(/[¿?¡!.]/g, '').split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    const art = words[i]
    if (!(art in ARTICLE_GENDER)) continue
    const nounW = nounByForm.get(words[i + 1])
    if (!nounW) continue
    const num = ARTICLE_NUMBER[art]
    const form = num === 'pl' ? (nounW.nounPlural ?? nounW.es).toLowerCase() : nounW.es.toLowerCase()
    if (form !== words[i + 1]) continue // слово в другой форме — не та пара
    const wantG = num === 'sg' ? ((nounW.articleGender && num === 'sg' ? nounW.articleGender : nounW.gender) ?? 'm')
      : (nounW.gender ?? 'm')
    const wantKey = num === 'pl' ? (wantG === 'm' ? 'mp' : 'fp') : wantG
    if (ARTICLE_GENDER[art] !== wantKey) {
      out.push(`${art} ${words[i + 1]} (род ${nounW.gender}, articleGender ${nounW.articleGender ?? '—'})`)
    }
  }
  return out
}

/** R4: личное «a» перед дополнением-лицом */
function checkPersonalA(es) {
  const out = []
  const words = es.toLowerCase().replace(/[¿?¡!.]/g, '').split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    if (!personVerbForms.has(words[i])) continue
    // дополнение: сразу лицо, либо артикль/определитель + лицо
    let j = i + 1
    let npStart = j
    if (['el','la','los','las','un','una','unos','unas','mi','mis','tu','tus','su','sus','nuestro','nuestra','este','esta','ese','esa'].includes(words[j])) npStart = j + 1
    if (!personForms.has(words[npStart])) continue
    // перед группой должно стоять «a»/«al» (или a + el уже склеен)
    const prev = words[i - 1]
    if (npStart === j && prev !== 'a') { out.push(`нет «a»: …${words.slice(Math.max(0,i-2), npStart+1).join(' ')}…`); continue }
    if (npStart === j + 1) {
      // артикль + лицо: нужно «a el/la…» или «al»; «de el» не относится
      const prev2 = prev
      if (prev2 === 'a') continue            // «a la maestra» ✓
      if (words[j] === 'el' && prev2 === 'al') continue // не бывает, но ок
      out.push(`нет «a»: …${words.slice(Math.max(0,i-2), npStart+1).join(' ')}…`)
    }
  }
  return out
}

/** R5: ser + профессия/лицо с артиклем */
function checkSerArticle(es) {
  const out = []
  const words = es.toLowerCase().replace(/[¿?¡!.]/g, '').split(/\s+/)
  for (let i = 0; i < words.length - 2; i++) {
    if (!['soy','eres','es','somos','sois','son'].includes(words[i])) continue
    if (!['un','una','unos','unas'].includes(words[i + 1])) continue
    if (!personForms.has(words[i + 2])) continue
    out.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
  }
  return out
}

// ---- R6: данные — пол против окончания ----
const DATA_EXCEPTIONS = new Set(['día','problema','agua','mano','mapa','tema','idioma','clima','sistema','programa','drama','planeta','foto','moto','radio','modelo','película'])
function checkNounData() {
  const out = []
  for (const w of ALL_WORDS) {
    if (w.pos !== 'noun') continue
    const es = w.es.toLowerCase()
    if (DATA_EXCEPTIONS.has(es)) continue
    if (es.endsWith('a') && w.gender === 'm') out.push(`n: «${w.es}» м.р. с окончанием -a`)
    if (es.endsWith('o') && w.gender === 'f') out.push(`n: «${w.es}» ж.р. с окончанием -o`)
    if (/(ción|sión|dad|tad|umbre|ie)$/.test(es) && w.gender === 'm') out.push(`n: «${w.es}» м.р. с ж.р. окончанием`)
  }
  return out
}

// ---- обход всех шаблонов ----
const violations = new Map() // правило → массив «фраза [шаблон/вариант]»
const add = (rule, detail, es, meta) => {
  if (!violations.has(rule)) violations.set(rule, [])
  const arr = violations.get(rule)
  if (arr.length < 12) arr.push(`${es}  —  ${meta}  ${detail ? '⟨' + detail + '⟩' : ''}`)
}
let phrases = 0

for (const t of allTemplates()) {
  if (!templateReady(t, known)) continue
  walkFills(t, known, (fill, kind) => {
    phrases++
    const es = t.render(fill, kind)
    if (!es) return
    const meta = `[${t.id}/${kind}]`
    for (const r of RULES) if (r.re.test(es)) add(r.id + ' ' + r.msg, null, es, meta)
    for (const d of checkAgreement(es)) add('R3 род/число артикля', d, es, meta)
    for (const d of checkPersonalA(es)) add('R4 личное a', d, es, meta)
    for (const d of checkSerArticle(es)) add('R5 ser+профессия+артикль', d, es, meta)
    for (const d of checkPrepBare(es)) add('R7 голое сущ. после предлога', d, es, meta)
    for (const d of checkBareCountable(es)) add('R8 hay/tener + голое счётное', d, es, meta)
    for (const d of checkUncountable(es)) add('R9 un/много + неисчисляемое', d, es, meta)
  }, { maxLeaves: 250_000 })
}

console.log('проверено фраз:', phrases)
const dataViolations = checkNounData()
if (dataViolations.length) { violations.set('R6 данные существительных', dataViolations.slice(0, 12)) }

if (violations.size === 0) {
  console.log('ARTICLES CLEAN ✓')
} else {
  for (const [rule, list] of violations) {
    console.log(`\n--- ${rule} (${list.length}+) ---`)
    for (const line of list) console.log(' ', line)
  }
}
