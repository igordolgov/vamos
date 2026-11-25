import { allTemplates } from '../shared/phrases/templates.ts'
import { countTemplate } from '../shared/phrases/engine.ts'
import { ALL_WORDS } from '../shared/data/words/index.ts'
const ALL = new Set(ALL_WORDS.map(w => w.id))
const lessons = n => new Set(ALL_WORDS.filter(w => w.lesson <= n).map(w => w.id))
let total = 0
for (const t of allTemplates()) total += countTemplate(t, ALL)
console.log('total ALL =', total)
let after3 = 0, after13 = 0
for (const t of allTemplates()) { after3 += countTemplate(t, lessons(3)); after13 += countTemplate(t, lessons(13)) }
console.log('after3 =', after3, 'after13 =', after13)
const ser = allTemplates().filter(t => t.requires.includes('v-ser'))
let pot = 0
for (const t of ser) pot += countTemplate(t, ALL)
console.log('ser potential =', pot)
for (const t of allTemplates()) console.log(t.id.padEnd(24), countTemplate(t, ALL))
