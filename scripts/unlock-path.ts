// ============================================================
// unlock-path.ts — какие слова открывают фразы (по движку).
//
// Считает: базовые точки (0 слов / демо-набор / все слова),
// кумулятивный путь по урокам, топ прироста от одного слова
// и какие шаблоны ждут какие слова.
// ============================================================
import { ALL_WORDS, wordsByLesson } from '../shared/data/words'
import { LESSONS } from '../shared/data/lessons'
import { allTemplates } from '../shared/phrases/templates'
import { countTemplate, templateReady } from '../shared/phrases/engine'
import { phrasesForWords } from '../shared/stats'

const ALL = new Set(ALL_WORDS.map((w) => w.id))
const fmt = (n: number) => n.toLocaleString('ru-RU')

console.log('=== БАЗА ===')
console.log('Слов всего:', ALL_WORDS.length)
console.log('Фраз всего:', fmt(phrasesForWords(ALL)))
console.log('Фраз при 0 слов:', fmt(phrasesForWords(new Set())))

// Демо-набор (как в QA-сессии)
const demoIds = ['p-yo', 'p-tu', 'p-el', 'p-ella', 'p-nosotros', 'p-ustedes',
  'v-hablar', 'v-ver', 'v-querer', 'v-estudiar', 'n-casa', 'n-escuela', 'n-libro', 'a-bueno', 'a-nuevo']
const missingIds = demoIds.filter((id) => !ALL.has(id))
const demo = new Set(demoIds.filter((id) => ALL.has(id)))
console.log('\n=== ДЕМО-НАБОР ===')
console.log('Неизвестные id:', missingIds.length ? missingIds.join(', ') : 'нет')
console.log('Известно слов:', demo.size, '→ фраз:', fmt(phrasesForWords(demo)))

// === Кумулятивный путь по урокам ===
console.log('\n=== ПУТЬ ПО УРОКАМ (кумулятивно) ===')
let known = new Set<string>()
let prev = 0
for (const lesson of LESSONS.slice(0, 12)) {
  for (const w of wordsByLesson(lesson.number)) known.add(w.id)
  const now = phrasesForWords(known)
  console.log(
    `Урок ${String(lesson.number).padStart(2)} ${lesson.titleRu.padEnd(30)} ` +
    `слов=${known.size} фраз=${fmt(now)} (+${fmt(now - prev)})`,
  )
  prev = now
}

// === Какие шаблоны не готовы в демо-наборе и чего им не хватает ===
console.log('\n=== НЕ-ГОТОВЫЕ ШАБЛОНЫ (демо-набор) ===')
const missingMap = new Map<string, number>() // wordId -> кол-во шаблонов, где не хватает
for (const t of allTemplates()) {
  const missing = t.requires.filter((id) => !demo.has(id))
  if (t.requires.length > 0 && missing.length > 0 && missing.length <= 4) {
    console.log(`${t.id.padEnd(22)} нет: ${missing.join(', ')} (готов бы дать ${fmt(countTemplate(t, ALL))})`)
    for (const id of missing) missingMap.set(id, (missingMap.get(id) ?? 0) + 1)
  }
}
console.log('Слова, чаще всего нехватаемые в requires:', [...missingMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10))

// === Топ прироста от ОДНОГО нового слова (демо-набор) ===
console.log('\n=== ТОП-15: ОДНО НОВОЕ СЛОВО → +ФРАЗ (демо) ===')
const base = phrasesForWords(demo)
const deltas: Array<{ id: string; es: string; ru: string; delta: number; lesson: number }> = []
for (const w of ALL_WORDS) {
  if (demo.has(w.id)) continue
  const ext = new Set(demo); ext.add(w.id)
  const delta = phrasesForWords(ext) - base
  if (delta > 0) deltas.push({ id: w.id, es: w.es, ru: w.ru[0], delta, lesson: w.lesson })
}
deltas.sort((a, b) => b.delta - a.delta)
for (const d of deltas.slice(0, 15)) {
  console.log(`+${fmt(d.delta).padStart(12)}  ${d.es.padEnd(10)} (${d.ru}) урок ${d.lesson}`)
}

// === Жадный путь с нуля: по одному слову, каждый раз топ ===
console.log('\n=== ЖАДНЫЙ ПУТЬ С НУЛЯ (первые 18 слов) ===')
let cur = new Set<string>()
for (let step = 0; step < 18; step++) {
  let best: { id: string; delta: number; es: string; ru: string; lesson: number } | null = null
  for (const w of ALL_WORDS) {
    if (cur.has(w.id)) continue
    const ext = new Set(cur); ext.add(w.id)
    const delta = phrasesForWords(ext) - phrasesForWords(cur)
    if (!best || delta > best.delta) best = { id: w.id, delta, es: w.es, ru: w.ru[0], lesson: w.lesson }
  }
  if (!best || best.delta === 0) { console.log('дальше прирост 0'); break }
  cur.add(best.id)
  console.log(`шаг ${String(step + 1).padStart(2)}: ${best.es.padEnd(10)} (+${fmt(best.delta)}) → всего ${fmt(phrasesForWords(cur))} фраз`)
}
