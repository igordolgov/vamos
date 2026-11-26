// verify-fixes.mjs — точечная проверка жалоб: артикли, нуждаться, платить,
// учиться, «Какая машина?», ser-familia, учительницы
import { allTemplates } from '../shared/phrases/templates.ts'
import { walkFills, templateReady } from '../shared/phrases/engine.ts'
import { ALL_WORDS } from '../shared/data/words/index.ts'

const known = new Set(ALL_WORDS.map((w) => w.id))
const T = (id) => allTemplates().find((t) => t.id === id)

const show = (t, pred, label, limit = 6) => {
  console.log(`\n--- ${label} [${t.id}] ---`)
  let n = 0
  walkFills(t, known, (fill, kind) => {
    if (n >= limit) return
    if (!pred(fill, kind, t.render(fill, kind), t.ru(fill, kind))) return
    n++
    console.log(' ', t.ru(fill, kind), '  ⇄  ', t.render(fill, kind))
  }, { maxLeaves: 300_000 })
}

// 1. Жалоба: «El maestro quiere un pan pequeño» — обе стороны подсказок
show(T('t-noun-v-do-adj'), (f, k, es) => /maestro.*pan/i.test(es), 'учитель + маленький хлеб (все артикли)', 12)

// 2. necesitar с объектом
show(T('t-pron-v-do'), (f, k, es) => /necesit/i.test(es), 'necesitar + NP', 6)

// 3. pagar
show(T('t-noun-v-do'), (f, k, es) => /paga/i.test(es) && k === 'aff', 'pagar (за)', 5)

// 4. estudiar + язык
show(T('t-pron-v-lang'), (f, k, es) => /estudi/i.test(es) && k === 'aff', 'estudiar + язык', 4)

// 5. ¿Qué necesitas? / ¿Qué estudias?
show(T('t-qw-que'), (f, k, es) => /necesit|estudi/i.test(es), '¿Qué…? (necesitar/estudiar)', 4)

// 6. Cuál es — конкретные и абстрактные
show(T('t-qw-cual-es'), (f, k, es) => /carro|libro|casa/i.test(es), 'cuál-es конкретное', 4)
show(T('t-qw-cual-es'), (f, k, es) => /respuesta|problema|idea/i.test(es), 'cuál-es абстрактное', 4)

// 7. «Сестра — семья» больше нет; ser-prof с maestra
show(T('t-noun-ser-prof'), (f, k, es) => k === 'aff', 'ser-prof', 6)

// 8. подсказки в местах: prep, person, estar-place, hay
show(T('t-pron-v-prep-np'), (f, k, es) => /trabajo en/i.test(es) && k === 'aff', 'работаю в …', 4)
show(T('t-pron-v-person'), (f, k, es) => /veo/i.test(es) && k === 'aff', 'вижу …', 4)
show(T('t-pron-estar-place'), (f, k, es) => k === 'aff', 'место', 4)
show(T('t-hay-noun'), (f, k, es) => k === 'aff', 'hay', 6)

// 9. ioDo: «Даю (какую-то) книгу»
show(T('t-io-dar-np'), (f, k, es) => k === 'aff', 'le doy …', 4)

// 10. unas/unos во мн.ч. (t-noun-v-do subject pl)
show(T('t-noun-v-do'), (f, k, es) => /^(Unas|Los|Las)/.test(es) && k === 'aff', 'мн.ч. подлежащее', 4)
