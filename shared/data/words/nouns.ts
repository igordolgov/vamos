// ============================================================
// shared/data/words/nouns.ts — существительные.
//
// Классы (nounClass) используются движком фраз для отбора слов
// в шаблоны: «ехать В школу» (place), «разговаривать С мамой» (family).
// Артикль запоминается вместе со словом — род важен для фраз.
// ============================================================

import type { RuCaseKey, Word } from '../../types'
import { n } from './helpers'

/**
 * Русский род перевода, если он не совпадает с испанским родом:
 * problema (м.р.) — «проблема» (ж.р.), computadora (ж.р.) — «компьютер» (м.р.).
 * Нужен для согласования русских прилагательных: «белая машина».
 */
const RU_GENDER: Record<string, 'm' | 'f' | 'n'> = {
  'n-dia': 'm',          // день — м.р. (нарушает правило «ь → ж.р.»)
  'n-maestro': 'm',      // учитель — м.р. (нарушает правило «ь → ж.р.»)
  'n-hombre': 'm',       // мужчина — м.р. (нарушает правило «а → ж.р.»)
  'n-cafe': 'm',         // кофе — м.р. (нарушает правило «е → с.р.»)
  'n-tarde': 'm',        // «день (после обеда)» — м.р.
  'n-hotel': 'm',        // отель — м.р. (нарушает правило «ь → ж.р.»)
  'n-tiempo': 'n',       // время — с.р. (нарушает «я → ж.р.»)
  'n-nombre': 'n',       // имя — с.р.
  'n-manana': 'n',       // утро — с.р. (совпадает с правилом, для ясности)
}

/** Механический род русского слова: consonant/й → м.р., а/я/ь → ж.р., о/е → с.р. */
function ruGenderFromWord(ru: string): 'm' | 'f' | 'n' {
  const w = ru.replace(/\s*\(.*\)\s*/, '')
  if (/[ое]$/.test(w) && w.length > 1) return 'n'
  if (/[аяь]$/.test(w)) return 'f'
  return 'm'
}

/** Русские переводы, существующие только во мн.ч.: «часы», «деньги» */
const RU_PLURAL_ONLY = new Set(['n-reloj', 'n-dinero'])

/**
 * Русские падежные формы для переводов с предлогами.
 * Пример: «voy a la escuela» → «иду в школу» (n-espanol.a — не нужно,
 * а n-escuela.a = «в школу»), «sin azúcar» → «без сахара».
 * Существительные без аннотации исключаются из шаблонов с этим предлогом.
 */
