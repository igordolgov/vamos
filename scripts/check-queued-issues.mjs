// Проверка исправлений: neg-tener детерминизм + gustar «(вообще)»
import { allTemplates } from '../shared/phrases/templates.ts'
import { walkFills } from '../shared/phrases/engine.ts'
import { readFileSync } from 'node:fs'

const prog = JSON.parse(readFileSync('/tmp/demo-progress.json', 'utf8'))
const ALL = new Set(Object.keys(prog.words))

// 1) neg-tener: определитель ПОСЛЕ «no tienenX» не может быть quantity/definite;
//    притяжательные/указательные видны в русском переводе (генитив)
const IDS = ['t-pron-tener-noun', 't-pron-v-do', 't-pron-v-do-adj', 't-noun-v-do', 't-noun-v-do-adj']
const T = allTemplates().filter((t) => IDS.includes(t.id))
let bad = 0
let poss = 0
let laHijaTiempo = false
let laHijaPoco = false
for (const t of T) {
  walkFills(t, ALL, (fill, kind) => {
    const es = t.render(fill, kind)
    const ru = t.ru(fill, kind)
    if (kind !== 'neg') return
    const m = es.match(/no (?:tengo|tienes|tiene|tenemos|tienen) (\S+(?: \S+)?)/)
    if (!m) return
    if (/la hija no tiene tiempo/i.test(es)) laHijaTiempo = true
    if (/la hija no tiene (poco|mucho)/i.test(es)) laHijaPoco = true
    if (/\b(el|la|los|las|mucho|mucha|poco|poca)\b/i.test(m[1])) {
      bad++
      if (bad < 10) console.log('BAD-ES:', es, '—', ru)
    }
    if (/ (mi|mis|tu|tus|su|sus|nuestro|este|esta|ese|esa) /.test(es)) {
      poss++
      if (poss < 8) console.log('POSS:', es, '—', ru)
    }
  }, { maxLeaves: 250_000 })
}
console.log('neg-tener: с quantity/definite после глагола:', bad, '| «La hija no tiene tiempo»:', laHijaTiempo, '| «no tiene poco/mucho»:', laHijaPoco)

// 2) gustar: «(вообще)» у el/la; «gusta un/una» нет
const gt = allTemplates().find((t) => t.id === 't-pron-gustar-np')
let marked = 0, unmarkedDef = 0, indef = 0, total = 0
walkFills(gt, ALL, (fill, kind) => {
  const es = gt.render(fill, kind)
  const ru = gt.ru(fill, kind)
  total++
  if (/\b(el|la|los|las) /.test(es)) { if (ru.includes('(вообще)')) marked++; else { unmarkedDef++; if (unmarkedDef < 5) console.log('NO-MARK:', es, '—', ru) } }
  if (/\b(un|una|unos|unas) /.test(es)) { indef++; if (indef < 5) console.log('INDEF-BAD:', es, '—', ru) }
}, { maxLeaves: 100_000 })
console.log(`gustar: всего ${total}, el/la помечено «(вообще)»: ${marked}, не помечено: ${unmarkedDef}, с un/una: ${indef}`)

// 3) формы gustar в данных
const vg = (await import('../shared/data/words/index.ts')).getWord('v-gustar')
console.log('gustar forms:', vg.verb?.forms ? JSON.stringify(vg.verb.forms) : vg.verb)
