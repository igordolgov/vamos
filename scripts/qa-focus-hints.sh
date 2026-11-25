#!/bin/bash
# qa-focus-hints.sh — QA целевых подсказок при неверной сборке (iPhone 14).
#
# Детерминированный сценарий: минимальный knownSet (qa-io-progress.mjs) +
# практика по уроку → в «Сборке фразы» только шаблоны le/les
# (t-io-dar-np, t-io-escribir-np). Ответ выводится из RU-подсказки:
# io-местоимение — по слову «мне/тебе/ему/им/нам», глагол — единственная
# спряжённая форма в плитках, существительное — по последнему слову
# подсказки (книгу/письмо/подарок/воду). Количество плиток различает
# ответ с артиклем (7–8) и без (5).
#
# Проверки:
# 1) «пропущен артикль» → подсказка 🎯 именно про артикль;
# 2) «пропущен le/les» → подсказка 🎯 про получателя действия;
# 3) страница фраз: группа «le/les (получатель)» — Le doy el libro и т.п.
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

$AB open "http://localhost:$PORT/practice?lesson=4" > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/qa-io-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5

$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('фразы')); b?.click(); return b?'build started':'no-btn' })()"
sleep 1.5

# --- JS: определить упражнение и собрать фразу с одной ошибкой ---
ATTEMPT_JS='(() => {
  const card = [...document.querySelectorAll(".card")].find(c => c.querySelector(".border-dashed"))
  if (!card) return "no-card"
  const h2 = card.querySelector("h2")
  if (!h2) return "no-hint"
  const hint = h2.textContent.trim()
  const pool = [...card.querySelectorAll(".relative button")].filter(b => !b.classList.contains("invisible"))
  const tiles = pool.map(b => b.textContent.trim().toLowerCase())
  const VERB_FORMS = ["doy","das","da","damos","dan","escribo","escribes","escribe","escribimos","escriben"]
  const NOUN_RU = { "книгу":"libro", "письмо":"carta", "подарок":"regalo", "воду":"agua" }
  const IO_RU = { "мне":"me", "тебе":"te", "ему":"le", "им":"les", "нам":"nos" }
  const words = hint.replace(/[?!]/g, "").split(/\s+/).filter(Boolean)
  const neg = words.indexOf("не") >= 0
  const ioTok = words.map(w => IO_RU[w]).find(Boolean)
  const verbTok = tiles.find(t => VERB_FORMS.indexOf(t) >= 0)
  const nounTok = NOUN_RU[words[words.length - 1]]
  if (!verbTok || !nounTok) return "skip:parse:" + hint
  // 5 плиток → ответ без артикля (3 токена): строим без le → 🎯 получатель
  // 7–8 плиток → ответ с артиклем и/или «no»: строим всё кроме артикля → 🎯 артикль
  let strategy, tokens
  if (tiles.length === 5) {
    strategy = "io"
    tokens = neg ? ["no", verbTok, nounTok] : [verbTok, nounTok]
  } else {
    strategy = "article"
    if (!ioTok) return "skip:no-io:" + hint
    tokens = neg ? ["no", ioTok, verbTok, nounTok] : [ioTok, verbTok, nounTok]
  }
  const clickTile = (tok) => {
    const b = [...card.querySelectorAll(".relative button")].find(
      x => x.textContent.trim().toLowerCase() === tok && !x.classList.contains("invisible"))
    if (!b) return false
    b.click()
    return true
  }
  for (const tok of tokens) { if (!clickTile(tok)) return "skip:no-tile:" + tok }
  return JSON.stringify({ strategy: strategy, tokens: tokens, hint: hint, tiles: tiles.length })
})()'

READ_TIP_JS='(() => {
  const card = [...document.querySelectorAll(".card")].find(c => c.querySelector(".border-dashed"))
  const tipBox = card ? card.querySelector(".bg-warning\\/10") : null
  const fb = document.querySelector(".animate-feedback")
  return JSON.stringify({
    noScroll: document.documentElement.scrollHeight <= window.innerHeight + 1,
    wrong: !!(fb && fb.textContent.indexOf("Верный ответ") >= 0),
    correct: !!(fb && fb.textContent.indexOf("Correcto") >= 0),
    tip: tipBox ? [...tipBox.querySelectorAll("p")].map(p => p.textContent.trim()) : []
  })
})()'

