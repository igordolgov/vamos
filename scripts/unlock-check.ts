// Проверка значений unlockKeys для тестов и ответа пользователю.
import { emptyProgress } from '../shared/types'
import { unlockKeys, phraseStats } from '../shared/stats'

const demoIds = ['p-yo', 'p-tu', 'p-el', 'p-ella', 'p-nosotros', 'p-ustedes',
  'v-hablar', 'v-ver', 'v-querer', 'v-estudiar', 'n-casa', 'n-escuela', 'n-libro', 'a-bueno', 'a-nuevo']

for (const [label, ids] of [['ПУСТО', []], ['ДЕМО', demoIds], ['УРОКИ 1-5', null]] as const) {
  const p = emptyProgress()
  const list = ids ?? ['p-yo', 'p-tu', 'p-el', 'p-ella', 'p-nosotros', 'p-ustedes',
    'v-ser', 'v-estar', 'v-hablar', 'v-comer', 'v-vivir', 'v-trabajar', 'v-tener', 'v-hacer', 'v-ir', 'v-poder', 'v-querer',
    'd-el', 'd-la', 'd-un', 'd-una', 'adv-no']
  for (const id of list) p.words[id] = { correct: 2, wrong: 0, knownAt: 1 }
  const keys = unlockKeys(p, 6)
  const st = phraseStats(p)
  console.log(`\n=== ${label} (${(ids ?? list).length} слов): фраз=${st.known.toLocaleString('ru-RU')} ===`)
  for (const k of keys) {
    console.log(`ключ [${k.words.map((w) => w.id).join(' + ')}] шаблонов=${k.templates} потенциал=${k.potential.toLocaleString('ru-RU')} (уроки: ${k.words.map((w) => w.lesson).join(',')})`)
  }
}
