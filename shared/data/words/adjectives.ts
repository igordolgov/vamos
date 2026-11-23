// ============================================================
// shared/data/words/adjectives.ts — прилагательные.
//
// adjState = прилагательные состояния (сочетаются с estar).
// Все формы согласования записаны явно: m / f / mp / fp.
// ============================================================

import type { Word } from '../../types'
import { a, invA, regA } from './helpers'

export const ADJECTIVES: Word[] = [
  // ===== Урок 13: основные качества =====
  a('a-bueno', 'bueno', ['хороший'], 13, regA('bueno'), false, { ruHint: 'Перед м.р. ед.ч. сокращается: un buen libro' }),
  a('a-malo', 'malo', ['плохой'], 13, regA('malo'), false, { ruHint: 'Перед м.р. ед.ч.: un mal día' }),
  a('a-grande', 'grande', ['большой'], 13, invA('grande', 'grandes'), false, { ruHint: 'Перед ед.ч. м.р.: un gran hombre' }),
  a('a-pequeno', 'pequeño', ['маленький'], 13, regA('pequeño')),
  a('a-nuevo', 'nuevo', ['новый'], 13, regA('nuevo')),
  a('a-viejo', 'viejo', ['старый'], 13, regA('viejo')),
  a('a-joven', 'joven', ['молодой'], 13, invA('joven', 'jóvenes')),
  a('a-bonito', 'bonito', ['красивый'], 13, regA('bonito')),
  a('a-feo', 'feo', ['некрасивый', 'уродливый'], 13, regA('feo')),
  a('a-alto', 'alto', ['высокий'], 13, regA('alto')),
  a('a-bajo', 'bajo', ['низкий'], 13, regA('bajo')),

  // ===== Урок 14: состояния (с estar) =====
  a('a-cansado', 'cansado', ['уставший'], 14, regA('cansado'), true, { ruShort: { m: 'устал', f: 'устала', pl: 'устали' } }),
  a('a-contento', 'contento', ['довольный'], 14, regA('contento'), true, { ruShort: { m: 'доволен', f: 'довольна', pl: 'довольны' } }),
  a('a-triste', 'triste', ['грустный'], 14, invA('triste', 'tristes'), true, { ruShort: { m: 'грустен', f: 'грустна', pl: 'грустны' } }),
  a('a-feliz', 'feliz', ['счастливый'], 14, invA('feliz', 'felices'), true, { ruShort: { m: 'счастлив', f: 'счастлива', pl: 'счастливы' } }),
  a('a-enfermo', 'enfermo', ['больной'], 14, regA('enfermo'), true, { ruShort: { m: 'болен', f: 'больна', pl: 'больны' } }),
  a('a-ocupado', 'ocupado', ['занятый'], 14, regA('ocupado'), true, { ruShort: { m: 'занят', f: 'занята', pl: 'заняты' } }),
  a('a-libre', 'libre', ['свободный'], 14, invA('libre', 'libres'), true, { ruShort: { m: 'свободен', f: 'свободна', pl: 'свободны' } }),
  a('a-tranquilo', 'tranquilo', ['спокойный'], 14, regA('tranquilo'), true, { ruShort: { m: 'спокоен', f: 'спокойна', pl: 'спокойны' } }),
  a('a-caliente', 'caliente', ['горячий', 'тёплый'], 14, invA('caliente', 'calientes'), true),
  a('a-frio', 'frío', ['холодный'], 14, regA('frío'), true),

  // ===== Урок 15: характеристики =====
  a('a-facil', 'fácil', ['лёгкий', 'простой'], 15, invA('fácil', 'fáciles')),
  a('a-dificil', 'difícil', ['трудный'], 15, invA('difícil', 'difíciles')),
  a('a-importante', 'importante', ['важный'], 15, invA('importante', 'importantes')),
  a('a-interesante', 'interesante', ['интересный'], 15, invA('interesante', 'interesantes')),
  a('a-rapido', 'rápido', ['быстрый'], 15, regA('rápido')),
  a('a-lento', 'lento', ['медленный'], 15, regA('lento')),
  a('a-caro', 'caro', ['дорогой (цена)'], 15, regA('caro')),
  a('a-barato', 'barato', ['дешёвый'], 15, regA('barato')),
  a('a-limpio', 'limpio', ['чистый'], 15, regA('limpio'), true),
  a('a-sucio', 'sucio', ['грязный'], 15, regA('sucio'), true),

  // ===== Урок 16: цвета и прочее =====
  a('a-blanco', 'blanco', ['белый'], 16, regA('blanco')),
  a('a-negro', 'negro', ['чёрный'], 16, regA('negro')),
  a('a-rojo', 'rojo', ['красный'], 16, regA('rojo')),
  a('a-verde', 'verde', ['зелёный'], 16, invA('verde', 'verdes')),
  a('a-azul', 'azul', ['синий', 'голубой'], 16, invA('azul', 'azules')),
  a('a-amarillo', 'amarillo', ['жёлтый'], 16, regA('amarillo')),
  a('a-rico', 'rico', ['вкусный', 'богатый'], 16, regA('rico'), false, {
    // Для еды — «вкусный», для людей/вещей — «богатый»
    ruByClass: { person: 'богатый', family: 'богатый', thing: 'богатый', place: 'богатый' },
  }),
  a('a-pobre', 'pobre', ['бедный'], 16, invA('pobre', 'pobres')),
  a('a-famoso', 'famoso', ['знаменитый'], 16, regA('famoso')),
  a('a-dulce', 'dulce', ['сладкий'], 16, invA('dulce', 'dulces')),
  a('a-delicioso', 'delicioso', ['очень вкусный'], 16, regA('delicioso')),
]
