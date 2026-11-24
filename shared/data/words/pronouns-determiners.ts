// ============================================================
// shared/data/words/pronouns-determiners.ts
// Местоимения, артикли, притяжательные, указательные, количество.
//
// Латиноамериканская особенность: vosotros НЕ используется,
// для «вы» (множественного) — ustedes. Формальное «вы» (вежливое)
// — usted, глагол с ним спрягается в 3-м лице ед.ч.
// ============================================================

import type { Word } from '../../types'
import { d, p } from './helpers'

/** Местоимения-подлежащие (урок 1) и дополнения (урок 25) */
export const PRONOUNS: Word[] = [
  // --- Подлежащие: определяют лицо глагола ---
  // ruGen — родительный падеж для русской конструкции «У меня есть…»
  p('p-yo', 'yo', ['я'], 1, { role: 'subject', person: '1s', impliedGender: 'm', impliedNumber: 'sg', ruGen: 'меня', ruDat: 'мне' }),
  p('p-tu', 'tú', ['ты'], 1, { role: 'subject', person: '2s', impliedGender: 'm', impliedNumber: 'sg', ruGen: 'тебя', ruDat: 'тебе' }, {
    ruHint: 'В Латинской Америке с друзьями и семьёй; «вы» (вежливое) — usted',
  }),
  p('p-usted', 'usted', ['вы (вежливо)'], 1, { role: 'subject', person: '3s', impliedGender: 'm', impliedNumber: 'sg', ruGen: 'вас', ruDat: 'вам' }, {
    ruHint: 'Глагол в форме 3-го лица ед.ч.: usted habla',
  }),
  p('p-el', 'él', ['он'], 1, { role: 'subject', person: '3s', impliedGender: 'm', impliedNumber: 'sg', ruGen: 'него', ruDat: 'ему' }),
  p('p-ella', 'ella', ['она'], 1, { role: 'subject', person: '3s', impliedGender: 'f', impliedNumber: 'sg', ruGen: 'неё', ruDat: 'ей' }),
  p('p-nosotros', 'nosotros', ['мы'], 1, { role: 'subject', person: '1p', impliedGender: 'm', impliedNumber: 'pl', ruGen: 'нас', ruDat: 'нам' }),
  p('p-ustedes', 'ustedes', ['вы (мн.ч.)'], 1, { role: 'subject', person: '3p', impliedGender: 'm', impliedNumber: 'pl', ruGen: 'вас', ruDat: 'вам' }, {
    ruHint: 'В Латинской Америке единственная форма «вы» для мн.ч. (vosotros не используется)',
  }),
  p('p-ellos', 'ellos', ['они (муж.)'], 1, { role: 'subject', person: '3p', impliedGender: 'm', impliedNumber: 'pl', ruGen: 'них', ruDat: 'им' }),
  p('p-ellas', 'ellas', ['они (жен.)'], 1, { role: 'subject', person: '3p', impliedGender: 'f', impliedNumber: 'pl', ruGen: 'них' }),

  // --- Местоимения-дополнения (урок 25) ---
  p('p-me', 'me', ['мне', 'меня'], 25, { role: 'object', io: true }, { ruHint: 'me gusta — мне нравится' }),
  p('p-te', 'te', ['тебе', 'тебя'], 25, { role: 'object', io: true }),
  p('p-le', 'le', ['ему', 'ей', 'вам'], 25, { role: 'object', io: true }),
  p('p-les', 'les', ['им', 'вам (мн.)'], 25, { role: 'object', io: true }),
  p('p-nos', 'nos', ['нам', 'нас'], 25, { role: 'object', io: true }),
  p('p-lo', 'lo', ['его', 'это'], 25, { role: 'object' }),
  p('p-la', 'la', ['её'], 25, { role: 'object' }),
  p('p-los', 'los', ['их (муж.)'], 25, { role: 'object' }),
  p('p-las', 'las', ['их (жен.)'], 25, { role: 'object' }),

  // --- Притяжательные (урок 24): согласуются в числе ---
  p('p-mi', 'mi', ['мой', 'моя'], 24, { role: 'possessive', forms: { m: 'mi', f: 'mi', mp: 'mis', fp: 'mis' } }),
  p('p-tu-pos', 'tu', ['твой', 'твоя'], 24, { role: 'possessive', forms: { m: 'tu', f: 'tu', mp: 'tus', fp: 'tus' } }),
  p('p-su', 'su', ['его', 'её', 'их', 'ваш'], 24, { role: 'possessive', forms: { m: 'su', f: 'su', mp: 'sus', fp: 'sus' } }),
  p('p-nuestro', 'nuestro', ['наш'], 24, { role: 'possessive', forms: { m: 'nuestro', f: 'nuestra', mp: 'nuestros', fp: 'nuestras' } }),

  // --- Указательные (урок 24) ---
  p('p-este', 'este', ['этот'], 24, { role: 'demonstrative', forms: { m: 'este', f: 'esta', mp: 'estos', fp: 'estas' } }),
  p('p-ese', 'ese', ['тот', 'этот (рядом с тобой)'], 24, { role: 'demonstrative', forms: { m: 'ese', f: 'esa', mp: 'esos', fp: 'esas' } }),

  // --- Неопределённые (урок 25) ---
  p('p-algo', 'algo', ['что-то', 'что-нибудь'], 25, { role: 'indefinite' }),
  p('p-nada', 'nada', ['ничего'], 25, { role: 'indefinite' }, { ruHint: 'С глаголом обязательно «no»: No veo nada' }),
  p('p-alguien', 'alguien', ['кто-то', 'кто-нибудь'], 25, { role: 'indefinite' }),
  p('p-nadie', 'nadie', ['никто'], 25, { role: 'indefinite' }, { ruHint: 'No conozco a nadie — Я никого не знаю' }),
  p('p-todo', 'todo', ['всё', 'весь'], 25, { role: 'indefinite', forms: { m: 'todo', f: 'toda', mp: 'todos', fp: 'todas' } }),
]

