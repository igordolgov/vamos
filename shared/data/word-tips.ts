// ============================================================
// shared/data/word-tips.ts — объяснения при неверном ответе.
//
// Когда пользователь ошибся в практике, под «Верный ответ» выводится
// пояснение: почему ошибиться легко (в чём разница) и лайфхак для
// запоминания. Ключи — id слов из словаря и id шаблонов фраз.
// Для слов без записи показывается автопояснение: что означает
// выбранный вариант (optionNotes в генераторе упражнений).
// ============================================================

/** Объяснение ошибки: почему легко путать и как запомнить */
export interface WordTip {
  /** Почему ошибиться легко / в чём разница (простыми словами) */
  why: string
  /** Лайфхак запоминания */
  hack: string
  /** Пример употребления: короткая испанская фраза + перевод */
  ex?: { es: string; ru: string }
}

/**
 * Подсказки по словам словаря (id → объяснение).
 * Покрываем слова, которые реально путаются: вопросительные,
 * ser/estar, por/para, muy/mucho, bien/bueno, род «ловушек» и т.д.
 */
export const WORD_TIPS: Record<string, WordTip> = {
  // --- Вопросительные слова ---
  'qw-que': {
    why: '«qué» — про вещь или понятие («¿Qué es?» — что это?), «quién» — только про человека, «cuál» — выбор из вариантов.',
    hack: 'qué похоже на «что-э»: короткое слово — про вещь. А в quieN слышится «н», как в «человеН».',
    ex: { es: '¿Qué es esto?', ru: 'Что это?' },
  },
  'qw-quien': {
    why: '«quién» — только про людей («¿Quién es?» — кто это?). Про вещи спрашивают «qué».',
    hack: 'QUIÉN — внутри есть «n», как в «человеN»: кто-о-н.',
    ex: { es: '¿Quién es él?', ru: 'Кто он?' },
  },
  'qw-donde': {
    why: '«dónde» — про место: где или куда. Не путай со временем («cuándo»).',
    hack: 'DONde — внутри спрятан «дон»: дон сидит где-то — это место.',
    ex: { es: '¿Dónde vives?', ru: 'Где ты живёшь?' },
  },
  'qw-como': {
    why: '«cómo» — «как» (способ, образ): ¿Cómo estás? — как дела? Не то же, что «qué» — «что».',
    hack: 'coMó — «М» как в «методом»: КАК это сделано.',
    ex: { es: '¿Cómo estás?', ru: 'Как ты?' },
  },
  'qw-cuando': {
    why: '«cuándo» (с «n») — про время: когда? А «cuánto» (с «m») — про количество: сколько? Отличие — одна буква!',
    hack: 'cuáNdo — «N» как в «Нынче» (сейчас — время). cuánto — «M» как в «Много» (сколько).',
    ex: { es: '¿Cuándo llegas?', ru: 'Когда ты приезжаешь?' },
  },
  'qw-por-que': {
    why: '«¿Por qué?» — вопрос «почему?» (раздельно, с ударением). «porque» — ответ «потому что» (слитно). Звучат одинаково!',
    hack: 'Вопрос: ¿Por QUÉ? — как «за что Éто?». Ответ слитно: porque = «по-тому-что».',
    ex: { es: '¿Por qué estudias español?', ru: 'Почему ты учишь испанский?' },
  },
  'qw-cuanto': {
    why: '«cuánto» — сколько (количество, цена): ¿Cuánto cuesta? Не путай с «cuándo» — это «когда».',
    hack: 'cuánto — «M» как в «Много»: сколько. cuándo — «N» как в «Нынче»: когда.',
    ex: { es: '¿Cuánto cuesta?', ru: 'Сколько стоит?' },
  },
  'qw-cual': {
    why: '«cuál» — «который (из)»: выбор из известных вариантов (¿Cuál es tu número?). «qué» — просто «что/какой».',
    hack: 'cuál похоже на «коллектив»: выбираешь одного ИЗ коллектива.',
    ex: { es: '¿Cuál es tu número?', ru: 'Какой у тебя номер?' },
  },

  // --- ser / estar и другие коварные глаголы ---
  'v-ser': {
    why: '«ser» — то, что постоянно: кто ты, откуда, черты характера (Soy alta). «estar» — состояние и место (может измениться).',
    hack: 'ser — «паспортные данные»: имя, профессия, характер. estar — «геолокация и настроение».',
    ex: { es: 'Soy de Rusia.', ru: 'Я из России.' },
  },
  'v-estar': {
    why: '«estar» — состояние сейчас и место, где находишься: ¿Dónde estás? ¿Cómo estás?',
    hack: 'estar слышится как «эта-статус»: твой статус сейчас — где ты и как ты.',
    ex: { es: 'Estoy en casa.', ru: 'Я дома.' },
  },
  'v-tener': {
    why: '«tener» — «иметь»: по-испански «я имею» (Tengo un perro), а не «у меня есть».',
    hack: 'tener — «тЕнь держу в руке»: имею.',
    ex: { es: 'Tengo dos hermanos.', ru: 'У меня два брата (дословно: «я имею»).' },
  },
  'v-saber': {
    why: '«saber» — знать факты и уметь (Sé la respuesta, sé nadar). «conocer» — быть знакомым с человеком или местом.',
    hack: 'saber — «данные в голове»: факты и навыки.',
    ex: { es: 'Sé la respuesta.', ru: 'Я знаю ответ.' },
  },
  'v-conocer': {
    why: '«conocer» — знакомство с людьми и местами (Conozco a María, conozco Madrid). Факты — это «saber».',
    hack: 'conocer — «кон-Контакт»: познакомился с человеком или городом.',
    ex: { es: 'Conozco a María.', ru: 'Я знаком с Марией.' },
  },
  'v-gustar': {
    why: '«gustar» — «нравиться», но строится наоборот: Me gusta la casa — буквально «дом нравится мне».',
    hack: 'переверни русский: «мне нравится музыка» = «музыка нравится мне» — музыка в подлежащем.',
    ex: { es: 'Me gusta la música.', ru: 'Мне нравится музыка.' },
  },
  'v-ir': {
    why: '«ir» — идти/ехать, направление всегда с «a»: Voy al trabajo (al = a + el).',
    hack: 'ir + a — стрелка «→»: иду К чему-то.',
    ex: { es: 'Voy al trabajo.', ru: 'Я иду на работу.' },
  },
  'v-querer': {
    why: '«querer» — и «хотеть», и «любить»: Quiero café, Te quiero.',
    hack: 'quiero — «КЕРОсин тянет к себе»: хочу и люблю.',
    ex: { es: 'Quiero un café.', ru: 'Я хочу кофе.' },
  },

  // --- tú / usted ---
  'p-tu': {
    why: '«tú» — «ты» с друзьями и семьёй. «usted» — вежливое «вы» для незнакомых и старших.',
    hack: 'tú — короткое и простое, как «ты»; usted — официальное, как «уважаемый».',
    ex: { es: '¿Tú hablas español?', ru: 'Ты говоришь по-испански?' },
  },
  'p-usted': {
    why: '«usted» — вежливое «вы» (одному человеку), но глагол как у «он/она»: usted habla. «ustedes» — вы (много людей).',
    hack: 'usted — «уважаемый»: глагол как у него (3-е лицо). Ustedes — уже «они» по форме.',
    ex: { es: '¿Usted es el señor López?', ru: 'Вы господин Лопес?' },
  },

  // --- Предлоги ---
  'prep-a': {
    why: '«a» — направление: куда (Voy a la escuela) и «кому» перед людьми (Busco a María).',
    hack: 'a = стрелка «→»: к месту или к человеку (перед людьми — всегда).',
    ex: { es: 'Voy a la escuela.', ru: 'Я иду в школу.' },
  },
  'prep-de': {
    why: '«de» — «из/от/чья»: принадлежность и происхождение (Soy de Rusia, el libro de Ana).',
    hack: 'de — буква «Д»: книга Деда — дедовская; я ИЗ России.',
    ex: { es: 'Soy de Moscú.', ru: 'Я из Москвы.' },
  },
  'prep-en': {
    why: '«en» — ты уже внутри или на чём-то: в/на (En casa, en la mesa). «a» — движение туда.',
    hack: 'en = «вНутри»: стоишь внутри, никуда не двигаешься.',
    ex: { es: 'Estoy en casa.', ru: 'Я дома.' },
  },
  'prep-por': {
    why: '«por» — причина и движение «сквозь/по»: Gracias por tu ayuda, por la calle.',
    hack: 'por похоже на «по»: иду ПО улице; спасибо ЗА (по причине).',
    ex: { es: 'Gracias por tu ayuda.', ru: 'Спасибо за (твою) помощь.' },
  },
  'prep-para': {
    why: '«para» — цель и адресат: для кого, к чему (Un regalo para ti, para el trabajo).',
    hack: 'para = «цель»: PARAшют летит К цели — для кого-то.',
    ex: { es: 'Un regalo para ti.', ru: 'Подарок для тебя.' },
  },
  'prep-sobre': {
    why: '«sobre» — «на» (поверхность) и «о» (тема): Sobre la mesa, hablar sobre la película.',
    hack: 'sobre = «с-о-ВЕРХ»: лежит поверх стола, разговор поверх темы.',
    ex: { es: 'El libro está sobre la mesa.', ru: 'Книга (лежит) на столе.' },
  },
  'prep-desde': {
    why: '«desde» — начальная точка пути или времени: с/от (Desde ayer, desde Moscú).',
    hack: 'desde — «отседова»: точка старта.',
    ex: { es: 'Vivo aquí desde 2020.', ru: 'Я живу здесь с 2020 года.' },
  },
  'prep-hasta': {
    why: '«hasta» — конечная точка: до (Hasta mañana — до завтра).',
    hack: 'hasta — «доСТАЛ»: добрался до конца.',
    ex: { es: 'Hasta mañana.', ru: 'До завтра.' },
  },
  'prep-antes-de': {
    why: '«antes de» — «до, перед» (Antes de comer). «hasta» — «до (конца)».',
    hack: 'antes — «ещё ДО начала»: раньше времени.',
    ex: { es: 'Antes de comer, me lavo las manos.', ru: 'Перед едой я мою руки.' },
  },
  'prep-despues-de': {
    why: '«después de» — «после» (Después de trabajar).',
    hack: 'después — «послеЭтого»: сначала работа, потом отдых.',
    ex: { es: 'Después del trabajo descanso.', ru: 'После работы я отдыхаю.' },
  },

  // --- Наречия ---
  'adv-no': {
    why: 'Отрицание «no» ставится перед глаголом: No hablo español (в отличие от русского «не говорю»).',
    hack: 'no «обнимает» глагол сверху: no + глагол, сразу.',
    ex: { es: 'No hablo inglés.', ru: 'Я не говорю по-английски.' },
  },
  'adv-aqui': {
    why: '«aquí» — здесь (рядом с тобой). «allí» — там (подальше).',
    hack: 'aquí — «а-кВИ»: «к ВИМ», близко-близко.',
    ex: { es: 'Aquí está bien.', ru: 'Здесь хорошо.' },
  },
  'adv-alli': {
    why: '«allí» — там, вдали. «aquí» — здесь.',
    hack: 'allí — «АЛЛо, там!»: машешь рукой вдаль.',
    ex: { es: 'Allí hay una tienda.', ru: 'Там есть магазин.' },
  },
  'adv-muy': {
    why: '«muy» — только перед признаком (muy bueno). «mucho» — перед предметом или отдельно (mucho trabajo, trabaja mucho).',
    hack: 'muy — «мУй, какой!» — качество. mucho — «много вещей».',
    ex: { es: 'La casa es muy grande.', ru: 'Дом очень большой.' },
  },
  'adv-bien': {
    why: '«bien» — «хорошо» (ответ на «как?»), «bueno» — «хороший» (ответ на «какой?»).',
    hack: 'bien отвечает на ¿Cómo?, bueno — на «какой?». БИ-ен = хорошо, БУ-эно = хороший.',
    ex: { es: 'Estoy bien, gracias.', ru: 'Я в порядке, спасибо.' },
  },
  'adv-ya': {
    why: '«ya» — уже (готово, случилось). «todavía» — ещё (в процессе).',
    hack: 'ya — «Я-уже сделал». todavía — «всё ещё подожду».',
    ex: { es: 'Ya estoy aquí.', ru: 'Я уже здесь.' },
  },
  'adv-todavia': {
    why: '«todavía» — ещё, всё ещё (Todavía no — ещё нет). «ya» — уже.',
    hack: 'todavía — «то-да-вИ ещё» длится и длится.',
    ex: { es: 'Todavía no sé.', ru: 'Я ещё не знаю.' },
  },
  'adv-siempre': {
    why: '«siempre» — всегда: Siempre hablo español.',
    hack: 'siempre — «СИЯешь всегда»: сиять без остановки.',
    ex: { es: 'Siempre estudio por la noche.', ru: 'Я всегда учусь вечером.' },
  },
  'adv-nunca': {
    why: '«nunca» — никогда. В испанском двойное отрицание: Nunca hablo и No hablo nunca — оба верны.',
    hack: 'nunca — «не-когда» = никогда; рядом с «no» — не ошибка, а правило.',
    ex: { es: 'Nunca como carne.', ru: 'Я никогда не ем мясо.' },
  },
  'adv-tambien': {
    why: '«también» — тоже (согласие, ДА). «tampoco» — тоже НЕ (после отрицания).',
    hack: 'tamBIÉN — «БЕ-ДА» = да. tamPOCO — «мало» нет = тоже нет.',
    ex: { es: 'Yo también quiero ir.', ru: 'Я тоже хочу пойти.' },
  },
  'adv-tampoco': {
    why: '«tampoco» — «тоже не» после отрицания: No como carne y ella tampoco.',
    hack: 'POCO — «мало»: и у неё мало — тоже нет.',
    ex: { es: 'Ella tampoco sabe.', ru: 'Она тоже не знает.' },
  },

  // --- Артикли и количество ---
  'd-el': {
    why: '«el» — артикль мужского рода: el libro, el día. Обычно у слов на -о.',
    hack: 'el — короткий, как «он»: -о = он. Исключения запомни отдельно: el día, el problema.',
    ex: { es: 'El libro es nuevo.', ru: 'Книга новая.' },
  },
  'd-la': {
    why: '«la» — артикль женского рода: la mesa, la noche. Обычно у слов на -а.',
    hack: 'la — «ЛЯ» поёт женственно: -а = она.',
    ex: { es: 'La mesa es grande.', ru: 'Стол большой.' },
  },
  'd-un': {
    why: '«un» — один/какой-то (м.р.): un libro, un problema.',
    hack: 'un — «один»: на конце нет «а» — он.',
    ex: { es: 'Tengo un libro.', ru: 'У меня одна книга (дословно: я имею одну книгу).' },
  },
  'd-una': {
    why: '«una» — одна/какая-то (ж.р.): una casa, una mesa.',
    hack: 'una — с «а» на конце — она (как la).',
    ex: { es: 'Tengo una pregunta.', ru: 'У меня есть (один) вопрос.' },
  },
  'd-mucho': {
    why: '«mucho» — много: перед предметом (mucho trabajo) или отдельно. «muy» — только перед качеством (muy bueno).',
    hack: 'mucho — «много МЕШКОВ»: считать предметы. muy — «мУй, какой!».',
    ex: { es: 'Tengo mucho trabajo.', ru: 'У меня много работы.' },
  },

  // --- Существительные-«ловушки» рода ---
  'n-agua': {
    why: '«agua» — женского рода, но артикль «el» (el agua): из-за ударного «а-» в начале «la agua» звучало бы плохо.',
    hack: 'вода ОНА, но «А-А-А» ударное — говорят «el agua», чтобы не спотыкаться.',
    ex: { es: 'El agua está fría.', ru: 'Вода холодная.' },
  },
  'n-problema': {
    why: '«problema» — мужского рода, хотя кончается на -a: el problema (греческое происхождение).',
    hack: 'проблема ОН — «проблем-Муж»: слова на -ma — м.р. (el problema, el idioma).',
    ex: { es: 'El problema es grave.', ru: 'Проблема серьёзная.' },
  },
  'n-dia': {
    why: '«día» — мужского рода: el día (исключение, хотя кончается на -a).',
    hack: 'день ОН — «день-мужчина»: работает днём.',
    ex: { es: 'El día es largo.', ru: 'День длинный.' },
  },
  'n-noche': {
    why: '«noche» — женского рода: la noche.',
    hack: 'ночь ОНА: «ночЬ — ла-НОЧЬ» — ночь-леди.',
    ex: { es: 'La noche es tranquila.', ru: 'Ночь тихая.' },
  },

  // --- Союзы ---
  'c-y': {
    why: '«y» — «и», но перед словами на i-/hi- становится «e»: español e inglés.',
    hack: '«и» не хочет повторяться с «и»: y → e — «и-И» звучит плохо.',
    ex: { es: 'Ana y María estudian.', ru: 'Ана и Мария учатся.' },
  },
  'c-o': {
    why: '«o» — «или», но перед o-/ho- становится «u»: siete u ocho.',
    hack: '«или» не любит «о»: o → u — «о-О» звучит плохо.',
    ex: { es: '¿Té o café?', ru: 'Чай или кофе?' },
  },
  'c-porque': {
    why: '«porque» — «потому что» (ответ, слитно). Вопрос «почему?» — раздельно, с ударением: ¿Por qué?',
    hack: 'porque = «по-тому-что» одним словом; вопрос — «за что Éто?» (Por qué).',
    ex: { es: 'Estudio porque quiero viajar.', ru: 'Я учусь, потому что хочу путешествовать.' },
  },
  'c-cuando': {
    why: '«cuando» — «когда» (союз, не вопрос): Cuando llego, como. Вопрос — с ударением: ¿Cuándo?',
    hack: 'вопрос всегда со знаком ¿? и ударением á; союз — просто склейка предложений.',
    ex: { es: 'Cuando llego, como.', ru: 'Когда я приезжаю, я ем.' },
  },

  // --- Числительные ---
  'num-uno': {
    why: 'Само по себе — «uno», но перед предметом м.р. — «un»: un libro. Перед ж.р. — «una».',
    hack: 'uno «теряет хвост -o» перед предметом: uno → un libro.',
    ex: { es: 'Tengo un hermano.', ru: 'У меня один брат.' },
  },

  // --- Конструкции ---
  'cstr-hay': {
    why: '«hay» — «есть/имеется» без указания, у кого. Не меняется: Hay una mesa и Hay dos mesas.',
    hack: 'hay — «АЙ, есть!»: кричишь, когда нашёл. Количество не важно — всё равно hay.',
    ex: { es: 'Hay un problema.', ru: 'Есть одна проблема.' },
  },
  'cstr-hay-que': {
    why: '«hay que + глагол» — «надо» для всех, безлично: Hay que trabajar.',
    hack: 'hay que — «АЙ, КАК надо!»: правило без исполнителя.',
    ex: { es: 'Hay que trabajar.', ru: 'Надо работать.' },
  },
  'cstr-ir-a': {
    why: '«ir a + глагол» — будущее: Voy a comer — сейчас пойду/собираюсь поесть.',
    hack: 'ir a = «иду К действию»: стрелка в будущее.',
    ex: { es: 'Voy a comer.', ru: 'Я сейчас поем.' },
  },
  'cstr-tener-que': {
    why: '«tener que + глагол» — «быть должным»: Tengo que trabajar — я должен работать.',
    hack: 'tener que — «ИМЕЮ обязанность»: que — как «обязаловка».',
    ex: { es: 'Tengo que estudiar.', ru: 'Я должен учиться.' },
  },
  'cstr-acabar-de': {
    why: '«acabar de + глагол» — «только что»: Acabo de comer — только что поел.',
    hack: 'acabar = «заканчивать»: только-что закончил.',
    ex: { es: 'Acabo de comer.', ru: 'Я только что поел.' },
  },
  'cstr-hace-tiempo': {
    why: '«hace + срок» — «тому назад»: Hace dos años. «hace» стоит в начале, срок — сразу за ним.',
    hack: 'hace = «делает»: время «делает» два года тому назад.',
    ex: { es: 'Hace dos años llegué.', ru: 'Два года назад я приехал.' },
  },
  'cstr-estar-gerundio': {
    why: '«estar + глагол с -ndo» — процесс прямо сейчас: Estoy comiendo — я (сейчас) ем.',
    hack: '-ndo = русский «-ing»: действие «в моменте».',
    ex: { es: 'Estoy comiendo.', ru: 'Я (сейчас) ем.' },
  },

  // --- Местоимения-подлежащие (урок 1) ---
  'p-yo': {
    why: '«yo» — «я». Местоимение часто опускают: глагол уже показывает лицо (Soy Ana вместо Yo soy Ana).',
    hack: 'yo — как «йо»: самый первый, самый главный.',
    ex: { es: 'Yo soy María.', ru: 'Я Мария.' },
  },
  'p-el': {
    why: '«él» — «он» (с ударением). Без ударения «el» — артикль м.р. (el libro). Одна буква решает!',
    hack: 'É с ударением — живой человек; el без ударения — просто артикль.',
    ex: { es: 'Él habla español.', ru: 'Он говорит по-испански.' },
  },
  'p-ella': {
    why: '«ella» — «она». Глагол у él и ella одинаковый: él habla, ella habla.',
    hack: 'ella кончается на -a — как русское «она».',
    ex: { es: 'Ella estudia mucho.', ru: 'Она много учится.' },
  },
  'p-nosotros': {
    why: '«nosotros» — «мы». У глагола появляется -mos: nosotros hablamos.',
    hack: 'nosotros = «ноСИМ друг друга»: мы вместе.',
    ex: { es: 'Nosotros trabajamos aquí.', ru: 'Мы работаем здесь.' },
  },
  'p-ustedes': {
    why: '«ustedes» — «вы» (ко многим и вежливо). Глагол как у «они»: ustedes hablan.',
    hack: 'ustedes = «уважаемые все»: форма глагола — как у ellos.',
    ex: { es: '¿Ustedes hablan español?', ru: 'Вы говорите по-испански?' },
  },
  'p-ellos': {
    why: '«ellos» — «они» (мужчины или смешанная группа): Ellos viven aquí.',
    hack: 'ellos — группа, где есть хотя бы один мужчина, — всегда ellos.',
    ex: { es: 'Ellos son mis amigos.', ru: 'Они мои друзья.' },
  },
  'p-ellas': {
    why: '«ellas» — «они» (только женщины). «ellos» — если есть мужчины.',
    hack: 'ellas с -a — «женская» версия ellos.',
    ex: { es: 'Ellas viven aquí.', ru: 'Они (девушки) живут здесь.' },
  },

  // --- Определители (урок 2) ---
  'd-los': {
    why: '«los» — артикль м.р. мн.ч.: los libros. Это «el» для многих предметов.',
    hack: 'los = el + s: «много элей».',
    ex: { es: 'Los libros están aquí.', ru: 'Книги здесь.' },
  },
  'd-las': {
    why: '«las» — артикль ж.р. мн.ч.: las mesas. Это «la» для многих предметов.',
    hack: 'las = la + s: «много ля».',
    ex: { es: 'Las casas son grandes.', ru: 'Дома большие.' },
  },
  'd-unos': {
    why: '«unos» — «несколько, какие-то» (м.р.): unos amigos — несколько друзей.',
    hack: 'unos = un + s: несколько «одних».',
    ex: { es: 'Tengo unos libros.', ru: 'У меня есть несколько книг.' },
  },
  'd-unas': {
    why: '«unas» — «несколько, какие-то» (ж.р.): unas casas.',
    hack: 'unas = una + s: несколько «одних» (ж.р.).',
    ex: { es: 'Hay unas preguntas.', ru: 'Есть несколько вопросов.' },
  },
  'd-poco': {
    why: '«poco» — «мало»: poco tiempo. Согласуется, как прилагательное: poca agua, pocos amigos, pocas mesas.',
    hack: 'poco — «ПОКОй мало»: мало спокойствия.',
    ex: { es: 'Tengo poco tiempo.', ru: 'У меня мало времени.' },
  },

  // --- Наречие (урок 3) ---
  'adv-mal': {
    why: '«mal» — «плохо» (противоположность bien): Estoy mal, hablo mal.',
    hack: 'mal — «МАЛо хорошего»: плохо.',
    ex: { es: 'Hoy estoy mal.', ru: 'Сегодня мне плохо.' },
  },

  // --- Глаголы (уроки 4–6): спряжение + пример ---
  'v-hablar': {
    why: '«hablar» — говорить. Глагол на -ar: yo hablo, tú hablas, él habla, nosotros hablamos, ustedes hablan.',
    hack: 'в hablAr слышится «болтАть»: говорить.',
    ex: { es: 'Hablo español con Ana.', ru: 'Я говорю по-испански с Аной.' },
  },
  'v-comer': {
    why: '«comer» — есть. Глагол на -er: yo como, tú comes, él come, nosotros comemos, ustedes comen.',
    hack: 'comer — «КОМАть щёками»: есть.',
    ex: { es: 'Como fruta cada día.', ru: 'Я ем фрукты каждый день.' },
  },
  'v-vivir': {
    why: '«vivir» — жить. Глагол на -ir: yo vivo, tú vives, él vive, nosotros vivimos, ustedes viven.',
    hack: 'vivir — «вивИР»: жить, витать где-то.',
    ex: { es: 'Vivo en Moscú.', ru: 'Я живу в Москве.' },
  },
  'v-trabajar': {
    why: '«trabajar» — работать. На -ar: yo trabajo, tú trabajas, él trabaja…',
    hack: 'trabajo — «трудяга»: работать.',
    ex: { es: 'Trabajo en una escuela.', ru: 'Я работаю в школе.' },
  },
  'v-estudiar': {
    why: '«estudiar» — учиться, изучать (что-то): estudiar español. На -ar: yo estudio…',
    hack: 'estudio — «штудирую»: изучаю.',
    ex: { es: 'Estudio español por la noche.', ru: 'Я учу испанский по вечерам.' },
  },
  'v-aprender': {
    why: '«aprender» — учить (усваивать): aprender español. На -er: yo aprendo, tú aprendes…',
    hack: 'aprendo — «прИнял в голову»: усваиваю.',
    ex: { es: 'Aprendo palabras nuevas.', ru: 'Я учу новые слова.' },
  },
  'v-leer': {
    why: '«leer» — читать. На -er: yo leo, tú lees, él lee (две «e» рядом — не ошибка).',
    hack: 'leer — «лЕЮ глаза в книгу»: читаю.',
    ex: { es: 'Leo un libro.', ru: 'Я читаю книгу.' },
  },
  'v-escribir': {
    why: '«escribir» — писать. На -ir: yo escribo, tú escribes, él escribe…',
    hack: 'escribo — «скрИбл» (scribble — каракули): писать.',
    ex: { es: 'Escribo una carta.', ru: 'Я пишу письмо.' },
  },
  'v-hacer': {
    why: '«hacer» — делать. Особая форма yo: hago (не «haco»), остальное обычно: tú haces, él hace…',
    hack: 'hago — «ГА-го»: yo делает исключение.',
    ex: { es: 'Hago la tarea.', ru: 'Я делаю задание.' },
  },
  'v-poder': {
    why: '«poder» — мочь. Всегда с инфинитивом: Puedo hablar. Корневая о→ue: puedo, puedes, puede…',
    hack: 'puedo — «ПУ-Эдо»: о→уэ, как в «пуэбло».',
    ex: { es: 'Puedo hablar español.', ru: 'Я могу говорить по-испански.' },
  },
  'v-ver': {
    why: '«ver» — видеть. Особые короткие формы: yo veo, tú ves, él ve.',
    hack: 'veo — «ВЕ-О»: вижу (ве — от ver).',
    ex: { es: 'Veo la tele.', ru: 'Я смотрю телевизор.' },
  },
  'v-dar': {
    why: '«dar» — давать. Особая форма yo: doy (не «dao»), остальное обычно: das, da…',
    hack: 'doy — «ДО-йо»: даю.',
    ex: { es: 'Te doy mi número.', ru: 'Я даю тебе свой номер.' },
  },

  // --- Союзы (урок 5) ---
  'c-pero': {
    why: '«pero» — «но» (противопоставление): Quiero ir, pero no puedo.',
    hack: 'pero — «ПЕРЕ-путь»: но дальше препятствие.',
    ex: { es: 'Quiero ir, pero trabajo.', ru: 'Я хочу пойти, но я работаю.' },
  },
  'c-si': {
    why: '«si» (без ударения) — «если»: Si estudias, sabes. С ударением «sí» — «да».',
    hack: 'без ударения — условие «если»; с ударением sí — ответ «ДА».',
    ex: { es: 'Si estudias, sabes español.', ru: 'Если ты учишься, ты знаешь испанский.' },
  },
  'c-que': {
    why: '«que» — «что» (союз между предложениями): Creo que es fácil.',
    hack: 'que — «клей»: склеивает два предложения.',
    ex: { es: 'Creo que es fácil.', ru: 'Я думаю, что это легко.' },
  },
  'c-aunque': {
    why: '«aunque» — «хотя» (уступка): Voy, aunque está lejos.',
    hack: 'aunque — «а-уН-КЕ хотя»: уступаю и всё равно делаю.',
    ex: { es: 'Voy, aunque está lejos.', ru: 'Я пойду, хотя это далеко.' },
  },
  'c-entonces': {
    why: '«entonces» — «тогда, в таком случае»: ¿Entonces qué hacemos?',
    hack: 'entonces — «эн-ТО-гда»: тогда.',
    ex: { es: 'Entonces vamos juntos.', ru: 'Тогда пойдём вместе.' },
  },

  // --- Дополнения-местоимения (урок 7) ---
  'p-me': {
    why: '«me» — «мне/меня», стоит ПЕРЕД глаголом: Me gusta (мне нравится), Me llamo (меня зовут).',
    hack: 'me — «МЕНЯ» коротко: приклеено перед глаголом.',
    ex: { es: 'Me gusta la música.', ru: 'Мне нравится музыка.' },
  },
  'p-te': {
    why: '«te» — «тебе/тебя», перед глаголом: ¿Cómo te llamas? — как тебя зовут?',
    hack: 'te — «ТЕБЕ» коротко: тоже перед глаголом.',
    ex: { es: '¿Cómo te llamas?', ru: 'Как тебя зовут?' },
  },
  'p-le': {
    why: '«le» — «ему/ей/вам» (кому), перед глаголом: Le hablo — я ему говорю.',
    hack: 'le — «ЛЕкому-то»: ему или ей.',
    ex: { es: 'Le hablo en español.', ru: 'Я говорю ему по-испански.' },
  },
  'p-les': {
    why: '«les» — «им/вам (многим)», перед глаголом: Les gusta — им нравится.',
    hack: 'les = le + s: «кому» во множестве.',
    ex: { es: 'Les gusta la fiesta.', ru: 'Им нравится праздник.' },
  },
  'p-nos': {
    why: '«nos» — «нам/нас», перед глаголом: Nos gusta — нам нравится.',
    hack: 'nos = nosotros коротко: нам/нас.',
    ex: { es: 'Nos gusta la música.', ru: 'Нам нравится музыка.' },
  },

  // --- Семья (урок 8): род виден по окончанию ---
  'n-padre': {
    why: '«padre» — отец (м.р.): el padre. Ласково «папа» — papá.',
    hack: 'padre — «ПА-дро»: папа-мужчина.',
    ex: { es: 'Mi padre trabaja mucho.', ru: 'Мой отец много работает.' },
  },
  'n-madre': {
    why: '«madre» — мать (ж.р.): la madre. Ласково «мама» — mamá.',
    hack: 'madre — «МА-дре»: мама-женщина.',
    ex: { es: 'Mi madre habla mucho.', ru: 'Моя мама много разговаривает.' },
  },
  'n-hijo': {
    why: '«hijo» — сын (м.р.): el hijo. «hija» — дочь. H в начале не читается.',
    hack: 'hijo — «Ихо»: h молчит; на -o — он.',
    ex: { es: 'Mi hijo estudia aquí.', ru: 'Мой сын учится здесь.' },
  },
  'n-hija': {
    why: '«hija» — дочь (ж.р.): la hija. «hijo» — сын. H не читается.',
    hack: 'hija с -a — дочь-девочка.',
    ex: { es: 'Mi hija estudia aquí.', ru: 'Моя дочь учится здесь.' },
  },
  'n-hermano': {
    why: '«hermano» — брат (м.р.). «hermana» — сестра. Пол виден по окончанию.',
    hack: 'в hermAno слышится «братАн»: брат.',
    ex: { es: 'Mi hermano vive aquí.', ru: 'Мой брат живёт здесь.' },
  },
  'n-hermana': {
    why: '«hermana» — сестра (ж.р.). «hermano» — брат.',
    hack: 'hermana с -a — сестра.',
    ex: { es: 'Mi hermana habla español.', ru: 'Моя сестра говорит по-испански.' },
  },
  'n-familia': {
    why: '«familia» — семья (ж.р.): la familia. Про семью говорят «она»: Mi familia es grande.',
    hack: 'familia — «фамиЛИЯ»: моя семья — она.',
    ex: { es: 'Mi familia es grande.', ru: 'Моя семья большая.' },
  },
  'n-amigo': {
    why: '«amigo» — друг (м.р.). «amiga» — подруга. Пол виден по окончанию.',
    hack: 'amigo — «А-миго-друг»: он.',
    ex: { es: 'Mi amigo vive aquí.', ru: 'Мой друг живёт здесь.' },
  },
  'n-amiga': {
    why: '«amiga» — подруга (ж.р.). «amigo» — друг.',
    hack: 'amiga с -a — подруга.',
    ex: { es: 'Mi amiga trabaja aquí.', ru: 'Моя подруга работает здесь.' },
  },
  'n-nino': {
    why: '«niño» — ребёнок/мальчик (м.р.). «niña» — девочка. ñ читается как «нь».',
    hack: 'niño — «НИНЬо»: маленький; с -a — маленькая.',
    ex: { es: 'El niño habla poco.', ru: 'Мальчик мало говорит.' },
  },
  'n-nina': {
    why: '«niña» — девочка (ж.р.). «niño» — ребёнок/мальчик.',
    hack: 'niña с -a — девочка.',
    ex: { es: 'La niña estudia aquí.', ru: 'Девочка учится здесь.' },
  },

  // --- Притяжательные и указательные (урок 9) ---
  'p-mi': {
    why: '«mi» — «мой/моя», в ед.ч. не меняется: mi casa, mi libro. Мн.ч. — mis.',
    hack: 'mi — «МИлый мой»: мой.',
    ex: { es: 'Mi casa es grande.', ru: 'Мой дом большой.' },
  },
  'p-tu-pos': {
    why: '«tu» — «твой/твоя»: tu casa, tu libro. Мн.ч. — tus. Не путай с «tú» — «ты» с ударением.',
    hack: 'tú с ударением — «ты»-человек; tu без ударения — «твой».',
    ex: { es: 'Tu casa es grande.', ru: 'Твой дом большой.' },
  },
  'p-su': {
    why: '«su» — «его/её/их/ваш» — одно слово для всех владельцев: su casa (и его, и её дом). Мн.ч. — sus.',
    hack: 'su — «сУмка чья-то»: чей угодно — его, её, их.',
    ex: { es: 'Su casa es grande.', ru: 'Его (её) дом большой.' },
  },
  'p-nuestro': {
    why: '«nuestro» — «наш», согласуется как прилагательное: nuestro libro, nuestra casa, nuestros amigos.',
    hack: 'nuestro — «НАШ еСТРОй»: наш.',
    ex: { es: 'Nuestra casa es grande.', ru: 'Наш дом большой.' },
  },
  'p-este': {
    why: '«este» — «этот» (близко ко мне): este libro, esta mesa. Мн.ч. — estos/estas.',
    hack: 'este — «эТОт тут»: рядом со мной.',
    ex: { es: 'Este libro es bueno.', ru: 'Эта книга хорошая.' },
  },
  'p-ese': {
    why: '«ese» — «тот» (ближе к собеседнику): ese libro, esa mesa.',
    hack: 'ese — «эСЭ, у тебя там»: рядом с тобой.',
    ex: { es: 'Ese libro es interesante.', ru: 'Та книга интересная.' },
  },
}

