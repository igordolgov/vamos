#!/bin/bash
# qa-star.sh — «Уже выучил» учитывается в проценте урока
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

$AB open http://localhost:$PORT/lessons/11 > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5
echo "BEFORE STAR:"
$AB eval "(() => document.body.innerText.match(/выучено \\d+ из \\d+/)?.[0])()"
# пометить «Уже выучил» первое слово урока 11 с correct=1 (n-hora — урок 11)
$AB eval "(() => { const p=JSON.parse(localStorage.getItem('vamos.progress')); for (const [id,w] of Object.entries(p.words)) { if (w.correct===1) { w.star=Date.now(); break } } localStorage.setItem('vamos.progress', JSON.stringify(p)); return 'starred' })()"
$AB reload > /dev/null
sleep 2.5
echo "AFTER STAR:"
$AB eval "(() => document.body.innerText.match(/выучено \\d+ из \\d+/)?.[0])()"
# и на списке уроков карточка урока 11
$AB open http://localhost:$PORT/lessons > /dev/null
sleep 2.5
$AB eval "(() => [...document.querySelectorAll('a .card')].map(c=>(c.querySelector('.radial-progress')?.textContent.trim()??'?')).slice(9,12).join(' | '))()"
echo DONE
