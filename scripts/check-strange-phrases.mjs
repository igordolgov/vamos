// check-strange-phrases.mjs — воспроизводим жалобы пользователя на «странные выражения»:
// «Что ты нуждаешься?», «Сестра - семья», «Вы даёте маленькую соль», «Учительници не дают вино»,
// «Женщина закрывает горячее окно?», «Они платят хлеб?», «Вы заказываете маленькое мясо?»,
// «Они не учатся русский язык.», «Какая машина?» (Cuál es el carro)
import { allTemplates } from '../shared/phrases/templates.ts'
import { walkFills, templateReady } from '../shared/phrases/engine.ts'
import { ALL_WORDS } from '../shared/data/words/index.ts'

const known = new Set(ALL_WORDS.map((w) => w.id))

const CHECKS = [
  { id: 'necesitar-ru', re: /нужда|нужно[йао]?[^а-я]*$/, label: 'нуждаюсь/нужно без «в/тебе»' },
  { id: 'ser-familia', re: /(семья|—\s*семья)/, label: '«X — семья» (ser + familia)' },
  { id: 'pequeno-sal', re: /маленьк[а-я]* соль|соль.*маленьк/, label: 'маленькая соль' },
  { id: 'pequeno-carne', re: /маленьк[а-я]* мясо|мясо.*маленьк/, label: 'маленькое мясо' },
  { id: 'caliente-ventana', re: /горяч[а-я]* окно|окно.*горяч|холодн[а-я]* окно/, label: 'горячее/холодное окно' },
  { id: 'maestrica', re: /учительниц/, label: 'форма «учительниц*»' },
  { id: 'pagar-np', re: /(плачу|платишь|платит|платим|платите|платят) (?!за )/, label: 'платить + NP без «за»' },
  { id: 'estudiar-obj', re: /(учусь|учишься|учится|учимся|учитесь|учатся) [а-яё]/, label: 'учиться + прямой объект' },
  { id: 'cual-es', re: /Кака[аяо][йя]?е? [а-яё]+\?/, label: '«Какая …?» (cuál es)' },
]

const hits = new Map()
for (const t of allTemplates()) {
  if (!templateReady(t, known)) continue
  walkFills(t, known, (fill, kind) => {
    const ru = t.ru(fill, kind)
    const es = t.render(fill, kind)
    if (!ru) return
    for (const c of CHECKS) {
      if (c.re.test(ru)) {
        const key = c.id
        if (!hits.has(key)) hits.set(key, [])
        const arr = hits.get(key)
        if (arr.length < 6) arr.push(`[${t.id}/${kind}] ${ru}   ⇄   ${es}`)
      }
    }
  }, { maxLeaves: 400_000 })
}

for (const c of CHECKS) {
  const arr = hits.get(c.id) ?? []
  console.log(`\n=== ${c.id} (${c.label}): ${arr.length}+ ===`)
  for (const line of arr) console.log(' ', line)
}
