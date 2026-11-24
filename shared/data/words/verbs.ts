// ============================================================
// shared/data/words/verbs.ts — глаголы в настоящем времени.
//
// Испанские формы записаны явно (защита от ошибок в неправильных
// глаголах и «эталон» для тестов).
// Порядок испанских форм: [yo, tú, usted/él/ella, nosotros, ustedes/ellos]
// Порядок русских форм:   [я,  ты, он/она,        мы,       они]
// ============================================================

import type { Word } from '../../types'
import { forms, v } from './helpers'

export const VERBS: Word[] = [
  // ===== Урок 3: ser / estar — главные глаголы =====
  v('v-ser', 'ser', ['быть (постоянный признак)'], 3, {
    forms: forms(['soy', 'eres', 'es', 'somos', 'son']),
    transitive: false,
    ruInf: 'быть',
  }, { ruHint: 'Постоянные свойства: профессия, национальность, качество. yo soy, tú eres, él es…' }),

  v('v-estar', 'estar', ['быть (состояние/место)'], 3, {
    forms: forms(['estoy', 'estás', 'está', 'estamos', 'están']),
    withPrep: ['prep-en'],
    placeAdv: true,
    ruInf: 'находиться',
  }, { ruHint: 'Местоположение и состояние: estoy en casa, estás cansado' }),

  // ===== Урок 4: базовые правильные глаголы =====
  v('v-hablar', 'hablar', ['говорить', 'разговаривать'], 4, {
    transitive: true,
    withPrep: ['prep-con', 'prep-sobre'],
    ruInf: 'говорить',
    ruForms: ['говорю', 'говоришь', 'говорит', 'говорим', 'говорите', 'говорят'],
  }, { ruHint: 'hablo español — говорю по-испански (язык без предлога)' }),

  v('v-comer', 'comer', ['есть'], 4, {
    transitive: true,
    objClasses: ['food', 'drink'],
    ruInf: 'есть',
    ruForms: ['ем', 'ешь', 'ест', 'едим', 'едите', 'едят'],
  }),

  v('v-vivir', 'vivir', ['жить'], 4, {
    withPrep: ['prep-en'],
    placeAdv: true,
    ruInf: 'жить',
    ruForms: ['живу', 'живёшь', 'живёт', 'живём', 'живёте', 'живут'],
  }),

  v('v-trabajar', 'trabajar', ['работать'], 4, {
    withPrep: ['prep-en', 'prep-para'],
    placeAdv: true,
    ruInf: 'работать',
    ruForms: ['работаю', 'работаешь', 'работает', 'работаем', 'работаете', 'работают'],
  }),

  v('v-estudiar', 'estudiar', ['учиться', 'изучать'], 4, {
    transitive: true,
    objClasses: ['language', 'abstract'],
    ruInf: 'учить',
    ruForms: ['учусь', 'учишься', 'учится', 'учимся', 'учитесь', 'учатся'],
  }),

  v('v-aprender', 'aprender', ['учить (что-то), усваивать'], 4, {
    transitive: true,
    objClasses: ['language', 'abstract'],
    ruInf: 'учить',
    ruForms: ['учу', 'учишь', 'учит', 'учим', 'учите', 'учат'],
  }),

  v('v-leer', 'leer', ['читать'], 4, {
    transitive: true,
    objClasses: ['thing', 'abstract'],
    gerund: 'leyendo',
    ruInf: 'читать',
    ruForms: ['читаю', 'читаешь', 'читает', 'читаем', 'читаете', 'читают'],
  }),

  v('v-escribir', 'escribir', ['писать'], 4, {
    transitive: true,
    objClasses: ['thing', 'abstract'],
    ruInf: 'писать',
    ruForms: ['пишу', 'пишешь', 'пишет', 'пишем', 'пишете', 'пишут'],
  }),

  // ===== Урок 5: ключевые неправильные глаголы =====
  v('v-tener', 'tener', ['иметь'], 5, {
    forms: forms(['tengo', 'tienes', 'tiene', 'tenemos', 'tienen']),
    transitive: true,
    objClasses: ['thing', 'food', 'drink', 'abstract'],
    ruInf: 'иметь',
    ruForms: ['имею', 'имеешь', 'имеет', 'имеем', 'имеете', 'имеют'],
  }, { ruHint: 'tener … años — возраст: tengo 20 años. В переводе: «У меня есть…»' }),

  v('v-hacer', 'hacer', ['делать'], 5, {
    forms: forms(['hago', 'haces', 'hace', 'hacemos', 'hacen']),
    transitive: true,
    objClasses: ['thing', 'food', 'abstract'],
    ruInf: 'делать',
    ruForms: ['делаю', 'делаешь', 'делает', 'делаем', 'делаете', 'делают'],
  }),

  v('v-ir', 'ir', ['идти', 'ехать'], 5, {
    forms: forms(['voy', 'vas', 'va', 'vamos', 'van']),
    withPrep: ['prep-a', 'prep-hasta'],
    gerund: 'yendo',
    ruInf: 'идти',
    ruForms: ['иду', 'идёшь', 'идёт', 'идём', 'идёте', 'идут'],
  }, { ruHint: 'ir a + место: voy a la escuela; ir a + инфинитив: voy a comer' }),

  v('v-poder', 'poder', ['мочь'], 5, {
    forms: forms(['puedo', 'puedes', 'puede', 'podemos', 'pueden']),
    modal: true,
    gerund: 'pudiendo',
    ruInf: 'мочь',
    ruForms: ['могу', 'можешь', 'может', 'можем', 'можете', 'могут'],
  }, { ruHint: 'poder + инфинитив: puedo hablar' }),

  v('v-querer', 'querer', ['хотеть', 'любить'], 5, {
    forms: forms(['quiero', 'quieres', 'quiere', 'queremos', 'quieren']),
    modal: true,
    transitive: true,
    objClasses: ['thing', 'food', 'drink', 'abstract'],
    ruInf: 'хотеть',
    ruForms: ['хочу', 'хочешь', 'хочет', 'хотим', 'хотите', 'хотят'],
  }, { ruHint: 'querer + инфинитив: quiero comer; te quiero — я тебя люблю' }),

  v('v-saber', 'saber', ['знать'], 5, {
    forms: forms(['sé', 'sabes', 'sabe', 'sabemos', 'saben']),
    ruInf: 'знать',
    ruForms: ['знаю', 'знаешь', 'знает', 'знаем', 'знаете', 'знают'],
  }),

  v('v-ver', 'ver', ['видеть'], 5, {
    forms: forms(['veo', 'ves', 've', 'vemos', 'ven']),
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'видеть',
    ruForms: ['вижу', 'видишь', 'видит', 'видим', 'видите', 'видят'],
  }),

  v('v-dar', 'dar', ['давать'], 5, {
    forms: forms(['doy', 'das', 'da', 'damos', 'dan']),
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'давать',
    ruForms: ['даю', 'даёшь', 'даёт', 'даём', 'даёте', 'дают'],
  }),

  // ===== Урок 26: gustar — «нравиться» =====
  v('v-gustar', 'gustar', ['нравиться'], 26, {
    // У gustar согласование идёт с предметом: me gusta (ед.ч.) / me gustan (мн.ч.)
    forms: forms(['gusta', 'gusta', 'gusta', 'gustamos', 'gustan']),
    special: 'gustar',
  }, { ruHint: 'me gusta la música, me gustan los libros' }),

  // ===== Урок 27: частотные глаголы II =====
  v('v-beber', 'beber', ['пить'], 27, {
    transitive: true,
    objClasses: ['drink'],
    ruInf: 'пить',
    ruForms: ['пью', 'пьёшь', 'пьёт', 'пьём', 'пьёте', 'пьют'],
  }, { esAlt: ['tomar'], ruHint: 'В Латинской Америке чаще говорят tomar' }),

  v('v-abrir', 'abrir', ['открывать'], 27, {
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'открывать',
    ruForms: ['открываю', 'открываешь', 'открывает', 'открываем', 'открываете', 'открывают'],
  }),

  v('v-cerrar', 'cerrar', ['закрывать'], 27, {
    forms: forms(['cierro', 'cierras', 'cierra', 'cerramos', 'cierran']),
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'закрывать',
    ruForms: ['закрываю', 'закрываешь', 'закрывает', 'закрываем', 'закрываете', 'закрывают'],
  }, { ruHint: 'e → ie: cierra la puerta' }),

  v('v-empezar', 'empezar', ['начинать'], 27, {
    forms: forms(['empiezo', 'empiezas', 'empieza', 'empezamos', 'empiezan']),
    transitive: true,
    objClasses: ['thing', 'abstract'],
    ruInf: 'начинать',
    ruForms: ['начинаю', 'начинаешь', 'начинает', 'начинаем', 'начинаете', 'начинают'],
  }),

  v('v-terminar', 'terminar', ['заканчивать'], 27, {
    transitive: true,
    objClasses: ['thing', 'abstract'],
    ruInf: 'заканчивать',
    ruForms: ['заканчиваю', 'заканчиваешь', 'заканчивает', 'заканчиваем', 'заканчиваете', 'заканчивают'],
  }),

  v('v-entender', 'entender', ['понимать'], 27, {
    forms: forms(['entiendo', 'entiendes', 'entiende', 'entendemos', 'entienden']),
    ruInf: 'понимать',
    ruForms: ['понимаю', 'понимаешь', 'понимает', 'понимаем', 'понимаете', 'понимают'],
  }, { ruHint: 'e → ie: entiendo' }),

  v('v-recordar', 'recordar', ['помнить', 'вспоминать'], 27, {
    forms: forms(['recuerdo', 'recuerdas', 'recuerda', 'recordamos', 'recuerdan']),
    transitive: true,
    objClasses: ['abstract', 'thing'],
    ruInf: 'помнить',
    ruForms: ['помню', 'помнишь', 'помнит', 'помним', 'помните', 'помнят'],
  }, { ruHint: 'o → ue: recuerdo' }),

  v('v-ayudar', 'ayudar', ['помогать'], 27, {
    transitive: true,
    ruInf: 'помогать',
    ruForms: ['помогаю', 'помогаешь', 'помогает', 'помогаем', 'помогаете', 'помогают'],
  }, { ruHint: 'Помощь человеку: ayudar a la familia — «помогаю семье» (по-русски кому?)' }),

  v('v-necesitar', 'necesitar', ['нуждаться', 'надо'], 27, {
    transitive: true,
    objClasses: ['thing', 'abstract'],
    modal: true,
    ruInf: 'нуждаться',
    ruForms: ['нуждаюсь', 'нуждаешься', 'нуждается', 'нуждаемся', 'нуждаетесь', 'нуждаются'],
  }, { ruHint: 'necesito hablar — мне нужно поговорить' }),

  v('v-buscar', 'buscar', ['искать'], 27, {
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'искать',
    ruForms: ['ищу', 'ищешь', 'ищет', 'ищем', 'ищете', 'ищут'],
  }),

  v('v-esperar', 'esperar', ['ждать', 'надеяться'], 27, {
    transitive: true,
    objClasses: ['thing', 'abstract'],
    ruInf: 'ждать',
    ruForms: ['жду', 'ждёшь', 'ждёт', 'ждём', 'ждёте', 'ждут'],
  }),

  // ===== Урок 28: частотные глаголы III =====
  v('v-usar', 'usar', ['использовать'], 28, {
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'использовать',
    ruForms: ['использую', 'используешь', 'использует', 'используем', 'используете', 'используют'],
  }),

  v('v-llevar', 'llevar', ['носить', 'везти'], 28, {
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'носить',
    ruForms: ['ношу', 'носишь', 'носит', 'носим', 'носите', 'носят'],
  }),

  v('v-dejar', 'dejar', ['оставлять'], 28, {
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'оставлять',
    ruForms: ['оставляю', 'оставляешь', 'оставляет', 'оставляем', 'оставляете', 'оставляют'],
  }),

  v('v-pasar', 'pasar', ['происходить', 'проходить'], 28, {
    ruInf: 'происходить',
    ruForms: ['происхожу', 'происходишь', 'происходит', 'происходим', 'происходите', 'происходят'],
  }, { ruHint: '¿Qué pasa? — Что происходит?' }),

  v('v-creer', 'creer', ['считать', 'верить'], 28, {
    transitive: true,
    objClasses: ['abstract'],
    gerund: 'creyendo',
    ruInf: 'считать',
    ruForms: ['считаю', 'считаешь', 'считает', 'считаем', 'считаете', 'считают'],
  }),

  v('v-pensar', 'pensar', ['думать'], 28, {
    forms: forms(['pienso', 'piensas', 'piensa', 'pensamos', 'piensan']),
    withPrep: ['prep-en'],
    ruInf: 'думать',
    ruForms: ['думаю', 'думаешь', 'думает', 'думаем', 'думаете', 'думают'],
  }, { ruHint: 'pensar en la familia — думаю о семье' }),

  v('v-llegar', 'llegar', ['прибывать', 'приходить'], 28, {
    withPrep: ['prep-a'],
    ruInf: 'приезжать',
    ruForms: ['приезжаю', 'приезжаешь', 'приезжает', 'приезжаем', 'приезжаете', 'приезжают'],
  }),

  v('v-salir', 'salir', ['выходить', 'уходить'], 28, {
    forms: forms(['salgo', 'sales', 'sale', 'salimos', 'salen']),
    withPrep: ['prep-de'],
    ruInf: 'выходить',
    ruForms: ['выхожу', 'выходишь', 'выходит', 'выходим', 'выходите', 'выходят'],
  }),

  v('v-volver', 'volver', ['возвращаться'], 28, {
    forms: forms(['vuelvo', 'vuelves', 'vuelve', 'volvemos', 'vuelven']),
    withPrep: ['prep-a'],
    ruInf: 'возвращаться',
    ruForms: ['возвращаюсь', 'возвращаешься', 'возвращается', 'возвращаемся', 'возвращаетесь', 'возвращаются'],
  }, { ruHint: 'o → ue: vuelvo' }),

  v('v-pagar', 'pagar', ['платить'], 28, {
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'платить',
    ruForms: ['плачу', 'платишь', 'платит', 'платим', 'платите', 'платят'],
  }),

  v('v-llamar', 'llamar', ['звонить', 'звать'], 28, {
    transitive: true,
    ruInf: 'звонить',
    ruForms: ['звоню', 'звонишь', 'звонит', 'звоним', 'звоните', 'звонят'],
  }, { ruHint: 'Llamo a mi amigo — звоню другу' }),

  // ===== Урок 29: неправильные глаголы =====
  v('v-decir', 'decir', ['говорить', 'сказать'], 29, {
    forms: forms(['digo', 'dices', 'dice', 'decimos', 'dicen']),
    transitive: true,
    objClasses: ['abstract'],
    gerund: 'diciendo',
    ruInf: 'сказать',
    ruForms: ['говорю', 'говоришь', 'говорит', 'говорим', 'говорите', 'говорят'],
  }),

  v('v-venir', 'venir', ['приходить', 'приезжать'], 29, {
    forms: forms(['vengo', 'vienes', 'viene', 'venimos', 'vienen']),
    withPrep: ['prep-de', 'prep-a'],
    gerund: 'viniendo',
    ruInf: 'приходить',
    ruForms: ['прихожу', 'приходишь', 'приходит', 'приходим', 'приходите', 'приходят'],
  }),

  v('v-poner', 'poner', ['класть', 'ставить'], 29, {
    forms: forms(['pongo', 'pones', 'pone', 'ponemos', 'ponen']),
    transitive: true,
    objClasses: ['thing'],
    ruInf: 'класть',
    ruForms: ['кладу', 'кладёшь', 'кладёт', 'кладём', 'кладёте', 'кладут'],
  }),

  v('v-dormir', 'dormir', ['спать'], 29, {
    forms: forms(['duermo', 'duermes', 'duerme', 'dormimos', 'duermen']),
    gerund: 'durmiendo',
    ruInf: 'спать',
    ruForms: ['сплю', 'спишь', 'спит', 'спим', 'спите', 'спят'],
  }, { ruHint: 'o → ue: duermo' }),

  v('v-pedir', 'pedir', ['просить', 'заказывать'], 29, {
    forms: forms(['pido', 'pides', 'pide', 'pedimos', 'piden']),
    transitive: true,
    objClasses: ['food', 'drink'],
    gerund: 'pidiendo',
    ruInf: 'заказывать',
    ruForms: ['заказываю', 'заказываешь', 'заказывает', 'заказываем', 'заказываете', 'заказывают'],
  }, { ruHint: 'e → i: pido' }),

  v('v-seguir', 'seguir', ['следовать', 'продолжать'], 29, {
    forms: forms(['sigo', 'sigues', 'sigue', 'seguimos', 'siguen']),
    gerund: 'siguiendo',
    ruInf: 'продолжать',
    ruForms: ['продолжаю', 'продолжаешь', 'продолжает', 'продолжаем', 'продолжаете', 'продолжают'],
  }),

  v('v-conocer', 'conocer', ['знать (кого-то), быть знакомым'], 29, {
    forms: forms(['conozco', 'conoces', 'conoce', 'conocemos', 'conocen']),
    transitive: true,
    ruInf: 'знать',
    ruForms: ['знаю', 'знаешь', 'знает', 'знаем', 'знаете', 'знают'],
  }, { ruHint: 'Conozco a la familia — Я знаком с семьёй' }),
]
