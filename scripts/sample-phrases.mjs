// Выборка 60 случайных фраз из всех активных шаблонов (демо-прогресс уроки 1-26)
import { allTemplates } from '../shared/phrases/templates.ts'
import { sampleFill, countTemplate, templateReady } from '../shared/phrases/engine.ts'
import { ALL_WORDS } from '../shared/data/words/index.ts'
import { readFileSync } from 'node:fs'

const prog = JSON.parse(readFileSync('/tmp/demo-progress.json', 'utf8'))
const known = new Set(Object.keys(prog.words))
console.log('known:', known.size, 'слов')
let ready = 0
for (const t of allTemplates()) if (templateReady(t, known)) ready++
console.log('готовых шаблонов:', ready)

let seed = 12345
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
const shown = new Set()
let i = 0
while (shown.size < 60 && i++ < 3000) {
  const t = allTemplates()[Math.floor(rand() * allTemplates().length)]
  if (!templateReady(t, known) || countTemplate(t, known) === 0) continue
  const fill = sampleFill(t, known, rand)
  if (!fill) continue
  const kind = t.variants[Math.floor(rand() * t.variants.length)]
  const es = t.render(fill, kind), ru = t.ru(fill, kind)
  const key = es + '|' + ru
  if (shown.has(key)) continue
  shown.add(key)
  console.log(`${es}  —  ${ru}`)
}
const BAD = /читаю стол|пишу кровать|уставш\w+ кровать|три отца|две матери|мало куриц|быструю фотограф|лёгкая кровать|трудное молоко|может мочь|quiero querer|puede poder|No hay la |Hay la |Hay mi |происхожу|происходишь|Estoy teniendo|Ser bien/
let bad = 0
for (const k of shown) if (BAD.test(k)) { bad++; console.log('BAD:', k) }
console.log(bad === 0 ? 'SAMPLE CLEAN' : `BAD: ${bad}`)
