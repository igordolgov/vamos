#!/usr/bin/env bash
# QA: стеклянные квадратные карточки «источника слов».
# Скриншоты: iPhone 14 светлая/тёмная, десктоп 1366x768.
# Плюс регресс: клик по карточке запускает сессию.
set -u
cd /home/z/my-project

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

# dev-SW не должен перезагружать страницу
unreg() { agent-browser eval "(function(){ if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); return 'unreg'; } return 'no-sw'; })()" >/dev/null; }

agent-browser set device "iPhone 14" >/dev/null
agent-browser open "http://localhost:3100/practice" >/dev/null 2>&1
unreg
agent-browser reload >/dev/null
sleep 5

# 1) мобильная светлая
agent-browser screenshot /tmp/qa-glass-mobile-light.png >/dev/null && echo "shot 1 ok"

# 2) мобильная тёмная
agent-browser eval "document.documentElement.dataset.theme='vamos-dark'; 'dark'" >/dev/null
sleep 0.5
agent-browser screenshot /tmp/qa-glass-mobile-dark.png >/dev/null && echo "shot 2 ok"
agent-browser eval "document.documentElement.dataset.theme='vamos-light'; 'light'" >/dev/null

# 3) десктоп
agent-browser set viewport 1366 768 >/dev/null
sleep 1
agent-browser screenshot /tmp/qa-glass-desktop.png >/dev/null && echo "shot 3 ok"

# 4) регресс: клик по карточке «Аудио» запускает сессию
REF=$(agent-browser snapshot | grep -i "Аудио" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/')
agent-browser click "$REF" 2>/dev/null
sleep 2
agent-browser snapshot > /tmp/qa-glass-session.txt
grep -q "Прослушайте\|Вопрос 1 из 10" /tmp/qa-glass-session.txt && echo "session started: OK" || echo "session started: FAIL"

echo "console errors:"
agent-browser errors
echo "done"
