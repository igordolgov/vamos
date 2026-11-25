#!/bin/bash
# qa-build-screen.sh — QA страницы «Сборка фразы» (iPhone 14):
# 1) плитки-пилюли: маленькие паддинги, полностью скруглённые углы;
# 2) зона сборки сразу держит две строки (~100px) — «Проверить/Дальше» не прыгает;
# 3) сессия целиком помещается на один экран без прокрутки.
set -x
cd /home/z/my-project

PORT=3100
export PORT
node .output/server/index.mjs > /tmp/vamos-server.log 2>&1 &
SRV=$!
sleep 3

cleanup() { kill $SRV 2>/dev/null; }
trap cleanup EXIT

curl -s -o /dev/null -w "server: %{http_code}\n" http://localhost:$PORT/ || exit 1

AB="agent-browser"
$AB set device "iPhone 14"

echo "=== 1. Меню практики: демо-прогресс, клик «Сборка фразы» ==="
$AB open http://localhost:$PORT/practice > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Сборка')); b?.click(); return b?'started':'no-btn' })()"
sleep 1.5
$AB screenshot /tmp/qa-build-start.png

echo "=== 2. Один экран: высота контента vs вьюпорт, позиция кнопки ==="
$AB eval "(() => { const btn=[...document.querySelectorAll('button')].at(-1); const r=btn.getBoundingClientRect(); return JSON.stringify({ scrollH: document.documentElement.scrollHeight, innerH: window.innerHeight, noScroll: document.documentElement.scrollHeight <= window.innerHeight, btnBottom: Math.round(r.bottom) }) })()"

echo "=== 3. Зона сборки держит 2 строки, плитки — пилюли ==="
$AB eval "(() => { const area=document.querySelector('[aria-label=\"Собранная фраза\"]'); const tile=document.querySelector('.justify-center button'); const tcs=tile?getComputedStyle(tile):null; return JSON.stringify({ areaH: area?Math.round(area.getBoundingClientRect().height):null, tileRadius: tcs&&tcs.borderRadius, tilePadding: tcs? tcs.paddingTop+' '+tcs.paddingLeft : null, tileFont: tcs&&tcs.fontSize, tileH: tile?Math.round(tile.getBoundingClientRect().height):null }) })()"

echo "=== 4. Собираем до 7 плиток (2 строки): высота зоны и позиция кнопки ДО/ПОСЛЕ ==="
$AB eval "(() => { window.__btnBefore = Math.round([...document.querySelectorAll('button')].at(-1).getBoundingClientRect().bottom); const vis=[...document.querySelectorAll('.justify-center button')].filter(b=>!b.classList.contains('invisible')); const take=vis.slice(0, Math.min(vis.length, 7)); take.forEach(b=>b.click()); return 'picked:'+take.length })()"
sleep 0.5
$AB eval "(() => { const area=document.querySelector('[aria-label=\"Собранная фраза\"]'); const tile=area.querySelector('button'); const btn=[...document.querySelectorAll('button')].at(-1); const after=Math.round(btn.getBoundingClientRect().bottom); return JSON.stringify({ areaH: Math.round(area.getBoundingClientRect().height), tileH: tile?Math.round(tile.getBoundingClientRect().height):null, btnBottomBefore: window.__btnBefore, btnBottomAfter: after, btnMoved: after !== window.__btnBefore }) })()"
$AB screenshot /tmp/qa-build-filled.png

echo "=== 5. Проверка: фидбек поверх пула, «Дальше» на месте «Проверить» ==="
$AB eval "(() => { [...document.querySelectorAll('button')].at(-1).click(); return 'checked' })()"
sleep 0.6
$AB eval "(() => { const fb=document.querySelector('.animate-feedback'); const btn=[...document.querySelectorAll('button')].at(-1); const after=Math.round(btn.getBoundingClientRect().bottom); return JSON.stringify({ hasFeedback: !!fb, feedbackText: fb?fb.textContent.trim().slice(0,40):null, btnText: btn.textContent.trim(), btnBottomSame: after === window.__btnBefore }) })()"
$AB screenshot /tmp/qa-build-checked.png

echo "=== 6. «Дальше»: следующее упражнение, зона сборки снова 100px ==="
$AB eval "(() => { [...document.querySelectorAll('button')].at(-1).click(); return 'next' })()"
sleep 1
$AB eval "(() => { const area=document.querySelector('[aria-label=\"Собранная фраза\"]'); const vis=[...document.querySelectorAll('.justify-center button')].filter(b=>!b.classList.contains('invisible')); return JSON.stringify({ newTiles: vis.length, areaH: area?Math.round(area.getBoundingClientRect().height):null, stillNoScroll: document.documentElement.scrollHeight <= window.innerHeight }) })()"
