#!/usr/bin/env bash
# QA: урок артиклей («артикль м.р.») + написание услышанного после ответа.
set -u
cd /home/z/my-project

ref_of() { grep -i "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/'; }

# 1) чистый dev-сервер (ждём 200)
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

agent-browser set device "iPhone 14" >/dev/null
agent-browser open "http://localhost:3100/lessons/2" >/dev/null 2>&1
agent-browser storage local set vamos.progress "$(cat /tmp/demo-progress2.json)" >/dev/null
agent-browser eval "(function(){ if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); } return 'sw-off'; })()"
agent-browser reload >/dev/null
sleep 5

echo "=== 1) УРОК АРТИКЛЕЙ: маркеры ==="
agent-browser eval "document.body.innerText.match(/артикль[^\n)]*[).]*/g)?.slice(0, 10).join(' | ') ?? 'NOT FOUND'"

echo "=== 2) АУДИО: написание после ответа ==="
agent-browser open "http://localhost:3100/practice" >/dev/null 2>&1
sleep 2
agent-browser eval "(function(){ try { window.__speakCalls = []; var o = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = function(u){ window.__speakCalls.push({t: u && u.text, v: u && u.volume}); return o(u); }; return 'spied'; } catch(e) { return 'no-speech'; } })()"
AUDIO_BTN=$(agent-browser snapshot | ref_of "Аудио")
agent-browser click "$AUDIO_BTN"
sleep 3.5
echo "spoken: $(agent-browser eval "JSON.stringify((window.__speakCalls || []).map(function(c){return c.t}))")"
# клик по первому варианту ответа
FIRST_OPT=$(agent-browser snapshot | awk '
  tolower($0) ~ /прослушайте/ && found==0 { found=1; next }
  found==1 && /ref=e[0-9]+/ { found=2; next }
  found==2 && /ref=e[0-9]+/ { match($0, /ref=e[0-9]+/); print "@" substr($0, RSTART+4, RLENGTH-4); exit }')
echo "first option: ${FIRST_OPT:-NOT_FOUND}"
agent-browser click "$FIRST_OPT"
sleep 1.5
agent-browser eval "(function(){ var spoken = (window.__speakCalls || []).map(function(c){return c.t}).filter(function(t){return t && t.trim();}); var shown = spoken.filter(function(t){ return document.body.innerText.indexOf(t) !== -1; }); return 'spoken=' + JSON.stringify(spoken) + ' visible-in-page=' + JSON.stringify(shown); })()"
agent-browser screenshot /tmp/qa-audio-written.png && echo "shot ok"

echo "=== ошибки консоли ==="
agent-browser errors | head -4
echo done
