#!/usr/bin/env bash
# QA: фразы без абсурда после коллокаций — Фразы + Практика (iPhone 14).
set -u
cd /home/z/my-project
node scripts/seed-demo-progress.mjs
unreg() { agent-browser eval "(function(){ if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); return 'unreg'; } return 'no-sw'; })()" >/dev/null; }

pkill -f "nuxt dev" 2>/dev/null; sleep 1
setsid nohup npx nuxt dev --port 3100 > /tmp/nuxt-dev.log 2>&1 < /dev/null &
CODE=000
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/practice)
  if [ "$CODE" = "200" ]; then break; fi
  sleep 1
done
echo "server: $CODE"
[ "$CODE" != "200" ] && { echo "server not ready — abort"; exit 1; }

agent-browser set device "iPhone 14" >/dev/null
agent-browser open "http://localhost:3100/phrases" >/dev/null 2>&1
agent-browser storage local set vamos.progress "$(cat /tmp/demo-progress.json)" >/dev/null
unreg
agent-browser reload >/dev/null
sleep 5

echo "=== Страница Фразы: первые фразы"
agent-browser snapshot > /tmp/snap-phrases.txt
grep -oE '"[^"]{10,120}"' /tmp/snap-phrases.txt | sed -n '4,20p'

# Абсурдные паттерны на странице Фразы (несколько страниц)
echo "=== Скан плохих паттернов на 6 страницах фраз"
BAD=0
for page in 0 1 2 3 4 5; do
  agent-browser eval "window.__phr = null; fetch('/phrases').then(r=>r.text()).then(()=>document.body.innerText).then(t=>{window.__t=t}); 'ok'" >/dev/null 2>&1
  agent-browser snapshot > "/tmp/snap-phrases-$page.txt"
  for pat in "читаю стол" "пишу кровать" "уставшая кровать" "три отца" "мало курицы" "быструю фотографию" "лёгкая кровать" "Молоко — трудное" "может мочь" "No hay la" "ve a la maestra.*a la maestra"; do
    if grep -qiE "$pat" "/tmp/snap-phrases-$page.txt"; then
      echo "  BAD [$page]: $pat"; BAD=1
    fi
  done
  # перелистнуть страницу, если есть кнопка «Дальше»/«→»
  REF=$(agent-browser snapshot | grep -iE "страница|следующая|Дальше" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/')
  [ -n "$REF" ] && agent-browser click "$REF" 2>/dev/null && sleep 1
done
[ "$BAD" = "0" ] && echo "  чисто: абсурда на страницах фраз нет"

echo "=== Практика: сессия «Сборка»"
agent-browser open "http://localhost:3100/practice" >/dev/null 2>&1
sleep 2
REF=$(agent-browser snapshot | grep -iE "Сборк|build" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/')
echo "build btn: $REF"
agent-browser click "$REF" 2>/dev/null
sleep 2
agent-browser snapshot > /tmp/snap-build.txt
grep -qE "Вопрос 1" /tmp/snap-build.txt && echo "session: OK" || echo "session: FAIL"
grep -oE '"[^"]{8,100}"' /tmp/snap-build.txt | sed -n '4,16p'

echo "=== Практика: сессия «Тест-выбор»"
agent-browser open "http://localhost:3100/practice" >/dev/null 2>&1
sleep 2
REF=$(agent-browser snapshot | grep -iE "выбор" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/')
agent-browser click "$REF" 2>/dev/null
sleep 2
agent-browser snapshot > /tmp/snap-choice.txt
grep -oE '"[^"]{8,100}"' /tmp/snap-choice.txt | sed -n '4,16p'

echo "console errors:"
agent-browser errors 2>/dev/null | grep -v "Chrome 158" | grep -v "agent-browser" || echo "(нет)"
echo "done"
