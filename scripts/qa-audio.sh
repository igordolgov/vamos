#!/usr/bin/env bash
# QA: авто-озвучка аудио-упражнения + вид кнопки (iPhone 14).
# Сервер и все шаги — в одной сессии: процессы не живут между вызовами bash.
# Snapshot печатает ссылки как [ref=eN]; click принимает @eN.
# Dev-SW (vite-plugin-pwa, autoUpdate) перезагружает страницу при
# активации новой версии — в начале QA отписываем SW и стабилизируем.
set -u
cd /home/z/my-project

ref_of() { grep -i "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/'; }

# 1) чистый dev-сервер (ждём именно 200 — во время сборки Nitro отдаёт 503)
pkill -f "nuxt dev" 2>/dev/null; sleep 1
setsid nohup npx nuxt dev --port 3100 > /tmp/nuxt-dev.log 2>&1 < /dev/null &
CODE=000
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/practice)
  if [ "$CODE" = "200" ]; then break; fi
  sleep 1
done
echo "server: $CODE"
if [ "$CODE" != "200" ]; then echo "server not ready — abort"; exit 1; fi

# 2) iPhone 14, практика, демо-прогресс
agent-browser set device "iPhone 14" >/dev/null
agent-browser open "http://localhost:3100/practice" >/dev/null 2>&1
agent-browser storage local set vamos.progress "$(cat /tmp/demo-progress.json)" >/dev/null

# 3) нейтрализация dev-SW: отписать все регистрации, перезагрузить,
#    дать новому SW установиться БЕЗ предыдущего контроллера (isUpdate=false → без reload)
agent-browser eval "(function(){ if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); } return 'sw-unregistered'; })()"
agent-browser reload >/dev/null
sleep 5
echo "sw after settle: $(agent-browser eval "navigator.serviceWorker.controller ? 'controlled' : 'none'")"

# 4) спай на speechSynthesis.speak
agent-browser eval "(function(){ try { window.__speakCalls = []; var o = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = function(u){ window.__speakCalls.push({t: u && u.text, v: u && u.volume}); return o(u); }; return 'spied'; } catch(e) { return 'no-speech: ' + e.message; } })()"

# 5) меню → кнопка «Аудио» (запуск сессии сразу)
REF=$(agent-browser snapshot | ref_of "Аудио")
echo "audio btn: ${REF:-NOT_FOUND}"
if [ -z "$REF" ]; then exit 1; fi
agent-browser click "$REF"
sleep 3.5   # speakEs ждёт список голосов до ~2 c + 300 мс задержка авто-озвучки

# 6) что озвучено (ожидаем: unlock ' ' vol=0 + слово упражнения)
echo "speak calls after start:"
agent-browser eval "JSON.stringify(window.__speakCalls || 'none')"

# 7) скриншот кнопки (белая иконка на зелёном)
agent-browser screenshot /tmp/qa-audio.png && echo "screenshot ok"

# 8) клик по первому варианту → «Дальше» → новое аудио тоже озвучивается само
SNAP2=$(agent-browser snapshot)
FIRST_OPT=$(printf '%s' "$SNAP2" | awk '
  tolower($0) ~ /прослушайте/ && found==0 { found=1; next }
  found==1 && /ref=e[0-9]+/ { found=2; next }
  found==2 && /ref=e[0-9]+/ { match($0, /ref=e[0-9]+/); print "@" substr($0, RSTART+4, RLENGTH-4); exit }')
echo "first option: ${FIRST_OPT:-NOT_FOUND}"
agent-browser click "$FIRST_OPT" 2>/dev/null && echo "answered"
sleep 1
NEXT=$(agent-browser snapshot | ref_of "Дальше")
echo "next btn: ${NEXT:-NOT_FOUND}"
agent-browser click "$NEXT" 2>/dev/null && echo "next"
sleep 3.5
echo "speak calls after next:"
agent-browser eval "JSON.stringify(window.__speakCalls)"

echo "console errors:"
agent-browser errors
echo "done"
