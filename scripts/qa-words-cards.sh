#!/bin/bash
# qa-words-cards.sh — QA правок карточки слова и семантики «Уже знал»:
#   1) пилюли статуса («выучено/новое» + «Уже знал») в одной строке со словом
#   2) спряжение: 6 лиц с vosotros, заголовок «Спряжение» без списка лиц
#   3) шрифт: слово 20px, мета-строки 13px
#   4) «Уже знал» = выучено: тост, бейдж «выучено», звезда в прогрессе,
#      число доступных фраз на /phrases растёт после пометки
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

$AB open http://localhost:$PORT/words > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5

echo "=== 1. Заголовок спряжения: без «(yo, tú, …)» ==="
$AB eval "(() => { const t=document.body.innerText; return JSON.stringify({ oldLabel: t.includes('(yo, tú'), conjLabel: t.includes('Спряжение') }) })()"

echo "=== 2. Пилюли в одной строке со словом (первые 12 карточек) ==="
$AB eval "(() => { const out=[]; for (const c of [...document.querySelectorAll('.card')].slice(0,12)) { const h=c.querySelector('h3'); const badge=c.querySelector('.badge'); const btn=[...c.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Уже знал')); if(!h||!badge||!btn) continue; const ht=h.getBoundingClientRect().top, bt=badge.getBoundingClientRect().top, kt=btn.getBoundingClientRect().top; out.push(h.textContent.trim()+':'+(Math.abs(ht-bt)<4&&Math.abs(ht-kt)<4?'1line':'WRAP')); } return out.join(' | ') })()"

echo "=== 3. Шрифты: слово 20px, мета 13px ==="
$AB eval "(() => { const h=document.querySelector('.card h3'); const meta=[...document.querySelectorAll('.card p')].find(p=>p.textContent.includes('существительное')||p.textContent.includes('глагол')); return JSON.stringify({ word: getComputedStyle(h).fontSize, meta: meta?getComputedStyle(meta).fontSize:'NO META' }) })()"

echo "=== 4. Спряжение глагола hablar: 6 лиц ==="
$AB eval "(() => { const cards=[...document.querySelectorAll('.card')]; const c=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='hablar'); if(!c) return 'NO CARD'; const t=c.innerText; return JSON.stringify({ yo:'hablo', tu:t.includes('hablas'), usted:t.includes('habla'), nosotros:t.includes('hablamos'), vosLabel:t.includes('vosotros'), vosForm:t.includes('habláis'), ustedes:t.includes('hablan'), label:t.includes('Спряжение') }) })()"

echo "=== 5. ser: sois, estar: estáis ( irregular vosotros) ==="
$AB eval "(() => { const cards=[...document.querySelectorAll('.card')]; const s=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='ser'); const e=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='estar'); if(!s||!e) return 'NO CARD ser='+(!!s)+' estar='+(!!e); return JSON.stringify({ sois: s.innerText.includes('sois'), son: s.innerText.includes('son'), estais: e.innerText.includes('estáis'), estan: e.innerText.includes('están') }) })()"

echo "=== 6. Существительное casa: мета-строка и пилюли в одной строке ==="
$AB eval "(() => { const inp=[...document.querySelectorAll('input[type=search]')][0]; inp.value='casa'; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()"
sleep 0.8
$AB eval "(() => { const cards=[...document.querySelectorAll('.card')]; const c=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='casa'); if(!c) return 'NO CARD'; const t=c.innerText; const h=c.querySelector('h3').getBoundingClientRect(); const badge=c.querySelector('.badge').getBoundingClientRect(); const btn=[...c.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Уже знал')).getBoundingClientRect(); return JSON.stringify({ pos: t.includes('📦'), gender: t.replace(/\n/g,' ').includes('м.р. (el)'), plural: t.includes('casas'), oneLine: Math.abs(h.top-badge.top)<4 && Math.abs(h.top-btn.top)<4 }) })()"
$AB eval "(() => { const inp=[...document.querySelectorAll('input[type=search]')][0]; inp.value=''; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()"
sleep 0.5

echo "=== 7. Число доступных фраз ДО пометки ==="
$AB open http://localhost:$PORT/phrases > /dev/null
sleep 2
PHR_BEFORE=$($AB eval "(() => { const m=document.body.innerText.match(/движок:\s*([\d\u00a0\u202f ]+) из/); return m? m[1].replace(/\D/g,'') : 'NO' })()" | tr -d '" ')
echo "phrases before: $PHR_BEFORE"