const RU_CASES: Record<string, Partial<Record<RuCaseKey, string>>> = {
  // --- Места: a / en / de / desde / hasta / cerca de ---
  'n-escuela': { a: 'в школу', en: 'в школе', de: 'из школы', desde: 'из школы', hasta: 'до школы', sobre: 'о школе' },
  'n-casa': { a: 'домой', en: 'дома', de: 'из дома', desde: 'из дома', hasta: 'до дома', sobre: 'о доме' },
  'n-trabajo': { a: 'на работу', en: 'на работе', de: 'с работы', desde: 'с работы', hasta: 'до работы', sobre: 'о работе' },
  'n-tienda': { a: 'в магазин', en: 'в магазине', de: 'из магазина' },
  'n-mercado': { a: 'на рынок', en: 'на рынке', de: 'с рынка' },
  'n-parque': { a: 'в парк', en: 'в парке', de: 'из парка' },
  'n-playa': { a: 'на пляж', en: 'на пляже', de: 'с пляжа' },
  'n-ciudad': { a: 'в город', en: 'в городе', de: 'из города', desde: 'из города', hasta: 'до города' },
  'n-banco': { a: 'в банк', en: 'в банке', de: 'из банка' },
  'n-hotel': { a: 'в отель', en: 'в отеле', de: 'из отеля' },
  'n-hospital': { a: 'в больницу', en: 'в больнице', de: 'из больницы' },
  'n-restaurante': { a: 'в ресторан', en: 'в ресторане', de: 'из ресторана' },
  'n-calle': { a: 'на улицу', en: 'на улице', de: 'с улицы' },
  'n-cocina': { a: 'на кухню', en: 'на кухне', de: 'с кухни' },
  'n-cuarto': { a: 'в комнату', en: 'в комнате', de: 'из комнаты' },
  'n-bano': { a: 'в ванную', en: 'в ванной', de: 'из ванной' },

  // --- Люди и семья: con (творительный), dat (кому), a (кого) ---
  'n-amigo': { con: 'с другом', dat: 'другу', a: 'друга' },
  'n-amiga': { con: 'с подругой', dat: 'подруге', a: 'подругу' },
  'n-familia': { con: 'с семьёй', dat: 'семье', a: 'семью', para: 'для семьи' },
  'n-madre': { con: 'с мамой', dat: 'маме', a: 'маму', para: 'для мамы' },
  'n-padre': { con: 'с папой', dat: 'папе', a: 'папу', para: 'для папы' },
  'n-hermano': { con: 'с братом', dat: 'брату', a: 'брата' },
  'n-hermana': { con: 'с сестрой', dat: 'сестре', a: 'сестру' },
  'n-hijo': { con: 'с сыном', dat: 'сыну', a: 'сына' },
  'n-hija': { con: 'с дочкой', dat: 'дочке', a: 'дочку' },
  'n-nino': { con: 'с ребёнком', dat: 'ребёнку', a: 'ребёнка' },
  'n-nina': { con: 'с девочкой', dat: 'девочке', a: 'девочку' },
  'n-hombre': { con: 'с мужчиной', dat: 'мужчине', a: 'мужчину' },
  'n-mujer': { con: 'с женщиной', dat: 'женщине', a: 'женщину' },
  'n-persona': { con: 'с человеком', dat: 'человеку', a: 'человека' },
  'n-senor': { con: 'с господином', dat: 'господину', a: 'господина' },
  'n-maestro': { con: 'с учителем', dat: 'учителю', a: 'учителя' },
  'n-maestra': { con: 'с учительницей', dat: 'учительнице', a: 'учительницу' },
  'n-medico': { con: 'с врачом', dat: 'врачу', a: 'врача' },
  'n-estudiante': { con: 'со студентом', dat: 'студенту', a: 'студента' },

  // --- Поверхности и предметы: en / sobre (на…) ---
  'n-mesa': { en: 'на столе', sobre: 'на столе' },
  'n-silla': { en: 'на стуле', sobre: 'на стуле' },
  'n-cama': { en: 'на кровати', sobre: 'на кровати' },
  'n-bolsa': { en: 'в сумке', sobre: 'в сумке' },
  'n-carro': { en: 'в машине' },
  'n-papel': { sobre: 'на бумаге', en: 'на бумаге' },

  // --- Еда/абстрактное: sin (родительный), de, sobre (о…) ---
  'n-azucar': { sin: 'без сахара' },
  'n-sal': { sin: 'без соли' },
  'n-cafe': { sin: 'без кофе' },
  'n-musica': { sin: 'без музыки', sobre: 'о музыке' },
  'n-dinero': { sin: 'без денег' },
  'n-problema': { sin: 'без проблем', sobre: 'о проблеме' },
  'n-pregunta': { sin: 'без вопросов', sobre: 'о вопросе' },
  'n-comida': { sobre: 'о еде' },
  'n-libro': { sobre: 'о книге' },
  'n-pelicula': { sobre: 'о фильме' },
  'n-vida': { sobre: 'о жизни' },
  'n-amor': { sobre: 'о любви' },
  'n-mundo': { sobre: 'о мире' },
  'n-tiempo': { sin: 'без времени', sobre: 'о времени' },
  'n-historia': { sobre: 'об истории' },
  'n-idea': { sobre: 'об идее' },
}

/**
 * Применяем русские переопределения к списку существительных
 * (по умолчанию род русского перевода = испанский род).
 */
function withRuMeta(words: Word[]): Word[] {
  return words.map((w) => ({
    ...w,
    ruGender: RU_GENDER[w.id] ?? ruGenderFromWord(w.ru[0] ?? w.es),
    ruPluralOnly: RU_PLURAL_ONLY.has(w.id) || undefined,
    ruCases: RU_CASES[w.id],
  }))
}

