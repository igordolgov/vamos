// check-strange-phrases.mjs — воспроизводим жалобы пользователя на «странные выражения»:
// «Что ты нуждаешься?», «Сестра - семья», «Вы даёте маленькую соль», «Учительници не дают вино»,
// «Женщина закрывает горячее окно?», «Они платят хлеб?», «Вы заказываете маленькое мясо?»,
// «Они не учатся русский язык.», «Какая машина?» (Cuál es el carro)
// Плюс: переходные глаголы без дополнения («Tú no conoces bien») в голых осях.
import { allTemplates, BARE_OK_VERBS, MANNER_VERBS, PRONOUN_CONJ_VERBS } from '../shared/phrases/templates.ts'
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

// ============================================================
// Голые оси: глагол/инфинитив — последнее слово фразы БЕЗ дополнения.
// Переходные (tener/hacer/ver/decir/saber/querer/conocer/buscar/…),
// модальные (poder/querer/necesitar) и pensar там не должны появляться:
// «Tú no conoces bien» — кого/что? (жалоба пользователя)
// ============================================================
const NEED_OBJ_LAST = new Set([
  'tener', 'tengo', 'tienes', 'tiene', 'tienen',
  'hacer', 'hago', 'haces', 'hace', 'hacen',
  'dar', 'doy', 'das', 'da', 'dan',
  'ver', 'veo', 'ves', 've', 'ven',
  'decir', 'digo', 'dices', 'dice', 'dicen',
  'saber', 'sé', 'sabes', 'sabe', 'saben',
  'querer', 'quiero', 'quieres', 'quiere', 'quieren',
  'conocer', 'conozco', 'conoces', 'conoce', 'conocen',
  'buscar', 'busco', 'buscas', 'busca', 'buscan',
  'esperar', 'espero', 'esperas', 'espera', 'esperan',
  'recordar', 'recuerdo', 'recuerdas', 'recuerda', 'recuerdan',
  'poner', 'pongo', 'pones', 'pone', 'ponen',
  'llevar', 'llevo', 'llevas', 'lleva', 'llevan',
  'dejar', 'dejo', 'dejas', 'deja', 'dejan',
  'pagar', 'pago', 'pagas', 'paga',
  'pedir', 'pido', 'pides', 'pide', 'piden',
  'seguir', 'sigo', 'sigues', 'sigue', 'siguen',
  'abrir', 'abro', 'abres', 'abre', 'abren',
  'cerrar', 'cierro', 'cierras', 'cierra', 'cierran',
  'empezar', 'empiezo', 'empiezas', 'empieza', 'empiezan',
  'terminar', 'termino', 'terminas', 'termina', 'terminan',
  'usar', 'uso', 'usas', 'usa', 'usan',
  'aprender', 'aprendo', 'aprendes', 'aprende', 'aprenden',
  'ayudar', 'ayudo', 'ayudas', 'ayuda', 'ayudan',
  'llamar', 'llamo', 'llamas', 'llama', 'llaman',
  'creer', 'creo', 'crees', 'cree', 'creen',
  'poder', 'puedo', 'puedes', 'puede', 'pueden',
  'necesitar', 'necesito', 'necesitas', 'necesita', 'necesitan',
  'pensar', 'pienso', 'piensas', 'piensa', 'piensan',
])
const BARE_TEMPLATES = new Set([
  't-pron-v-adverb', 't-pron-v-adverb2', 't-pron-adv-no-v',
  't-pron-tampoco-v', 't-pron-nunca-v', 't-pron-v-manner',
  't-qw-cuando', 't-qw-porque', 't-qw-quien',
  't-pron-modal-inf', 't-pron-tener-que-inf', 't-pron-ir-a-inf', 't-hay-que-inf',
])
const bareHits = []
for (const t of allTemplates()) {
  if (!BARE_TEMPLATES.has(t.id) || !templateReady(t, known)) continue
  walkFills(t, known, (fill, kind) => {
    const es = t.render(fill, kind)
    const last = es.replace(/[¿?¡!.]/g, '').trim().split(/\s+/).pop()?.toLowerCase() ?? ''
    if (NEED_OBJ_LAST.has(last)) bareHits.push(`[${t.id}/${kind}] ${es}`)
  }, { maxLeaves: 200_000 })
}
console.log(`\n=== bare-verbs (переходный/модальный без дополнения): ${bareHits.length} ===`)
for (const line of bareHits.slice(0, 10)) console.log(' ', line)
console.log('\n=== пулы голых осей ===')
console.log('  MANNER:', MANNER_VERBS.map((x) => x.es).join(', '))
console.log('  PRONOUN:', PRONOUN_CONJ_VERBS.map((x) => x.es).join(', '))
console.log('  BARE_OK:', BARE_OK_VERBS.map((x) => x.es).join(', '))
