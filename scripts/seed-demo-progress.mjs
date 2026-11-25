// seed-demo-progress.mjs — готовит ДЕМО-ПРОГРЕСС для QA в браузере.
// Уроки 1–26 изучены (уроки 19–26 частично): активны hay, модальные,
// gustar, числа, герундий — все группы фраз в практике.
import { writeFileSync, readFileSync } from 'node:fs'

const src = readFileSync('shared/data/curriculum.ts', 'utf8')
const ids = []
const re = /'([a-z0-9-]+)'/g
let m
while ((m = re.exec(src))) {
  if (m[1].startsWith('p-') || m[1].startsWith('v-') || m[1].startsWith('n-') ||
      m[1].startsWith('a-') || m[1].startsWith('d-') || m[1].startsWith('qw-') ||
      m[1].startsWith('c-') || m[1].startsWith('num-') || m[1].startsWith('cstr-') ||
      m[1].startsWith('prep-') || m[1].startsWith('adv-')) {
    ids.push(m[1])
  }
}

const words = {}
ids.forEach((id, i) => {
  if (i < 160) words[id] = { correct: 5, wrong: 0, knownAt: 1 } // уроки 1–19
  else if (i < 220) words[id] = { correct: 2, wrong: 0, knownAt: 1 } // уроки 20–26
})

const progress = {
  version: 1,
  words,
  streak: { current: 3, best: 7, lastDay: '2026-11-25' },
  lessonIndex: 26,
}

writeFileSync('/tmp/demo-progress.json', JSON.stringify(progress))
const n = Object.keys(words).length
console.log(`demo progress: ${n} слов, уроки 1–26`)
