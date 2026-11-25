#!/bin/bash
# qa-phrase-quality.sh — QA контента фраз после правок жи-ши/артиклей/сочетаемости.
# На странице «Фразы» (iPhone 14, демо-прогресс уроки 1–26) обходим группы,
# в каждой листаем несколько страниц, декодируем JSON и ищем запрещённое:
# «большые», «una leche», «чёрный фильм», «молоки»…
set -e
cd /home/z/my-project
AB="agent-browser"
mkdir -p .qa-tmp

$AB set device "iPhone 14"
$AB open http://localhost:3100/phrases > /dev/null
sleep 2
$AB storage local set vamos.progress "$(cat /tmp/demo-progress.json)" > /dev/null
$AB reload > /dev/null
sleep 3

GROUPS=("Все группы" "ser/estar" "глагол + дополнение" "глагол + предлог" "модальные глаголы" "gustar" "le/les (получатель)" "there is/are (hay)" "вопросы" "наречия" "числа и время")

rm -f .qa-tmp/qa-phrases-*.txt
i=0
for g in "${GROUPS[@]}"; do
  $AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='$g'); if(b){b.click(); return 'ok'} return 'missing' })()" > /dev/null
  sleep 1.2
  for p in 1 2 3 4 5 6; do
    $AB eval "document.body.innerText" > .qa-tmp/qa-phrases-$i-$p.txt 2>/dev/null
    $AB eval "(() => { const n=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='→'); if(n){n.click(); return 'next'} return 'last' })()" > /dev/null
    sleep 0.8
  done
  i=$((i+1))
done

echo "=== Поиск запрещённых форм в видимых фразах ==="
python3 - <<'EOF'
import json, glob, re
texts = []
for f in glob.glob('.qa-tmp/qa-phrases-*.txt'):
    try:
        texts.append(json.loads(open(f, encoding='utf-8').read()))
    except Exception:
        pass
all_text = '\n'.join(texts)
bad = re.compile(r'большые|плохые|какие |дорогие \(|молоки|una? (leche|azúcar|sal|arroz)|leches|azúcares|arroces|чёрный фильм|чёрное фото|— дорогой|— очень')
hits = sorted(set(bad.findall(all_text)) | {m.group(0) for m in bad.finditer(all_text)})
print('ЗАПРЕЩЁННОЕ:', hits if hits else 'чисто')
good = [s for s in ['Te doy leche', 'Te doy la leche', 'Молоко — дорогое', 'большие', 'плохие'] if s in all_text]
print('ПОЗИТИВНЫЕ ПРИМЕРЫ:', good)
es_lines = [l for l in all_text.split('\n') if re.match(r'^[¿?]?[A-ZÁÉÍÓÚÑa-záéíóúñ]', l) and not l.startswith(('¡Vamos','RU','ES'))]
print('всего испанских строк видно:', len(es_lines))
EOF
