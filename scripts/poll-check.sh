#!/bin/bash
# poll-check.sh — поллинг check-run «Workers Builds: vamos» по SHA последнего коммита.
# Токен берётся из remote URL и никогда не печатается.
set -e
cd /home/z/my-project
SHA=$(git rev-parse HEAD)
T=$(git config --get remote.origin.url | sed -n 's#https://[^:]*:\([^@]*\)@github.com.*#\1#p')
if [ -z "$T" ]; then echo "токен не найден"; exit 1; fi
for i in $(seq 1 30); do
  R=$(curl -s -H "Authorization: token $T" \
    "https://api.github.com/repos/igordolgov/vamos/commits/$SHA/check-runs" \
    | python3 -c "
import json,sys
d=json.load(sys.stdin)
for c in d.get('check_runs',[]):
    if 'Workers Builds' in c.get('name',''):
        print(c.get('status',''), c.get('conclusion') or '-')
        break
")
  echo "[$i] $R"
  if echo "$R" | grep -q "completed"; then
    if echo "$R" | grep -q "success"; then echo "CHECK_OK"; else echo "CHECK_FAILED"; exit 1; fi
    exit 0
  fi
  sleep 20
done
echo "TIMEOUT"; exit 1