/**
 * Подсказки по шаблонам фраз (templateId → объяснение).
 * Сборка фразы: подсказка объясняет грамматику шаблона —
 * ser/estar, «tengo» вместо «у меня есть», личное «a», hay и т.д.
 */
export const PHRASE_TIPS: Record<string, WordTip> = {
  't-pron-ser-prof': {
    why: 'Профессия — суть человека, поэтому ser и без артикля: Soy maestro.',
    hack: 'профессия — «паспортная строка»: ser.',
  },
  't-noun-ser-prof': {
    why: '«Soy maestro» — я по сути учитель. Профессия — постоянное: ser.',
    hack: 'профессия — на «паспорте»: ser.',
  },
  't-pron-ser-adj': {
    why: 'Характер и постоянные качества — ser: Ella es alta.',
    hack: 'черта характера — «паспортная»: ser.',
  },
  't-noun-ser-adj': {
    why: 'Постоянное свойство вещи — ser: La casa es grande.',
    hack: 'свойство «из паспорта» вещи — ser.',
  },
  't-pron-estar-place': {
    why: 'Место, где находишься сейчас, — estar: Estoy en casa.',
    hack: 'геолокация — estar: точка на карте меняется.',
  },
  't-noun-estar-place': {
    why: 'Где находится предмет — estar: El libro está en la mesa.',
    hack: 'место предмета — «геолокация»: estar.',
  },
  't-pron-estar-state': {
    why: 'Состояние сейчас — estar: Estoy cansado (может, через час отдохнёшь).',
    hack: 'настроение и усталость «сейчас» — estar.',
  },
  't-pron-tener-noun': {
    why: '«Иметь» по-испански — tener, а не «у меня есть»: Tengo un perro.',
    hack: 'вещь у тебя «в руках»: tengo = держу — имею.',
  },
  't-pron-tener-num': {
    why: 'Количество при себе — tener: Tengo dos hermanos. Возраст тоже «держат»: Tengo 20 años.',
    hack: 'годы и родню «держишь при себе»: tener.',
  },
  't-hay-noun': {
    why: '«Hay» — «есть, имеется» (безлично): Hay un problema. Для мн.ч. тоже hay: Hay dos problemas.',
    hack: 'hay — «АЙ, есть!»: нашёл — кричишь, независимо от количества.',
  },
  't-hay-place': {
    why: '«Hay» — «есть, имеется»: Hay una fiesta aquí.',
    hack: 'hay — «АЙ, есть!».',
  },
  't-pron-v-person': {
    why: 'Перед человеком нужно «личное a»: Busco a María.',
    hack: 'людей испанский «обнимает» буквой a.',
  },
  't-pron-v-lang': {
    why: 'Языки без артикля: Hablo español. Название языка отдельно — с артиклем: El español es fácil.',
    hack: 'язык «внутри тебя», когда говоришь: без el.',
  },
  't-pron-v-nada': {
    why: 'Двойное отрицание обязательно: No veo nada. «Veo nada» — ошибка.',
    hack: 'no тянет за собой nada/nadie/tampoco — отрицание ходит парой.',
  },
  't-pron-modal-inf': {
    why: 'Querer/poder/necesitar + инфинитив напрямую, без «que»: Quiero comer.',
    hack: 'модальный глагол «берёт за руку» инфинитив: без que.',
  },
  't-pron-tener-que-inf': {
    why: '«Tener QUE + инфинитив» — «должен»: Tengo que trabajar. Не потеряй «que».',
    hack: 'que — «обязаловка» между tener и действием.',
  },
  't-pron-ir-a-inf': {
    why: '«Ir A + инфинитив» — будущее: Voy a comer.',
    hack: 'a — стрелка в будущее.',
  },
  't-hay-que-inf': {
    why: '«Hay que + инфинитив» — «надо» (для всех): Hay que trabajar.',
    hack: 'hay que — «АЙ, КАК надо всем!».',
  },
  't-pron-gustar-np': {
    why: '«Gustar» — «нравиться», но наизнанку: Me gusta la música — буквально «музыка нравится мне». Ед.ч. — gusta, мн.ч. — gustan.',
    hack: 'подлежащее — то, что нравится: музыка сама «делает» gusta.',
  },
  't-io-dar-np': {
    why: 'Получатель («кому?») — le (мн.ч. les) ПЕРЕД глаголом: Le doy el libro — «я даю ЕМУ книгу». lo/la — это «его/её» (прямое дополнение, «что?») — получателем они не бывают.',
    hack: 'Кому? → le/les. Что? → el/la. Порядок: le + глагол + вещь.',
    ex: { es: 'Le doy un regalo.', ru: 'Я даю ему подарок.' },
  },
  't-io-escribir-np': {
    why: 'Кому пишу — le/les: Le escribo una carta — «пишу ЕМУ письмо». Получатель ставится перед глаголом, а не в конце фразы.',
    hack: 'спроси «кому?» → le. «Написать его» (lo) — это про текст, не про получателя.',
    ex: { es: 'Le escribo una carta.', ru: 'Я пишу ему письмо.' },
  },
  't-io-decir-np': {
    why: 'Сказать КОМУ-ТО — le/les: Le digo la verdad — «говорю ЕМУ правду». lo/la — прямое дополнение («что?») и получателем не бывает.',
    hack: 'decir → le: слова летят к получателю — le стоит перед глаголом.',
    ex: { es: 'Le digo la verdad.', ru: 'Я говорю ему правду.' },
  },
  't-pron-nunca-v': {
    why: '«Nunca» может стоять перед глаголом без «no» (Nunca hablo) или после глагола с «no» (No hablo nunca) — оба варианта верны.',
    hack: 'два «нет» — не ошибка, а правило испанского.',
  },
  't-pron-v-place-adv': {
    why: 'Место — всегда с «en»: Vivo en Moscú, estoy en casa.',
    hack: 'жить «вНутри» города: en.',
  },
  't-pron-estar-gerund': {
    why: '«Estar + глагол с -ndo» — процесс прямо сейчас: Estoy comiendo.',
    hack: '-ndo = русский «-ing»: действие «в моменте».',
  },
  't-hace-tiempo': {
    why: '«Hace + срок» — «тому назад»: Hace dos años llegué.',
    hack: 'hace = «делает»: время «делает» два года тому назад.',
  },
  't-qw-quien': {
    why: '¿Quién...? — вопрос про человека: ¿Quién busca a un maestro?',
    hack: 'quién — «человеН»: кто.',
  },
  't-qw-como-estar': {
    why: '¿Cómo estás? — «как ты?» — про состояние, всегда estar.',
    hack: 'как ДЕЛА — «сейчас»: estar.',
  },
  't-qw-cuantos-anos': {
    why: 'Возраст по-испански — «иметь годы»: ¿Cuántos años tienes? — Tengo 20 años.',
    hack: 'годы «держишь при себе»: tener.',
  },
  't-qw-cual-es': {
    why: '¿Cuál es...? — «который (из)»: выбор варианта: ¿Cuál es tu número?',
    hack: 'cuál — выбор ИЗ списка.',
  },
  't-pron-v-bare': {
    why: 'Глагол может обходиться без дополнения: Trabajo — «я работаю». Местоимение опускается: hablo = yo hablo.',
    hack: 'форма глагола сама говорит «кто»: hablo — только yo.',
  },
  't-pron-v-do': {
    why: 'Порядок: кто → что делает → что. При предмете обязателен артикль: Veo la casa (не «veo casa»).',
    hack: 'предмет идёт «с паспортом»: la/el + слово.',
  },
  't-pron-v-do-adj': {
    why: 'Прилагательное ставится ПОСЛЕ предмета и согласуется с ним: Veo la casa blanca.',
    hack: 'прилагательное — «хвост» предмета: la casa blanca.',
  },
  't-noun-v-do': {
    why: 'Подлежащее-существительное тоже идёт с артиклем: El hombre ve la casa. Глагол согласуется в числе: Los hombres ven.',
    hack: 'кто? → что делает? → что? — прямой порядок.',
  },
  't-noun-v-do-adj': {
    why: 'Согласование по всей цепочке: El hombre ve la casa blanca — blanca ж.р., как casa.',
    hack: 'прилагательное «копирует» предмет в роде и числе.',
  },
  't-noun-v-person': {
    why: 'Перед человеком (и подлежащим, и дополнением) — артикль, а перед дополнением-лицом — ещё и «личное a»: El hombre busca a la mujer.',
    hack: 'люди идут «под буквой a»: busca a María.',
  },
  't-pron-v-prep-np': {
    why: 'У каждого глагола свой предлог: hablar con, ir a, pensar en. Предлог нельзя подставлять «по-русски» — смотри, какой требует глагол.',
    hack: 'у глагола «свой замок» — свой предлог.',
  },
  't-pron-v-adverb': {
    why: 'Наречия частоты и времени (siempre, nunca, ya, todavía) ставятся ПЕРЕД глаголом: Siempre trabajo.',
    hack: 'наречие «обнимает» глагол сверху: всегда перед ним.',
  },
  't-pron-v-manner': {
    why: 'Наречие образа действия (bien, mal, rápido) идёт ПОСЛЕ глагола: Trabajo bien.',
    hack: 'КАК делаю — после глагола: hablo bien.',
  },
  't-qw-que': {
    why: 'Вопрос «что?» — ¿Qué + глагол?: ¿Qué buscas? — что ищешь?',
    hack: 'qué — короткое слово про вещь: ¿Qué haces?',
  },
  't-qw-donde': {
    why: 'Вопрос «где?» — ¿Dónde + глагол?: ¿Dónde vives? — где ты живёшь?',
    hack: 'dónde — «дон сидит где-то»: место.',
  },
  't-qw-cuando': {
    why: 'Вопрос «когда?» — ¿Cuándo + глагол?: ¿Cuándo trabajas? — когда ты работаешь?',
    hack: 'cuáNdo — «N» как в «Нынче»: время.',
  },
  't-qw-porque': {
    why: 'Ответ «потому что» — porque слитно: ¿Por qué estudias? — Porque quiero viajar.',
    hack: 'porque = «по-тому-что» одним словом.',
  },
}
