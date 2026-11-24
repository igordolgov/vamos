#!/bin/bash
# qa-tips2.sh — QA расширенных объяснений при неверном ответе (iPhone 14):
# тест-выбор: tip (почему/лайфхак/ПРИМЕР) + озвучка верного ответа;
# сборка фразы: подсветка позиций плиток + пословный разбор + озвучка.
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

$AB open http://localhost:$PORT/practice > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5

# Спи на speechSynthesis: каждая озвучка пишется в __speakCalls
$AB eval "(() => { window.__speakCalls=[]; const _s=window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak=(u)=>{window.__speakCalls.push(u.text); _s(u);}; return 'spy ok' })()"

echo '=================== 1. ТЕСТ-ВЫБОР ==================='
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('выбор')); b?.click(); return b?'started':'no-btn' })()"
sleep 1.5

# отвечаем НЕВЕРНО: кликаем последний вариант; если верный — «Дальше», retry
WRONG=0
for i in 1 2 3 4 5 6 7 8; do
  $AB eval "(() => {
    const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.grid.grid-cols-2'));
    if(!card) return 'no-card';
    const opts=[...card.querySelectorAll('.grid.grid-cols-2 button')];
    if(opts.length<4) return 'no-4opts';
    opts[opts.length-1].click();
    return 'clicked: '+opts[opts.length-1].textContent.trim()
  })()" > /dev/null
  sleep 1.2
  RESULT=$($AB eval "(() => {
    const fb=document.querySelector('.animate-feedback');
    return fb && fb.textContent.includes('Верный ответ') ? 'WRONG' : 'CORRECT'
  })()" | tr -d '"')
  echo "=== attempt $i: $RESULT ==="
  if [ "$RESULT" = "WRONG" ]; then WRONG=1; break; fi
  $AB eval "(() => { const nxt=[...document.querySelectorAll('button')].at(-1); nxt?.click(); return 'next' })()" > /dev/null
  sleep 1
done

# разбор: фидбек + полный блок объяснения (почему/лайфхак/пример/разбор)
$AB eval "(() => {
  const fb=document.querySelector('.animate-feedback');
  const card=fb ? fb.closest('.card-body') : null;
  const tipBox=card ? card.querySelector('.bg-warning\\\\/10') : null;
  const tipPs=tipBox ? [...tipBox.querySelectorAll('p')].map(p=>p.textContent.trim()) : [];
  return JSON.stringify({speakCalls: window.__speakCalls.length, feedback: fb ? [...fb.querySelectorAll('p')].map(p=>p.textContent.trim()) : [], tip: tipPs}, null, 1)
})()"

$AB screenshot /tmp/qa-tips2-choice.png

echo '=================== 2. СБОРКА ФРАЗЫ ==================='
# новая сессия: назад в меню недоступно из сессии — просто перезагружаем страницу
$AB reload > /dev/null
sleep 2
$AB eval "(() => { window.__speakCalls=[]; const _s=window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak=(u)=>{window.__speakCalls.push(u.text); _s(u);}; return 'spy ok' })()"
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('фразы')); b?.click(); return b?'build started':'no-btn' })()"
sleep 1.5

# собираем НЕВЕРНО: кликаем все плитки в порядке DOM (случайный относительно ответа)
BUILD_WRONG=0
for i in 1 2 3 4 5 6; do
  $AB eval "(() => {
    const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.border-dashed'));
    if(!card) return 'no-card';
    const pool=[...card.querySelectorAll('.relative button')].filter(b=>!b.classList.contains('invisible'));
    if(pool.length<3) return 'no-pool';
    pool.forEach(b=>b.click());
    return 'picked '+pool.length+' tiles'
  })()" > /dev/null
  sleep 0.5
  $AB eval "(() => { const btns=[...document.querySelectorAll('button')]; const chk=btns.find(b=>b.textContent.trim()==='Проверить'); chk?.click(); return chk?'checked':'no-check' })()" > /dev/null
  sleep 1.2
  RESULT=$($AB eval "(() => {
    const fb=document.querySelector('.animate-feedback');
    return fb && fb.textContent.includes('Верный ответ') ? 'WRONG' : (fb ? 'CORRECT' : 'NO-FB')
  })()" | tr -d '"')
  echo "=== build attempt $i: $RESULT ==="
  if [ "$RESULT" = "WRONG" ]; then BUILD_WRONG=1; break; fi
  $AB eval "(() => { const nxt=[...document.querySelectorAll('button')].at(-1); nxt?.click(); return 'next' })()" > /dev/null
  sleep 1
done

# разбор: подсветка плиток (btn-success/btn-error) + разбор + озвучка
$AB eval "(() => {
  const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.border-dashed'));
  if(!card) return 'no-card';
  const built=[...card.querySelectorAll('.border-dashed button')].map(b=>({t:b.textContent.trim(), c:[...b.classList].filter(x=>x.startsWith('btn-')&&x!=='btn-md'&&x!=='btn').join(',')}));
  const tipBox=card.querySelector('.bg-warning\\\\/10');
  const tipPs=tipBox ? [...tipBox.querySelectorAll('p')].map(p=>p.textContent.trim()) : [];
  return JSON.stringify({speakCalls: window.__speakCalls.length, built, tip: tipPs}, null, 1)
})()"

$AB screenshot /tmp/qa-tips2-build.png

echo "WRONG_CHOICE=$WRONG BUILD_WRONG=$BUILD_WRONG"
echo "=== console/errors ==="
$AB errors