/** Артикли и определители количества (урок 2) */
export const DETERMINERS: Word[] = [
  d('d-el', 'el', ['(м.р.)'], 2, { gender: 'm', number: 'sg', definite: true }, { ruHint: 'определённый артикль мужского рода' }),
  d('d-la', 'la', ['(ж.р.)'], 2, { gender: 'f', number: 'sg', definite: true }, { ruHint: 'определённый артикль женского рода' }),
  d('d-los', 'los', ['(м.р. мн.)'], 2, { gender: 'm', number: 'pl', definite: true }, { ruHint: 'определённый артикль мужского рода, мн. ч.' }),
  d('d-las', 'las', ['(ж.р. мн.)'], 2, { gender: 'f', number: 'pl', definite: true }, { ruHint: 'определённый артикль женского рода, мн. ч.' }),
  d('d-un', 'un', ['один', 'какой-то (м.р.)'], 2, { gender: 'm', number: 'sg', indefinite: true }, { ruHint: 'неопределённый артикль мужского рода' }),
  d('d-una', 'una', ['одна', 'какая-то (ж.р.)'], 2, { gender: 'f', number: 'sg', indefinite: true }, { ruHint: 'неопределённый артикль женского рода' }),
  d('d-unos', 'unos', ['несколько (м.р.)'], 2, { gender: 'm', number: 'pl', indefinite: true }, { ruHint: 'неопределённый артикль мужского рода, мн. ч.' }),
  d('d-unas', 'unas', ['несколько (ж.р.)'], 2, { gender: 'f', number: 'pl', indefinite: true }, { ruHint: 'неопределённый артикль женского рода, мн. ч.' }),

  // Количество: согласуются как прилагательные
  d('d-mucho', 'mucho', ['много'], 2, { quantity: true }, {
    adj: { m: 'mucho', f: 'mucha', mp: 'muchos', fp: 'muchas' },
    ruHint: 'mucho trabajo, mucha gente, muchos libros',
  }),
  d('d-poco', 'poco', ['мало'], 2, { quantity: true }, {
    adj: { m: 'poco', f: 'poca', mp: 'pocos', fp: 'pocas' },
  }),
]
