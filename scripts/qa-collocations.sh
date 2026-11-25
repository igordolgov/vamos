#!/usr/bin/env bash
# QA: белый список сочетаемости — страницы Фразы/Практика с демо-прогрессом.
set -u
cd /home/z/my-project
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
echo "=== Фразы (демо-прогресс: уроки 1 и 4):"
agent-browser snapshot > /tmp/snap-phrases2.txt
grep -oE '"[^"]{10,110}"' /tmp/snap-phrases2.txt | sed -n '5,22p'

echo "=== Практика: старт сессии «Тест-выбор»"
agent-browser open "http://localhost:3100/practice" >/dev/null 2>&1
sleep 2
REF=$(agent-browser snapshot | grep -i "выбор\|Тест" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/')
echo "choice btn: $REF"
agent-browser click "$REF" 2>/dev/null
sleep 2
agent-browser snapshot > /tmp/snap-practice.txt
grep -qE "Вопрос 1 из 10" /tmp/snap-practice.txt && echo "practice session: OK" || echo "practice session: FAIL"
grep -oE '"[^"]{8,90}"' /tmp/snap-practice.txt | sed -n '4,14p'
echo "console errors:"
agent-browser errors 2>/dev/null | grep -v "Chrome 158" | grep -v "agent-browser" || echo "(нет)"
echo "done"
