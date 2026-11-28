#!/bin/bash
# qa-vamos-fixes.sh — QA правок: пул практики, артикли, озвучка, офлайн.
# iPhone 14 (390px): пустой прогресс → подсказка; урок 1 один раз →
# только его слова; RU→ES артикль в скобках + озвучка после проверки;
# PWA: sw.js/manifest; офлайн: страница из runtime-кеша.
set -x
cd /home/z/my-project/vamos

AB="agent-browser"
$AB set device "iPhone 14"

echo "=== 1. ПУСТОЙ ПРОГРЕСС: подсказка «пройдите урок», плитки disabled ==="
$AB open http://localhost:3100/practice > /dev/null
sleep 2
$AB eval "localStorage.removeItem('vamos.progress'); location.reload()" > /dev/null
sleep 2.5
$AB eval "(() => { const a=document.querySelector('.alert span'); const b=[...document.querySelectorAll('button.glass-card')]; return JSON.stringify({alert: a?.textContent.trim().slice(0,60), tiles: b.length, disabled: b.filter(x=>x.disabled).length}) })()"

echo "=== 2. УРОК 1 ПРОЙДЕН ОДИН РАЗ: только его слова в тесте-выборе ==="
# 12 слов урока 1 с correct=1 (прошёл один раз)
$AB eval "
(() => {
  const lesson1 = ['p-yo','p-tu','p-usted','p-el','p-ella','p-nosotros','p-ustedes','p-ellos','p-ellas','v-ser','v-estar','adv-no'];
  const words = {};
  for (const id of lesson1) words[id] = { correct: 1, wrong: 0 };
  localStorage.setItem('vamos.progress', JSON.stringify({
    version: 1, words, phrases: {}, starredPhrases: {}, likedPhrases: {}, hiddenPhrases: {},
    answers: { correct: 0, wrong: 0 }, streakDates: [], achievements: {},
    settings: {}, updatedAt: Date.now()
  }));
  return 'ok'
})()" > /dev/null
$AB reload > /dev/null
sleep 2.5
$AB eval "(() => { const b=[...document.querySelectorAll('button.glass-card')]; return JSON.stringify({tiles: b.length, disabled: b.filter(x=>x.disabled).length, alert: !!document.querySelector('.alert')}) })()"

# Сессия тест-выбора: 12 упражнений, собираем данные направлений и вариантов
$AB eval "[...document.querySelectorAll('button.glass-card')].find(x=>x.textContent.includes('Тест-выбор')).click()" > /dev/null
sleep 1.5
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  $AB eval "
  (() => {
    const qRu = document.querySelector('.card p.text-2xl.font-bold');
    const opts = [...document.querySelectorAll('.grid.grid-cols-2 button span span')].map(s=>s.textContent).join(' | ');
    return 'Q: ' + (qRu?.textContent ?? document.querySelector('h2')?.textContent ?? '?') + ' ||| OPTS: ' + opts
  })()"
  # отвечаем кликом по первому варианту, дальше
  $AB eval "[...document.querySelectorAll('.grid.grid-cols-2 button')][0]?.click()" > /dev/null
  sleep 0.6
  # проверяем зону результата: озвучка для RU→ES (answerWas или слово рядом с ✓)
  $AB eval "
  (() => {
    const btns = [...document.querySelectorAll('.card button')].map(b=>b.textContent.trim());
    const hasSpeak = btns.some(t=>t.includes('🔊'));
    return 'RESULT speak-btn: ' + hasSpeak
  })()"
  $AB eval "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Дальше')?.click()" > /dev/null
  sleep 0.8
done
