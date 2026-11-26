#!/bin/bash
# qa-words-lesson-drag.sh — QA трёх фич:
#   1) «Слова»: кнопка «Уже знал» — звезда в прогрессе, тост, статус,
#      повторный клик снимает пометку
#   2) карточка «Выучите слово — откроются фразы» ведёт в урок слова
#      (бейдж «урок N», клик → /lessons/N)
#   3) «Сборка фразы»: перетаскивание плиток до «Проверить» меняет
#      порядок собранной фразы
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

echo "=== 1. СЛОВА: кнопка «Уже знал» ==="
$AB open http://localhost:$PORT/words > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5
echo "CLICK FIRST STAR BUTTON (aria-label = «Уже знал: <es>»):"
$AB eval "(() => { const b=[...document.querySelectorAll('button[aria-label^=\"Уже знал:\"]')][0]; if(!b) return 'NO BUTTON'; const label=b.getAttribute('aria-label'); b.click(); return label })()"
sleep 1.2
echo "TOAST:"
$AB eval "(() => document.querySelector('.toast .alert')?.textContent.trim() ?? 'NO TOAST')()"
echo "STAR IN PROGRESS:"
$AB eval "(() => { const p=JSON.parse(localStorage.getItem('vamos.progress')); const st=Object.entries(p.words).filter(([,w])=>w.star); return st.length + ' starred: ' + st.map(([id])=>id).join(',') })()"
echo "CARD STATE (aria-pressed должен стать true):"
$AB eval "(() => { const b=[...document.querySelectorAll('button[aria-label^=\"Уже знал:\"]')][0]; return 'aria-pressed=' + b.getAttribute('aria-pressed') + ' classes=' + b.className })()"
echo "UNSTAR (повторный клик):"
$AB eval "(() => { const b=[...document.querySelectorAll('button[aria-label^=\"Уже знал:\"]')][0]; b.click(); return 'clicked' })()"
$AB eval "(() => { const p=JSON.parse(localStorage.getItem('vamos.progress')); return 'STARRED AFTER UNSTAR: ' + Object.values(p.words).filter(w=>w.star).length })()"

echo "=== 2. ДАШБОРД: карточка возможности ведёт в урок ==="
$AB open http://localhost:$PORT/ > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5
echo "BADGE AND HREF OF FIRST OPPORTUNITY CARD:"
$AB eval "(() => { const a=[...document.querySelectorAll('a')].find(a=>a.querySelector('.card.cursor-pointer')); if(!a) return 'NO LINK'; return a.querySelector('.badge')?.textContent.trim() + ' | ' + a.getAttribute('href') })()"
$AB eval "(() => { const a=[...document.querySelectorAll('a')].find(a=>a.querySelector('.card.cursor-pointer')); a.click(); return 'clicked' })()"
sleep 1.5
echo "PAGE H1 AFTER CLICK (должен быть заголовок урока):"
$AB eval "(() => document.querySelector('h1')?.textContent.trim() ?? 'NO H1')()"
echo "OPPORTUNITIES PAGE HREFS (первые три):"
$AB open http://localhost:$PORT/opportunities > /dev/null
sleep 2.5
$AB eval "(() => [...document.querySelectorAll('a .card.cursor-pointer')].slice(0,3).map(c=>c.closest('a').getAttribute('href')).join(' ') || 'NONE')()"

echo "=== 3. ПРАКТИКА: перетаскивание плиток до «Проверить» ==="
$AB open http://localhost:$PORT/practice > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5
$AB eval "(() => { const b=[...document.querySelectorAll('button.glass-card')].find(b=>b.textContent.includes('Сборка')); if(!b) return 'NO BUILD CARD'; b.click(); return 'session started' })()"
sleep 1.5
echo "HINT:"
$AB eval "(() => document.querySelector('.card-body h2')?.textContent.trim() ?? '?')()"
# собираем в неверном порядке: кликаем видимые плитки пула в обратном порядке
$AB eval "(() => { const pool=[...document.querySelectorAll('.justify-center button')].filter(b=>!b.classList.contains('invisible') && !b.disabled); const n=pool.length; [...pool].reverse().forEach(b=>b.click()); return 'clicked ' + n + ' tiles' })()"
sleep 0.5
echo "BUILT (wrong order):"
$AB eval "(() => [...document.querySelectorAll('[aria-label=\"Собранная фраза\"] button')].map(b=>b.textContent.trim()).join('|'))()"
# drag: тащим первую плитку на последнюю (правая половина целевой плитки).
# clientY при переносе — от ЦЕЛЕВОЙ плитки (многорядная раскладка)
echo "DRAG FIRST TILE TO LAST POSITION:"
$AB eval "(() => { const zone=document.querySelector('[aria-label=\"Собранная фраза\"]'); const btns=[...zone.querySelectorAll('button')]; const from=btns[0], to=btns[btns.length-1]; const r1=from.getBoundingClientRect(), r2=to.getBoundingClientRect(); const base={bubbles:true, cancelable:true, pointerId:1}; const tx=r2.left+r2.width*0.75, ty=r2.top+r2.height/2; from.dispatchEvent(new PointerEvent('pointerdown', {...base, clientX:r1.left+r1.width/2, clientY:r1.top+r1.height/2})); from.dispatchEvent(new PointerEvent('pointermove', {...base, clientX:tx, clientY:ty})); from.dispatchEvent(new PointerEvent('pointerup', {...base, clientX:tx, clientY:ty})); return 'dragged' })()"
sleep 0.8
echo "BUILT AFTER DRAG (порядок должен измениться):"
$AB eval "(() => [...document.querySelectorAll('[aria-label=\"Собранная фраза\"] button')].map(b=>b.textContent.trim()).join('|'))()"
echo "TILE COUNT AFTER DRAG (плитки не должны улетать в пул):"
$AB eval "(() => 'count=' + document.querySelectorAll('[aria-label=\"Собранная фраза\"] button').length)()"
echo "CHECK:"
$AB eval "(() => { const check=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Проверить'); if(!check) return 'NO CHECK'; check.click(); return 'checked' })()"
sleep 0.8
echo "FEEDBACK:"
$AB eval "(() => document.querySelector('.animate-feedback')?.textContent.trim().slice(0,60) ?? 'NO FEEDBACK')()"
echo DONE
