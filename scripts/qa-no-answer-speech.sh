#!/usr/bin/env bash
# QA: после ответа автоматической озвучки быть не должно (убрали).
# Ожидания:
#   старт аудио-сессии        → озвучка НОВОГО вопроса есть (feature ae9e386)
#   НЕверный ответ            → 0 новых озвучек
#   «Дальше»                  → озвучка нового аудио-вопроса ровно 1
#   сборка + «Проверить»      → 0 новых озвучек
# ВАЖНО: awk здесь mawk — кириллицу (tolower, regex) не понимает,
# поэтому извлечение refs только через grep/sed.
# Сервер и все шаги — в одной сессии; ref-формат [ref=eN] → click @eN.
set -u
cd /home/z/my-project

# первый ref кнопки-варианта (исключая служебные кнопки)
first_opt_ref() {
  agent-browser snapshot \
    | sed -n 's/.*button "[^"]*" \[ref=\(e[0-9]*\)\].*/\1|&/p' \
    | grep -v "Прослушайте\|Уже выучил\|Проверить\|Дальше\|Тема\|Записать" \
    | head -1 | grep -oE '\be[0-9]+' | head -1 | sed 's/^/@/'
}
ref_of() { grep -i "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/'; }
calls() { agent-browser eval "(window.__speakCalls || []).length"; }
spy() {
  agent-browser eval "(function(){ try { window.__speakCalls = []; var o = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = function(u){ window.__speakCalls.push({t: u && u.text, v: u && u.volume}); return o(u); }; return 'spied'; } catch(e) { return 'no-speech: ' + e.message; } })()"
}
# отписать dev-SW и перезагрузиться (иначе он перезагрузит страницу сам)
sw_dance() {
  agent-browser eval "(function(){ if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); return 'unreg'; } return 'no-sw'; })()" >/dev/null
  agent-browser reload >/dev/null
  sleep 5
}

# 1) чистый dev-сервер (во время сборки Nitro отдаёт 503 — ждём 200)
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
sw_dance
echo "sw: $(agent-browser eval "navigator.serviceWorker.controller ? 'controlled' : 'none'")"
spy

# ============ A. Аудио-сессия ============
REF=$(agent-browser snapshot | ref_of "Аудио")
echo "audio btn: ${REF:-NOT_FOUND}"
agent-browser click "$REF"
sleep 3.5   # speakEs ждёт голоса до ~2 c
A0=$(calls)
echo "A0 (старт аудио, ожид >=2: unlock + слово): $A0"

FIRST=$(first_opt_ref)
echo "first option: ${FIRST:-NOT_FOUND}"
agent-browser click "$FIRST" 2>/dev/null
sleep 1
A1=$(calls)
echo "A1 (после ответа, ожид ==A0): $A1"

NEXT=$(agent-browser snapshot | ref_of "Дальше")
agent-browser click "$NEXT" 2>/dev/null
sleep 3.5
A2=$(calls)
echo "A2 (после «Дальше», ожид ==A1+1): $A2"

FIRST2=$(first_opt_ref)
agent-browser click "$FIRST2" 2>/dev/null
sleep 1
A3=$(calls)
echo "A3 (после второго ответа, ожид ==A2): $A3"

# ============ B. Сборка фразы ============
agent-browser storage local set vamos.progress "$(cat /tmp/demo-progress.json)" >/dev/null
sw_dance
spy
REFB=$(agent-browser snapshot | ref_of "Сборка фразы")
echo "build btn: ${REFB:-NOT_FOUND}"
agent-browser click "$REFB"
sleep 1
B0=$(calls)
echo "B0 (старт сборки, ожид 1: unlock): $B0"

# две первые плитки (кнопки, кроме «Проверить»)
for n in 1 2; do
  T=$(agent-browser snapshot \
    | sed -n 's/.*button "[^"]*" \[ref=\(e[0-9]*\)\].*/\1|&/p' \
    | grep -v "Проверить\|Дальше\|Уже выучил\|Тема" \
    | sed -n "${n}p" | grep -oE '\be[0-9]+' | head -1 | sed 's/^/@/')
  [ -n "$T" ] && agent-browser click "$T" 2>/dev/null
  sleep 0.5
done
CHK=$(agent-browser snapshot | ref_of "Проверить")
agent-browser click "$CHK" 2>/dev/null
sleep 1
B1=$(calls)
echo "B1 (после «Проверить», ожид ==B0): $B1"

echo "--- speaks: $(agent-browser eval "JSON.stringify(window.__speakCalls || [])" | head -c 700)"
echo "console errors:"
agent-browser errors
agent-browser screenshot /tmp/qa-no-answer-speech.png >/dev/null && echo "screenshot ok"

# итог: A1==A0, A3==A2, B1==B0 → успех
if [ "$A1" = "$A0" ] && [ "$A3" = "$A2" ] && [ "$B1" = "$B0" ] && [ "$A2" -gt "$A1" ]; then
  echo "PASS"
else
  echo "FAIL"
  exit 1
fi
