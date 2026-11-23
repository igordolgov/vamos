// seed-demo-progress.mjs — готовит демо-прогресс для QA в браузере.
// Берёт реальные ID слов из исходников данных (regex по factory-вызовам)
// и распределяет их по частям речи: часть выучена, часть в процессе.
import { writeFileSync, readFileSync } from 'node:fs'

const files = [
  'shared/data/words/nouns.ts',
  'shared/data/words/verbs.ts',
  'shared/data/words/adjectives.ts',
  'shared/data/words/pronouns-determiners.ts',
  'shared/data/words/preps-adverbs-etc.ts',
]

const ids = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const re = /^\s*\w+\('([a-z0-9-]+)'/gm
  let m
  while ((m = re.exec(src))) ids.push(m[1])
}

const words = {}
ids.forEach((id, i) => {
  if (i % 3 === 0) words[id] = { correct: 5, wrong: 0, knownAt: 1 } // выучено
  else if (i % 3 === 1) words[id] = { correct: 1, wrong: 1 } // в процессе
  // i % 3 === 2 — не трогали вовсе
})

const progress = {
  version: 1,
  words,
  lessons: {},
  phrases: {},
  achievements: {},
  streakDates: ['2026-11-22', '2026-11-23', '2026-11-24'],
  answers: { correct: 120, wrong: 18 },
  settings: {},
  updatedAt: Date.now(),
}

writeFileSync('/tmp/demo-progress.json', JSON.stringify(progress))
console.log(`OK: ${ids.length} ids, ${Object.keys(words).length} with progress`)