export const NOUNS: Word[] = withRuMeta([

  // ===== Урок 6: семья =====
  n('n-padre', 'padre', 'm', 'padres', ['отец', 'папа'], 6, 'family', { esAlt: ['papá'] }),
  n('n-madre', 'madre', 'f', 'madres', ['мать', 'мама'], 6, 'family', { esAlt: ['mamá'] }),
  n('n-hijo', 'hijo', 'm', 'hijos', ['сын'], 6, 'family'),
  n('n-hija', 'hija', 'f', 'hijas', ['дочь'], 6, 'family'),
  n('n-hermano', 'hermano', 'm', 'hermanos', ['брат'], 6, 'family'),
  n('n-hermana', 'hermana', 'f', 'hermanas', ['сестра'], 6, 'family'),
  n('n-familia', 'familia', 'f', 'familias', ['семья'], 6, 'family'),
  n('n-amigo', 'amigo', 'm', 'amigos', ['друг'], 6, 'family'),
  n('n-amiga', 'amiga', 'f', 'amigas', ['подруга', 'подруга (жен.)'], 6, 'family'),
  n('n-nino', 'niño', 'm', 'niños', ['ребёнок', 'мальчик'], 6, 'person'),
  n('n-nina', 'niña', 'f', 'niñas', ['девочка'], 6, 'person'),

  // ===== Урок 7: люди и профессии =====
  n('n-hombre', 'hombre', 'm', 'hombres', ['мужчина'], 7, 'person'),
  n('n-mujer', 'mujer', 'f', 'mujeres', ['женщина'], 7, 'person'),
  n('n-persona', 'persona', 'f', 'personas', ['человек', 'личность'], 7, 'person'),
  n('n-senor', 'señor', 'm', 'señores', ['господин', 'мистер'], 7, 'person', { esAlt: ['señora (ж.р.)'] }),
  n('n-maestro', 'maestro', 'm', 'maestros', ['учитель'], 7, 'person'),
  n('n-maestra', 'maestra', 'f', 'maestras', ['учительница'], 7, 'person'),
  n('n-medico', 'médico', 'm', 'médicos', ['врач'], 7, 'person'),
  n('n-estudiante', 'estudiante', 'm', 'estudiantes', ['студент', 'ученик'], 7, 'person', {
    ruHint: 'Род определяется по полу: el estudiante / la estudiante',
  }),

  // ===== Урок 8: дом =====
  n('n-casa', 'casa', 'f', 'casas', ['дом'], 8, 'place', { ruHint: 'en casa — дома (без артикля)' }),
  n('n-cuarto', 'cuarto', 'm', 'cuartos', ['комната'], 8, 'place'),
  n('n-cocina', 'cocina', 'f', 'cocinas', ['кухня'], 8, 'place'),
  n('n-mesa', 'mesa', 'f', 'mesas', ['стол'], 8, 'thing'),
  n('n-silla', 'silla', 'f', 'sillas', ['стул'], 8, 'thing'),
  n('n-puerta', 'puerta', 'f', 'puertas', ['дверь'], 8, 'thing'),
  n('n-ventana', 'ventana', 'f', 'ventanas', ['окно'], 8, 'thing'),
  n('n-cama', 'cama', 'f', 'camas', ['кровать'], 8, 'thing'),
  n('n-bano', 'baño', 'm', 'baños', ['ванная', 'туалет'], 8, 'place'),

  // ===== Урок 9: места в городе =====
  n('n-escuela', 'escuela', 'f', 'escuelas', ['школа'], 9, 'place'),
  n('n-trabajo', 'trabajo', 'm', 'trabajos', ['работа'], 9, 'place', { ruHint: 'trabajo — и «работа», и место работы' }),
  n('n-ciudad', 'ciudad', 'f', 'ciudades', ['город'], 9, 'place'),
  n('n-calle', 'calle', 'f', 'calles', ['улица'], 9, 'place'),
  n('n-tienda', 'tienda', 'f', 'tiendas', ['магазин'], 9, 'place'),
  n('n-restaurante', 'restaurante', 'm', 'restaurantes', ['ресторан'], 9, 'place'),
  n('n-mercado', 'mercado', 'm', 'mercados', ['рынок'], 9, 'place'),
  n('n-parque', 'parque', 'm', 'parques', ['парк'], 9, 'place'),
  n('n-playa', 'playa', 'f', 'playas', ['пляж'], 9, 'place'),
  n('n-hotel', 'hotel', 'm', 'hoteles', ['отель'], 9, 'place'),
  n('n-banco', 'banco', 'm', 'bancos', ['банк'], 9, 'place'),
  n('n-hospital', 'hospital', 'm', 'hospitales', ['больница'], 9, 'place'),

  // ===== Урок 10: еда и напитки =====
  n('n-agua', 'agua', 'f', 'aguas', ['вода'], 10, 'drink', {
    articleGender: 'm',
    ruHint: 'Женский род, но артикль «el»: el agua fría',
  }),
  n('n-comida', 'comida', 'f', 'comidas', ['еда', 'еда (приём пищи)'], 10, 'food'),
  n('n-pan', 'pan', 'm', 'panes', ['хлеб'], 10, 'food'),
  n('n-leche', 'leche', 'f', 'leches', ['молоко'], 10, 'drink'),
  n('n-queso', 'queso', 'm', 'quesos', ['сыр'], 10, 'food'),
  n('n-huevo', 'huevo', 'm', 'huevos', ['яйцо'], 10, 'food'),
  n('n-carne', 'carne', 'f', 'carnes', ['мясо'], 10, 'food'),
  n('n-pollo', 'pollo', 'm', 'pollos', ['курица', 'курятина'], 10, 'food'),
  n('n-pescado', 'pescado', 'm', 'pescados', ['рыба (блюдо)'], 10, 'food'),
  n('n-arroz', 'arroz', 'm', 'arroces', ['рис'], 10, 'food'),
  n('n-fruta', 'fruta', 'f', 'frutas', ['фрукт', 'фрукты'], 10, 'food'),
  n('n-manzana', 'manzana', 'f', 'manzanas', ['яблоко'], 10, 'food'),
  n('n-platano', 'plátano', 'm', 'plátanos', ['банан'], 10, 'food'),
  n('n-tomate', 'tomate', 'm', 'tomates', ['помидор'], 10, 'food'),
  n('n-cafe', 'café', 'm', 'cafés', ['кофе'], 10, 'drink'),
  n('n-cerveza', 'cerveza', 'f', 'cervezas', ['пиво'], 10, 'drink'),
  n('n-jugo', 'jugo', 'm', 'jugos', ['сок'], 10, 'drink', { esAlt: ['zumo (Испания)'] }),
  n('n-vino', 'vino', 'm', 'vinos', ['вино'], 10, 'drink'),
  n('n-azucar', 'azúcar', 'm', 'azúcares', ['сахар'], 10, 'food', { ruHint: 'café sin azúcar — кофе без сахара' }),
  n('n-sal', 'sal', 'f', 'sales', ['соль'], 10, 'food', { ruHint: 'sin sal — без соли' }),

  // ===== Урок 11: вещи I =====
  n('n-libro', 'libro', 'm', 'libros', ['книга'], 11, 'thing'),
  n('n-telefono', 'teléfono', 'm', 'teléfonos', ['телефон'], 11, 'thing'),
  n('n-computadora', 'computadora', 'f', 'computadoras', ['компьютер'], 11, 'thing', {
    esAlt: ['computador'],
    ruHint: 'В Латинской Америке — computadora (в Испании — ordenador)',
  }),
  n('n-dinero', 'dinero', 'm', 'dineros', ['деньги'], 11, 'abstract'),
  n('n-llave', 'llave', 'f', 'llaves', ['ключ'], 11, 'thing'),
  n('n-reloj', 'reloj', 'm', 'relojes', ['часы'], 11, 'thing'),
  n('n-ropa', 'ropa', 'f', 'ropas', ['одежда'], 11, 'thing'),
  n('n-camisa', 'camisa', 'f', 'camisas', ['рубашка'], 11, 'thing'),
  n('n-zapato', 'zapato', 'm', 'zapatos', ['ботинок', 'туфля'], 11, 'thing'),
  n('n-bolsa', 'bolsa', 'f', 'bolsas', ['сумка', 'пакет'], 11, 'thing'),

  // ===== Урок 12: вещи II =====
  n('n-pelicula', 'película', 'f', 'películas', ['фильм'], 12, 'thing'),
  n('n-musica', 'música', 'f', 'músicas', ['музыка'], 12, 'abstract'),
  n('n-cancion', 'canción', 'f', 'canciones', ['песня'], 12, 'abstract'),
  n('n-foto', 'foto', 'f', 'fotos', ['фотография'], 12, 'thing', { es: 'foto', ruHint: 'От fotografía, артикль женский' }),
  n('n-regalo', 'regalo', 'm', 'regalos', ['подарок'], 12, 'thing'),
  n('n-carta', 'carta', 'f', 'cartas', ['письмо'], 12, 'thing'),
  n('n-papel', 'papel', 'm', 'papeles', ['бумага'], 12, 'thing'),
  n('n-lapiz', 'lápiz', 'm', 'lápices', ['карандаш'], 12, 'thing'),
  n('n-pluma', 'pluma', 'f', 'plumas', ['ручка'], 12, 'thing', { esAlt: ['bolígrafo'] }),
  n('n-carro', 'carro', 'm', 'carros', ['машина'], 12, 'thing', {
    esAlt: ['auto'],
    ruHint: 'В Латинской Америке — carro / auto (в Испании — coche)',
  }),

  // ===== Урок 30: время =====
  n('n-dia', 'día', 'm', 'días', ['день'], 30, 'abstract'),
  n('n-noche', 'noche', 'f', 'noches', ['ночь'], 30, 'abstract'),
  n('n-manana', 'mañana', 'f', 'mañanas', ['утро'], 30, 'abstract'),
  n('n-tarde', 'tarde', 'f', 'tardes', ['день (после обеда)'], 30, 'abstract'),
  n('n-ano', 'año', 'm', 'años', ['год'], 30, 'abstract'),
  n('n-mes', 'mes', 'm', 'meses', ['месяц'], 30, 'abstract'),
  n('n-semana', 'semana', 'f', 'semanas', ['неделя'], 30, 'abstract'),
  n('n-hora', 'hora', 'f', 'horas', ['час'], 30, 'abstract'),
  n('n-minuto', 'minuto', 'm', 'minutos', ['минута'], 30, 'abstract'),
  n('n-tiempo', 'tiempo', 'm', 'tiempos', ['время'], 30, 'abstract', { ruHint: 'No tengo tiempo — У меня нет времени' }),
  n('n-momento', 'momento', 'm', 'momentos', ['момент'], 30, 'abstract'),
  n('n-vida', 'vida', 'f', 'vidas', ['жизнь'], 30, 'abstract'),

  // ===== Урок 31: абстрактные понятия =====
  n('n-mundo', 'mundo', 'm', 'mundos', ['мир'], 31, 'abstract'),
  n('n-amor', 'amor', 'm', 'amores', ['любовь'], 31, 'abstract'),
  n('n-problema', 'problema', 'm', 'problemas', ['проблема'], 31, 'abstract', { ruHint: 'Несмотря на окончание -a, слово мужского рода' }),
  n('n-pregunta', 'pregunta', 'f', 'preguntas', ['вопрос'], 31, 'abstract'),
  n('n-respuesta', 'respuesta', 'f', 'respuestas', ['ответ'], 31, 'abstract'),
  n('n-palabra', 'palabra', 'f', 'palabras', ['слово'], 31, 'abstract'),
  n('n-nombre', 'nombre', 'm', 'nombres', ['имя'], 31, 'abstract'),
  n('n-cosa', 'cosa', 'f', 'cosas', ['вещь', 'штука'], 31, 'thing'),
  n('n-lugar', 'lugar', 'm', 'lugares', ['место'], 31, 'place'),
  n('n-parte', 'parte', 'f', 'partes', ['часть'], 31, 'abstract'),
  n('n-manera', 'manera', 'f', 'maneras', ['способ', 'манера'], 31, 'abstract'),
  n('n-razon', 'razón', 'f', 'razones', ['причина', 'правота'], 31, 'abstract'),
  n('n-verdad', 'verdad', 'f', 'verdades', ['правда'], 31, 'abstract'),
  n('n-idea', 'idea', 'f', 'ideas', ['идея'], 31, 'abstract'),
  n('n-historia', 'historia', 'f', 'historias', ['история', 'рассказ'], 31, 'abstract'),

  // ===== Урок 32: языки =====
  n('n-espanol', 'español', 'm', 'españoles', ['испанский язык'], 32, 'language'),
  n('n-ruso', 'ruso', 'm', 'rusos', ['русский язык'], 32, 'language'),
  n('n-ingles', 'inglés', 'm', 'ingleses', ['английский язык'], 32, 'language'),
])
