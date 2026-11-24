#!/bin/bash
# qa-visual.sh — чистый QA неверного ответа (без лавины тостов достижений)
cd /home/z/my-project
PORT=3100
export PORT
node .output/server/index.mjs > /tmp/vamos-server.log 2>&1 &
SRV=$!
sleep 3
trap "kill $SRV 2>/dev/null" EXIT
curl -s -o /dev/null -w "server: %{http_code}\n" http://localhost:$PORT/ || exit 1
AB="agent-browser"
$AB set device "iPhone 14"
$AB open http://localhost:$PORT/practice > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 3
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('выбор')); b?.click(); return 'started' })()"
sleep 1.5
# ответить заведомо неверно: если 4-й вариант оказался верным — кликаем 1-й
$AB eval "(() => { const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.grid.grid-cols-2')); const opts=[...card.querySelectorAll('.grid.grid-cols-2 button')]; window.__opts=opts; opts[3].click(); return opts[3].textContent.trim() })()"
sleep 1
$AB eval "(() => { const ok=document.querySelector('.btn-success'); if(ok && window.__opts[3]===ok) { window.__opts[0].click(); return 'retry-0' } return 'wrong-answered' })()"
sleep 0.8
$AB eval "(() => { const fb=document.querySelector('.animate-feedback'); const ps=[...fb.querySelectorAll('p')].map(p=>p.textContent.trim()); const r1=fb.querySelectorAll('p')[0].getBoundingClientRect(); const r2=fb.querySelectorAll('p')[1].getBoundingClientRect(); return JSON.stringify({lines:ps, separateRows: r2.top >= r1.bottom - 2, nextBtnVisible: ![...document.querySelectorAll('button')].at(-1).className.includes('invisible')}) })()"
$AB screenshot /tmp/qa-wrong2.png
$AB errors
echo DONE
