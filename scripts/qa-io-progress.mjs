// qa-io-progress.mjs — минимальный прогресс для QA подсказок:
// knownSet = только слова шаблонов le/les (dar/escribir) + артикли
// el/la/un/una. Практика по уроку (practice?lesson=4) в режиме «Сборка»
// собирает ТОЛЬКО фразы этих шаблонов: «Le doy el libro», «Me das agua»…
import { writeFileSync } from 'node:fs'

const KNOWN = [
  'p-me', 'p-te', 'p-le', 'p-les', 'p-nos',
  'v-dar', 'v-escribir',
  'n-libro', 'n-carta', 'n-regalo', 'n-agua',
  'd-el', 'd-la', 'd-un', 'd-una',
]

const words = {}
for (const id of KNOWN) words[id] = { correct: 3, wrong: 0, knownAt: 1 }

const progress = {
  version: 1,
  words,
  streak: { current: 1, best: 3, lastDay: '2026-11-25' },
  lessonIndex: 25,
}

writeFileSync('/tmp/qa-io-progress.json', JSON.stringify(progress))
console.log(`qa io progress: ${KNOWN.length} слов`)
