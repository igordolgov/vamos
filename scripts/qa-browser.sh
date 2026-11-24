#!/bin/bash
# qa-browser.sh — QA в браузере (iPhone 14): дашборд, уроки, практика.
# Запускает прод-сборку, вводит демо-прогресс и проверяет ключевые точки.
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

echo "=== 1. ДАШБОРД: кнопка «Продолжить учёбу» ==="
$AB open http://localhost:$PORT/ > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 3
# уроки 1–9 выучены полностью (100 слов), урок 10 — в процессе:
# кнопка должна вести на /lessons/10, а не на /lessons/1
$AB eval "(() => { const a=[...document.querySelectorAll('a')].find(x=>x.textContent.includes('Продолжить')); return a ? a.getAttribute('href') : 'NOT FOUND' })()"

echo "=== 2. СПИСОК УРОКОВ: проценты карточек ==="
$AB open http://localhost:$PORT/lessons > /dev/null
sleep 2.5
$AB eval "(() => [...document.querySelectorAll('.radial-progress')].slice(0,12).map(e=>e.textContent.trim()).join(' | '))()"
$AB eval "(() => { const cards=[...document.querySelectorAll('a .card')]; return cards.slice(0,3).map(c=>c.querySelector('h3')?.textContent+' → '+(c.querySelector('.radial-progress')?.textContent.trim()??'?')).join(' ; ') })()"

echo "=== 3. СТРАНИЦА УРОКА 10: «выучено X из Y» ==="
$AB open http://localhost:$PORT/lessons/10 > /dev/null
sleep 2.5
$AB eval "(() => document.querySelector('p.text-base-content\\\\/60')?.textContent.trim().replace(/\\s+/g,' '))()"

echo "=== 4. ПРАКТИКА: старт по кнопке типа, без «Начать сессию» ==="
$AB open http://localhost:$PORT/practice > /dev/null
sleep 2.5
$AB eval "(() => { const btns=[...document.querySelectorAll('button')].map(b=>b.textContent.trim()); return JSON.stringify({hasStartSession: btns.some(t=>t.includes('Начать')), menu: btns.slice(0,6)}) })()"
# клик по «Тест-выбор» → сессия должна начаться сразу
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('выбор')); b?.click(); return b?'clicked':'no-btn' })()"
sleep 1.5
$AB eval "(() => { const t=document.body.innerText; return JSON.stringify({progress: (t.match(/\\d+ \\/ 10/)||[])[0]||'?', hasAlreadyKnown: t.includes('Уже выучил'), hasCheckOrNext: t.includes('Проверить')||t.includes('Вариант')}) })()" 

echo "=== 5. ОТВЕТ ОШИБОЧНЫЙ: «Верный ответ:» и ответ на разных строках ==="
# выбрать заведомо неверный вариант: последний вариант часто неверный,
# надёжнее — кликнуть вариант, чей текст != верному; верный подсвечивается
# btn-success только после клика. Кликаем по индексу 1 (если неверный — ок;
# если вдруг верный — перезапустим сценарий ниже через reload сессии)
$AB eval "(() => { const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.grid.grid-cols-2')); if(!card) return 'no-card'; const opts=[...card.querySelectorAll('.grid.grid-cols-2 button')]; if(opts.length<4) return 'no-4opts'; window.__opts=opts; opts[3].click(); return 'clicked #3: '+opts[3].textContent.trim() })()"
sleep 1
$AB eval "(() => { const fb=document.querySelector('.animate-feedback'); if(!fb) return 'NO FEEDBACK'; const ps=[...fb.querySelectorAll('p')].map(p=>p.textContent.trim()); const rect=fb.getBoundingClientRect(); return JSON.stringify({lines: ps, sameLine: ps.length===2 ? (Math.abs(ps[0].length)>0) : null, twoParagraphs: ps.length, fbClass: fb.className, nextVisible: [...document.querySelectorAll('button')].at(-1).className.includes('invisible')?'invisible':'visible'}) })()"
$AB screenshot /tmp/qa-wrong-answer.png

echo "=== 6. «Уже выучил» — кнопка над карточкой ==="
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Уже выучил')); return b? 'found: '+b.textContent.trim() : 'NOT FOUND' })()"

echo "=== 7. Кнопка «Дальше» видна, свайп-зона не сломана ==="
$AB eval "(() => { const nxt=[...document.querySelectorAll('button')].at(-1); nxt.click(); return 'next clicked' })()"
sleep 1
$AB eval "(() => (document.body.innerText.match(/\\d+ \\/ 10/)||['?'])[0])()"

echo "=== 8. Ошибки страницы ==="
$AB errors
$AB console | tail -5
echo "=== QA DONE ==="
