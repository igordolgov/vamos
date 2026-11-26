#!/bin/bash
# qa-queued-fixes.sh — QA раунда: gustar «(вообще)», формы gustar, подписи лиц,
# neg-tener «La hija no tiene tiempo», исчезновение «no tiene poco tiempo».
#   1) карточка gustar: парадигма gusto…gustan, подписи él/ella/Ud., ellos/ellas/Uds.
#   2) карточка hablar: подпись él/ella/Ud. вместо «usted»
#   3) страница Фразы: пары «(вообще)» ↔ Me gusta el…, «нет времени» без poco
#   4) негатив: «no tiene poco/mucho» и «gusta un/una» не встречаются
set -e
cd /home/z/my-project
PORT=3101
export PORT
node .output/server/index.mjs > /tmp/vamos-server.log 2>&1 &
SRV=$!
sleep 3
trap "kill $SRV 2>/dev/null" EXIT
curl -s -o /dev/null -w "server: %{http_code}\n" http://localhost:$PORT/ || exit 1
AB="agent-browser"
mkdir -p .qa-tmp
$AB set device "iPhone 14"

echo "=== 1. Карточка gustar: формы и подписи лиц ==="
$AB open http://localhost:$PORT/words > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 2.5
$AB eval "(() => { const inp=[...document.querySelectorAll('input[type=search]')][0]; inp.value='gustar'; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()" > /dev/null
sleep 0.8
$AB eval "(() => { const c=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h3')?.textContent.trim()==='gustar'); if(!c) return 'NO CARD'; const t=c.innerText.replace(/\n/g,' '); return JSON.stringify({ gusto:t.includes('gusto'), gustas:t.includes('gustas'), gusta:t.includes('gusta '), gustamos:t.includes('gustamos'), gustais:t.includes('gustáis'), gustan:t.includes('gustan'), elElla:t.includes('él/ella/Ud.'), ellosEllas:t.includes('ellos/ellas/Uds.'), oldUstedLabel:/usted[^\//]/.test(t), conjLabel:t.includes('Спряжение') }) })()"

echo "=== 2. Карточка hablar: él/ella/Ud. + vosotros ==="
$AB eval "(() => { const inp=[...document.querySelectorAll('input[type=search]')][0]; inp.value='hablar'; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()" > /dev/null
sleep 0.8
$AB eval "(() => { const c=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h3')?.textContent.trim()==='hablar'); if(!c) return 'NO CARD'; const t=c.innerText.replace(/\n/g,' '); return JSON.stringify({ elElla:t.includes('él/ella/Ud.'), ellosEllas:t.includes('ellos/ellas/Uds.'), hablais:t.includes('habláis'), conjLabel:t.includes('Спряжение') }) })()"
$AB screenshot /tmp/qa-gustar-card.png > /dev/null

echo "=== 3. Фразы: обход групп, сбор текста ==="
$AB open http://localhost:$PORT/phrases > /dev/null
sleep 2
QGROUPS=("Все группы" "ser/estar" "глагол + дополнение" "глагол + предлог" "модальные глаголы" "gustar" "le/les (получатель)" "there is/are (hay)" "вопросы" "наречия" "числа и время")
rm -f .qa-tmp/qa-queued-*.txt
i=0
for g in "${QGROUPS[@]}"; do
  $AB eval "(() => { const g='$g'; const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value===g||o.textContent.trim()===g)); if(!s) return 'no select'; const o=[...s.options].find(o=>o.value===g||o.textContent.trim()===g); s.value=o.value; s.dispatchEvent(new Event('change',{bubbles:true})); return 'ok' })()" > /dev/null
  sleep 1.2
  for p in 1 2 3 4 5 6 7 8; do
    $AB eval "document.body.innerText" > .qa-tmp/qa-queued-$i-$p.txt 2>/dev/null
    $AB eval "(() => { const n=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='→'); if(n){n.click(); return 'next'} return 'last' })()" > /dev/null
    sleep 0.7
  done
  i=$((i+1))
done

python3 - <<'EOF'
import json, glob, re
texts = []
for f in glob.glob('.qa-tmp/qa-queued-*.txt'):
    try: texts.append(json.loads(open(f, encoding='utf-8').read()))
    except Exception: pass
T = '\n'.join(texts)

print('=== 4. Позитив: маркер «(вообще)» и gustan-пары ===')
marked = re.findall(r'[^\n]*\(вообще\)[^\n]*', T)
print('строк с «(вообще)»:', len(marked))
for s in marked[:4]: print('  ', s.strip())
es_marked = [s for s in marked if re.search(r'\b(el|la|los|las)\b', s)]
print('из них с el/la рядом:', len(es_marked))

print('=== 5. Негатив: запрещённое не встречается ===')
bad = re.findall(r'no (?:tengo|tienes|tiene|tenemos|tienen) (?:el |la |los |las |mucho |mucha |poco |poca )\S+', T)
print('«no tengoX el/la/mucho/poco …»:', sorted(set(bad)) if bad else 'чисто')
bad2 = re.findall(r'\b(?:me|te|le|les|nos)\s+gust\w*\s+(?:un|una|unos|unas)\b', T, re.I)
print('«gusta un/una …»:', sorted(set(bad2)) if bad2 else 'чисто')
bad3 = re.findall(r'\w* ropas\b', T)
print('«ropas»:', sorted(set(bad3)) if bad3 else 'чисто')

print('=== 6. Позитив: neg-tener пары ===')
pairs = re.findall(r'(У (?:меня|тебя|него|неё|нас|вас|них) нет [^\n]+)', T)
print('«У … нет …» строк:', len(pairs))
for s in pairs[:3]: print('  ', s.strip())
es_neg = re.findall(r'[^\n]*no (?:tengo|tienes|tiene|tenemos|tienen) [^\n]*', T)
print('neg-tener ES строк видно:', len(es_neg))
time_pair = [s for s in es_neg if 'tiempo' in s]
for s in time_pair[:3]: print('  tiempo:', s.strip())
EOF

echo "=== 7. Скриншот страницы фраз (группа gustar) ==="
$AB eval "(() => { const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value==='gustar'||o.textContent.trim()==='gustar')); if(s){const o=[...s.options].find(o=>o.value==='gustar'||o.textContent.trim()==='gustar'); s.value=o.value; s.dispatchEvent(new Event('change',{bubbles:true}))} return 'ok' })()" > /dev/null
sleep 1.5
$AB screenshot /tmp/qa-phrases-gustar.png > /dev/null
echo "screenshots saved"
