// seed-demo-progress.mjs — готовит демо-прогресс для QA в браузере.
// Берёт реальные ID слов из исходников данных (regex по factory-вызовам)
// и распределяет их по частям речи: часть выучена, часть в процессе.
import { writeFileSync, readFileSync } from 'node:fs'

// Порядок слов — из учебного плана (curriculum.ts): первые ~11 уроков
// считаем изученными (частично), дальше — в процессе/не тронуты.
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
  if (i < 100) words[id] = { correct: 5, wrong: 0, knownAt: 1 } // уроки 1–9 — выучено
  else if (i < 130) words[id] = { correct: 1, wrong: 1 } // уроки 10–11 — в процессе
  // дальше — не трогали вовсе
})

const progress = {
  version: 1,
  words,
  lessons: {},
  phrases: {},
  // Все достижения уже получены — иначе при первом ответе тосты
  // лавиной накрывают экран и мешают QA интерфейса практики
  achievements: Object.fromEntries([
    'first-word', 'words-10', 'words-50', 'words-100', 'words-200', 'words-all',
    'phrases-100', 'phrases-1000', 'phrases-10000', 'phrases-100000',
    'streak-3', 'streak-7', 'streak-30', 'answers-50', 'answers-200',
    'first-lesson', 'lessons-10', 'all-pronouns', 'all-prepositions', 'verbs-25',
  ].map((id) => [id, 1_700_000_000_000])),
  streakDates: ['2026-11-22', '2026-11-23', '2026-11-24'],
  answers: { correct: 120, wrong: 18 },
  settings: {},
  updatedAt: Date.now(),
}

writeFileSync('/tmp/demo-progress.json', JSON.stringify(progress))
console.log(`OK: ${ids.length} ids, ${Object.keys(words).length} with progress`)
