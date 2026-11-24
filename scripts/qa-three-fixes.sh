#!/usr/bin/env bash
# QA трёх фиксов: фразы после уроков 1+4, словарь «показать ещё»,
# автоозвучка аудио (синхронная, в контексте жеста).
# Сервер и шаги — в одной сессии; dev-SW нейтрализуется.
set -u
cd /home/z/my-project

ref_of() { grep -i "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/'; }

# 1) чистый dev-сервер (ждём 200)
pkill -f "nuxt dev" 2>/dev/null; sleep 1
setsid nohup npx nuxt dev --port 3100 > /tmp/nuxt-dev.log 2>&1 < /dev/null &
CODE=000
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/phrases)
  if [ "$CODE" = "200" ]; then break; fi
  sleep 1
done
echo "server: $CODE"
if [ "$CODE" != "200" ]; then echo "server not ready — abort"; exit 1; fi

agent-browser set device "iPhone 14" >/dev/null
agent-browser open "http://localhost:3100/phrases" >/dev/null 2>&1
agent-browser storage local set vamos.progress "$(cat /tmp/demo-progress2.json)" >/dev/null
agent-browser eval "(function(){ if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); } return 'sw-off'; })()"
agent-browser reload >/dev/null
sleep 5

echo "=== 1) ФРАЗЫ после уроков 1+4 ==="
agent-browser eval "document.body.innerText.slice(0, 700)"
agent-browser screenshot /tmp/qa-phrases.png && echo "shot phrases"

echo "=== 2) СЛОВАРЬ: 60 из 313 + показать ещё ==="
agent-browser open "http://localhost:3100/words" >/dev/null 2>&1
sleep 2
agent-browser eval "document.body.innerText.slice(0, 200)"
SHOWMORE=$(agent-browser snapshot | ref_of "Показать ещё")
echo "show more btn: ${SHOWMORE:-NOT_FOUND}"
agent-browser click "$SHOWMORE" 2>/dev/null && echo "clicked show more"
sleep 1
agent-browser eval "document.body.innerText.match(/Показано[^\n]*/)?.[0] ?? 'no-counter'"
agent-browser eval "document.querySelectorAll('.grid > *').length + ' карточек в сетке'"
agent-browser screenshot /tmp/qa-words.png && echo "shot words"

echo "=== 3) АВТООЗВУЧКА аудио (синхронная) ==="
agent-browser open "http://localhost:3100/practice" >/dev/null 2>&1
sleep 2
agent-browser eval "(function(){ try { window.__speakCalls = []; var o = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = function(u){ window.__speakCalls.push({t: u && u.text, v: u && u.volume}); return o(u); }; return 'spied'; } catch(e) { return 'no-speech: ' + e.message; } })()"
AUDIO_BTN=$(agent-browser snapshot | ref_of "Аудио")
echo "audio btn: ${AUDIO_BTN:-NOT_FOUND}"
agent-browser click "$AUDIO_BTN"
sleep 3.5
echo "speak calls (ожидаем: unlock ' ' vol=0 + слово):"
agent-browser eval "JSON.stringify(window.__speakCalls || 'none')"
agent-browser screenshot /tmp/qa-audio-sync.png && echo "shot audio"

echo "=== консольные ошибки ==="
agent-browser errors | head -6
echo done
