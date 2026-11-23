// ============================================================
// scripts/make-icons.mjs — генерация PWA-иконок из SVG (sharp).
// ============================================================

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const SVG = (bg, fg, accent) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${bg}"/>
  <circle cx="256" cy="256" r="150" fill="${accent}" opacity="0.25"/>
  <text x="256" y="330" font-family="Georgia, serif" font-size="220" font-weight="bold"
        text-anchor="middle" fill="${fg}">¡V</text>
</svg>
`

// Маскируемая иконка: контент в безопасной зоне (80%)
const SVG_MASKABLE = (bg, fg, accent) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <circle cx="256" cy="256" r="120" fill="${accent}" opacity="0.25"/>
  <text x="256" y="320" font-family="Georgia, serif" font-size="180" font-weight="bold"
        text-anchor="middle" fill="${fg}">¡V</text>
</svg>
`

const COLORS = { bg: '#c25a3a', fg: '#fdf6ec', accent: '#3e8a7c' }

mkdirSync('public', { recursive: true })

const jobs = [
  ['public/pwa-192.png', 192, SVG(COLORS.bg, COLORS.fg, COLORS.accent)],
  ['public/pwa-512.png', 512, SVG(COLORS.bg, COLORS.fg, COLORS.accent)],
  ['public/pwa-maskable-512.png', 512, SVG_MASKABLE(COLORS.bg, COLORS.fg, COLORS.accent)],
  ['public/apple-touch-icon.png', 180, SVG(COLORS.bg, COLORS.fg, COLORS.accent)],
  ['public/favicon.png', 64, SVG(COLORS.bg, COLORS.fg, COLORS.accent)],
]

for (const [file, size, svg] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file)
  console.log('OK', file, size)
}

// robots.txt
writeFileSync(
  'public/robots.txt',
  'User-agent: *\nAllow: /\n',
)
console.log('OK public/robots.txt')
