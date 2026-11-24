#!/bin/bash
# qa-tips.sh — QA объяснений при неверном ответе (iPhone 14):
# подсказка «почему» + «лайфхак» в тест-выборе, пояснение выбранного варианта.
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

# старт сессии кликом по «Тест-выбор»
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('выбор')); b?.click(); return b?'started':'no-btn' })()"
sleep 1.5

# отвечаем НЕВЕРНО: кликаем последний вариант; если вдруг верный —
# жмём «Дальше» и пробуем на следующем вопросе (максимум 6 попыток)
$AB eval "(() => { window.__tries=0; return 'ok' })()"
for i in 1 2 3 4 5 6; do
  $AB eval "(() => {
    const card=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.grid.grid-cols-2'));
    if(!card) return 'no-card';
    const opts=[...card.querySelectorAll('.grid.grid-cols-2 button')];
    if(opts.length<4) return 'no-4opts';
    opts[opts.length-1].click(); window.__tries=(window.__tries||0)+1;
    return 'clicked #'+(opts.length-1)+': '+opts[opts.length-1].textContent.trim()
  })()"
  sleep 1.2
  # agent-browser eval возвращает строку в кавычках — снимаем их для сравнения
  RESULT=$($AB eval "(() => {
    const fb=document.querySelector('.animate-feedback');
    if(!fb) return 'NO-FEEDBACK';
    return fb.textContent.includes('Верный ответ') ? 'WRONG-ANSWER' : 'CORRECT'
  })()" | tr -d '"')
  echo "=== attempt $i: $RESULT ==="
  if [ "$RESULT" = "WRONG-ANSWER" ]; then break; fi
  # верный ответ — дальше к следующему вопросу
  $AB eval "(() => { const nxt=[...document.querySelectorAll('button')].at(-1); nxt?.click(); return 'next' })()"
  sleep 1
done

# разбор блока обратной связи и подсказки (сессия осталась на неверном ответе)
$AB eval "(() => {
  const fb=document.querySelector('.animate-feedback');
  const lines=fb ? [...fb.querySelectorAll('p')].map(p=>p.textContent.trim()) : [];
  const tipBox=fb ? fb.closest('.card-body').querySelector('.bg-warning\\\\/10') : null;
  const tipPs=tipBox ? [...tipBox.querySelectorAll('p')].map(p=>p.textContent.trim()) : [];
  return JSON.stringify({tries: window.__tries, feedback: lines, tip: tipPs}, null, 1)
})()"

$AB screenshot /tmp/qa-tips.png

# «Дальше» работает после подсказки; свайп-зона жива
$AB eval "(() => { const nxt=[...document.querySelectorAll('button')].at(-1); nxt?.click(); return 'next clicked' })()"
sleep 1
$AB eval "(() => (document.body.innerText.match(/\d+ \/ 10/)||['?'])[0])()"

echo "=== console/errors ==="
$AB errors