CHECK_BTN='(() => { const chk=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Проверить"); chk?.click(); return "checked" })()'
NEXT_BTN='(() => { const nxt=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Дальше"); nxt?.click(); return "next" })()'

ARTICLE_OK=0
IO_OK=0
NO_SCROLL_OK=1
LOG=/tmp/qa-hints-results.txt
> $LOG

for i in $(seq 1 24); do
  RES=$(printf '%s' "$($AB eval "$ATTEMPT_JS" | tr -d '\n')" | sed 's/\\"/"/g; s/^"//; s/"$//')
  case "$RES" in
    no-card)
      # сессия из 10 упражнений кончилась (итоги) — «Ещё сессия»;
      # если экрана итогов нет (страница перезагружена) — reload + меню
      AGAIN=$($AB eval "(() => { const a=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Ещё сессия')); a?.click(); return a?'again':'no-result' })()" | tr -d '"')
      sleep 1.5
      if [ "$AGAIN" != "again" ]; then
        $AB reload > /dev/null; sleep 3
        $AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('фразы')); b?.click(); return 'started' })()" > /dev/null
        sleep 1.5
      fi
      continue ;;
    skip:*)
      echo "attempt $i SKIP: $RES" >> $LOG
      $AB eval "$NEXT_BTN" > /dev/null
      sleep 1
      continue ;;
  esac
  $AB eval "$CHECK_BTN" > /dev/null
  sleep 1.2
  TIP_JSON=$(printf '%s' "$($AB eval "$READ_TIP_JS")" | sed 's/\\"/"/g; s/^"//; s/"$//')
  echo "attempt $i: $RES" >> $LOG
  echo "  -> $TIP_JSON" >> $LOG
  echo "$TIP_JSON" | grep -q '"noScroll":false' && NO_SCROLL_OK=0
  if echo "$TIP_JSON" | grep -q '"wrong":true'; then
    if echo "$RES" | grep -q '"strategy":"article"' && echo "$TIP_JSON" | grep -q '🎯' && echo "$TIP_JSON" | grep -qi 'артикл'; then
      ARTICLE_OK=1
      $AB screenshot /tmp/qa-hint-article.png
      echo "ARTICLE_HINT_OK (attempt $i)" >> $LOG
      $AB eval "$NEXT_BTN" > /dev/null
      sleep 1
    elif echo "$RES" | grep -q '"strategy":"io"' && echo "$TIP_JSON" | grep -q '🎯' && echo "$TIP_JSON" | grep -qi 'получател'; then
      IO_OK=1
      $AB screenshot /tmp/qa-hint-io.png
      echo "IO_HINT_OK (attempt $i)" >> $LOG
      $AB eval "$NEXT_BTN" > /dev/null
      sleep 1
    else
      $AB eval "$NEXT_BTN" > /dev/null
      sleep 1
    fi
  else
    # собран полный ответ (bare + no) — верно, «Дальше»
    $AB eval "$NEXT_BTN" > /dev/null
    sleep 1
  fi
  [ $ARTICLE_OK -eq 1 ] && [ $IO_OK -eq 1 ] && break
done

echo '=============== СТРАНИЦА ФРАЗ: ГРУППА LE/LES ==============='
$AB open "http://localhost:$PORT/phrases" > /dev/null
sleep 2.5
$AB eval "(() => {
  const sel=[...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.textContent.indexOf('le/les') >= 0))
  if (!sel) return 'no-select'
  const opt=[...sel.options].find(o => o.textContent.indexOf('le/les') >= 0)
  sel.value=opt.value
  sel.dispatchEvent(new Event('change'))
  return 'selected'
})()"
sleep 2
$AB eval "(() => {
  const meta=[...document.querySelectorAll('p')].map(p=>p.textContent.trim()).find(t=>t.indexOf('t-io-')===0)
  const rows=[...document.querySelectorAll('.flex.flex-col > div')].slice(0,8).map(d=>d.textContent.trim().replace(/\s+/g,' ').slice(0,90))
  return JSON.stringify({ meta: meta || null, rows: rows }, null, 1)
})()"
$AB screenshot /tmp/qa-io-phrases.png

echo '=== console/errors ==='
$AB errors
echo "=== RESULTS ==="
cat $LOG
echo "FINAL: ARTICLE_OK=$ARTICLE_OK IO_OK=$IO_OK NO_SCROLL_OK=$NO_SCROLL_OK"