echo "=== 8. «Уже знал» на карточке decir (урок 29, не изучено) ==="
$AB open http://localhost:$PORT/words > /dev/null
sleep 2
$AB eval "(() => { const inp=[...document.querySelectorAll('input[type=search]')][0]; inp.value='decir'; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()"
sleep 0.8
$AB eval "(() => { const cards=[...document.querySelectorAll('.card')]; const c=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='decir'); if(!c) return 'NO CARD'; const badge=c.querySelector('.badge').textContent.trim(); return 'badge before: '+badge })()"
$AB eval "(() => { const cards=[...document.querySelectorAll('.card')]; const c=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='decir'); const btn=[...c.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Уже знал')); btn.click(); return 'clicked' })()"
sleep 1.2
echo "TOAST:"
$AB eval "(() => document.querySelector('.toast .alert')?.textContent.trim() ?? 'NO TOAST')()"
$AB eval "(() => { const cards=[...document.querySelectorAll('.card')]; const c=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='decir'); const btn=[...c.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Уже знал')); const badge=c.querySelector('.badge').textContent.trim(); return JSON.stringify({ badgeAfter: badge, ariaPressed: btn.getAttribute('aria-pressed'), success: btn.className.includes('btn-success') }) })()"
$AB eval "(() => { const p=JSON.parse(localStorage.getItem('vamos.progress')); return 'v-decir star: ' + (p.words['v-decir']?.star ?? 'NONE') })()"

echo "=== 9. Число доступных фраз ПОСЛЕ пометки (должно вырасти) ==="
$AB open http://localhost:$PORT/phrases > /dev/null
sleep 2
PHR_AFTER=$($AB eval "(() => { const m=document.body.innerText.match(/движок:\s*([\d\u00a0\u202f ]+) из/); return m? m[1].replace(/\D/g,'') : 'NO' })()" | tr -d '" ')
echo "phrases after: $PHR_AFTER"
if [ "$PHR_AFTER" -gt "$PHR_BEFORE" ] 2>/dev/null; then echo "OK: phrases выросли ($PHR_BEFORE → $PHR_AFTER)"; else echo "FAIL: phrases не выросли ($PHR_BEFORE → $PHR_AFTER)"; fi

echo "=== 10. Урок 29: спряжение decir на странице урока ==="
$AB open http://localhost:$PORT/lessons/29 > /dev/null
sleep 2
$AB eval "(() => { const t=document.body.innerText; return JSON.stringify({ oldLabel: t.includes('(yo, tú'), conj: t.includes('Спряжение'), decis: t.includes('decís'), dicen: t.includes('dicen'), badge: t.includes('выучено') }) })()"

echo "=== 11. Снятие пометки: счётчик фраз возвращается ==="
$AB open http://localhost:$PORT/words > /dev/null
sleep 2
$AB eval "(() => { const inp=[...document.querySelectorAll('input[type=search]')][0]; inp.value='decir'; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()"
sleep 0.8
$AB eval "(() => { const cards=[...document.querySelectorAll('.card')]; const c=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='decir'); const btn=[...c.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Уже знал')); btn.click(); return 'unstarred' })()"
sleep 1
$AB open http://localhost:$PORT/phrases > /dev/null
sleep 2
PHR_REVERT=$($AB eval "(() => { const m=document.body.innerText.match(/движок:\s*([\d\u00a0\u202f ]+) из/); return m? m[1].replace(/\D/g,'') : 'NO' })()" | tr -d '" ')
echo "phrases after unstar: $PHR_REVERT (before star: $PHR_BEFORE)"

echo "=== 12. Скриншоты ==="
$AB open http://localhost:$PORT/words > /dev/null
sleep 2
$AB screenshot /tmp/qa-words-default.png > /dev/null
$AB eval "(() => { const inp=[...document.querySelectorAll('input[type=search]')][0]; inp.value='hablar'; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()"
sleep 0.8
$AB screenshot /tmp/qa-words-verb.png > /dev/null
$AB open http://localhost:$PORT/lessons/29 > /dev/null
sleep 2
$AB screenshot /tmp/qa-lesson-29.png > /dev/null
echo "screenshots saved"
