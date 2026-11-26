// ============================================================
// shared/types.ts — типы домена приложения «¡Vamos!»
//
// Общий слой типов для клиентской части (app/) и серверной (server/).
// В Nuxt 4 каталог shared/ доступен обеим сторонам через алиас #shared.
//
// ВАЖНО: проект ориентирован на латиноамериканский испанский (es-419):
// — второе лицо множественного числа — ТОЛЬКО ustedes (vosotros не используется);
// — набор лиц глагола: yo, tú, usted/él/ella, nosotros, ustedes/ellos/ellas.
// ============================================================

/** Части речи, по которым организованы слова и уроки */
export type PartOfSpeech =
  | 'pronoun'       // местоимения (подлежащие, дополнения, притяжательные...)
  | 'determiner'    // артикли и определители (el, un, este, mucho...)
  | 'verb'          // глаголы
  | 'noun'          // существительные
  | 'adjective'     // прилагательные
  | 'preposition'   // предлоги (a, de, en, con, para, por...)
  | 'adverb'        // наречия (aquí, siempre, muy...)
  | 'question'      // вопросительные слова (qué, dónde...)
  | 'conjunction'   // союзы (y, o, pero, porque...)
  | 'number'        // числительные
  | 'construction'  // конструкции (hay, tener que + инфинитив...)

/**
 * Лица глагола в настоящем времени:
 * 1s = yo, 2s = tú, 3s = usted/él/ella, 1p = nosotros,
 * 2p = vosotros (полная парадигма для карточки слова),
 * 3p = ustedes/ellos/ellas (в фразах — латиноамериканский набор)
 */
export type VerbPerson = '1s' | '2s' | '3s' | '1p' | '2p' | '3p'

/** Род существительного/прилагательного */
export type Gender = 'm' | 'f'

/** Число (грамматическое) */
export type GramNumber = 'sg' | 'pl'

/** Ключи русских падежных форм для предлогов */
export type RuCaseKey =
  | 'a' | 'de' | 'en' | 'con' | 'para' | 'sin' | 'sobre' | 'desde' | 'hasta' | 'dat'

/** Семантические классы существительных — используются движком фраз
 *  для отбора слов в шаблоны («ехать В школу», но «разговаривать С мамой») */
export type NounClass =
  | 'person'     // люди и профессии
  | 'family'     // семья
  | 'place'      // места
  | 'thing'      // предметы
  | 'food'       // еда
  | 'drink'      // напитки
  | 'animal'     // животные
  | 'abstract'   // абстрактные понятия (время, жизнь, работа...)
  | 'language'   // языки (español, ruso, inglés)

/** Полные формы прилагательного/определителя для согласования */
export interface AdjectiveForms {
  m: string   // ед.ч. мужской род:  bueno
  f: string   // ед.ч. женский род:  buena
  mp: string  // мн.ч. мужской род:  buenos
  fp: string  // мн.ч. женский род:  buenas
}

/** Данные глагола */
export interface VerbData {
  /** Настоящее время, латиноамериканский набор лиц */
  forms: Record<VerbPerson, string>
  /** Требует прямого дополнения (ver, comer, leer...) */
  transitive: boolean
  /** Семантика прямого дополнения: с какими классами существительных сочетается */
  objClasses?: NounClass[]
  /** С какими предлогами сочетается: ir → [a], hablar → [con, sobre] */
  withPrep?: string[]
  /** Герундий для неправильных глаголов (decir → diciendo); у правильных вычисляется */
  gerund?: string
  /** Сочетается с инфинитивом (модальный): querer, poder, necesitar */
  modal?: boolean
  /** Сочетается с обстоятельством места aquí/allí: estar, vivir, trabajar */
  placeAdv?: boolean
  /** Особое поведение в шаблонах фраз */
  special?: 'gustar'
  /** Русский инфинитив для шаблонов с модальными глаголами (quiero comer → «хочу есть») */
  ruInf?: string
  /**
   * Формы русского глагола [я, ты, он/она, мы, вы, они] —
   * полная парадигма: «вы» нужно и для usted, и для ustedes.
   */
  ruForms?: [string, string, string, string, string, string]
}

/** Данные местоимения */
export interface PronounData {
  role: 'subject' | 'object' | 'possessive' | 'demonstrative' | 'indefinite'
  /** Лицо для подлежащих (yo → 1s) — определяет форму глагола */
  person?: VerbPerson
  /**
   * Подразумеваемые род и число подлежащего (для согласования прилагательных):
   * nosotros → мужской род мн.ч. («somos altos»), ella → женский ед.ч.
   */
  impliedGender?: Gender
  impliedNumber?: GramNumber
  /** Косвенное дополнение (me, te, le...) — нужно для конструкции gustar */
  io?: boolean
  /** Формы согласования для притяжательных/указательных (mi → mi/mis) */
  forms?: AdjectiveForms
  /** Русский родительный падеж местоимения для «У меня есть…» (yo → меня) */
  ruGen?: string
  /** Русский дательный падеж (yo → мне) — для «Мне нужно…» */
  ruDat?: string
}

/** Данные конструкции (hay, tener que + инфинитив...) */
export interface ConstructionData {
  /** Как строится: «{V} que {V2}», «hay {N}», «hace {Num} {N-pl}» */
  pattern: 'inf' | 'noun' | 'number-noun' | 'gerund' | 'fixed'
  /** Русское описание конструкции */
  ru: string
  /** Фиксированная фраза (для pattern: 'fixed') */
  fixedEs?: string
  fixedRu?: string
}

/** Данные определителя (артикль, притяжательное, указательное, количество) */
export interface DeterminerData {
  /** Для существительных какого рода подходит (у артиклей el/la) */
  gender?: Gender
  /** Для какого числа */
  number?: GramNumber
  /** Определённый артикль (el, la, los, las) */
  definite?: boolean
  /** Неопределённый артикль (un, una, unos, unas) */
  indefinite?: boolean
  /** Притяжательное (mi, tu, su, nuestro) */
  possessive?: boolean
  /** Указательное (este, ese) */
  demonstrative?: boolean
  /** Количество (mucho, poco) */
  quantity?: boolean
}

/** Данные наречия */
export interface AdverbData {
  /** Ставится перед глаголом (siempre, nunca, también...) */
  preVerb?: boolean
  /** Обстоятельство места (aquí, allí) */
  place?: boolean
}

/** Слово словаря — центральная сущность приложения */
export interface Word {
  /** Уникальный идентификатор, напр. 'v-hablar', 'n-casa', 'p-yo' */
  id: string
  pos: PartOfSpeech
  /** Испанская базовая форма (инфинитив / ед.ч. м.р. / местоимение) */
  es: string
  /** Латиноамериканские варианты написания/синонимы (tomar = beber) */
  esAlt?: string[]
  /** Русские переводы */
  ru: string[]
  /** Краткая подсказка/примечание (например, про употребление) */
  ruHint?: string
  /** Номер урока, в котором слово вводится (порядок изучения) */
  lesson: number

  // --- Существительные ---
  gender?: Gender
  /** Форма множественного числа (mesa → mesas, mes → meses) */
  nounPlural?: string
  nounClass?: NounClass
  /** Род артикля, если отличается от рода слова (el agua — ж.р., но «el») */
  articleGender?: Gender
  /** Род русского перевода (проблема — ж.р., aunque problema — м.р.) */
  ruGender?: 'm' | 'f' | 'n'
  /** Русский перевод употребляется только во мн.ч. (часы, деньги) */
  ruPluralOnly?: boolean
  /**
   * Русские падежные формы для переводов с предлогами.
   * Ключи — предлоги и служебные значения: a (в/к + вин.), de (из + род.),
   * en (в/на + предл.), con (с + твор.), para (для + род.), sin (без + род.),
   * sobre (о + предл.), dat (кому: помогаю другу), desde, hasta.
   */
  ruCases?: Partial<Record<RuCaseKey, string>>

  // --- Прилагательные и согласованные определители ---
  adj?: AdjectiveForms
  /** Прилагательное состояния — сочетается с estar (cansado, contento...) */
  adjState?: boolean
  /** Русский перевод в зависимости от класса существительного
   *  (rico: comida → «вкусный», hombre → «богатый») */
  ruByClass?: Partial<Record<NounClass, string>>
  /** Краткая форма русского прилагательного-состояния (устал / устала / устали) */
  ruShort?: { m: string; f: string; pl: string }
  /** Русские формы определителя: мой → моё / моя / мою (вин. ж.р.) / мои.
   *  Артикли и «много/мало» не переводятся согласованием — поле им не нужно. */
  ruDet?: { m: string; n: string; f: string; pl: string; accF: string }

  // --- Глаголы ---
  verb?: VerbData

  // --- Местоимения ---
  pronoun?: PronounData

  // --- Определители ---
  det?: DeterminerData

  // --- Наречия ---
  adverb?: AdverbData

  // --- Конструкции ---
  construction?: ConstructionData

  // --- Предлоги ---
  /** Классы существительных, с которыми предлог образует осмысленные фразы */
  nounClasses?: NounClass[]
}

/** ===== Прогресс изучения (хранится на сервере / в localStorage) ===== */

/** Статистика ответов по конкретному слову */
export interface WordProgress {
  /** Верных ответов */
  correct: number
  /** Неверных ответов */
  wrong: number
  /** Когда слово стало «выученным» (timestamp) */
  knownAt?: number
  /** Пользователь отметил «Уже знал» (timestamp) — слово считается
   *  выученным: входит в knownSet и во фразы, как пройденное в уроках */
  star?: number
}

/** Статистика по конкретной фразе (ключ = templateId + индексы заполнения) */
export interface PhraseProgress {
  practiced: number
  correct: number
}

/** Весь прогресс пользователя */
export interface Progress {
  /** Версия схемы — для будущих миграций */
  version: 1
  /** Слова: id → статистика ответов */
  words: Record<string, WordProgress>
  /** Фразы: ключ → статистика практики */
  phrases: Record<string, PhraseProgress>
  /** Фразы, отмеченные «уже выучил»: нормализованное испанское предложение
   *  (нижний регистр, без пунктуации) → когда отмечено. Попадаются реже */
  starredPhrases?: Record<string, number>
  /** Суммарные счётчики ответов */
  answers: { correct: number; wrong: number }
  /** Дни активности (ISO «2026-11-23») — для серии дней, храним последние ~400 */
  streakDates: string[]
  /** Достижения: id → когда получено */
  achievements: Record<string, number>
  /** Настройки, синхронизируемые между устройствами */
  settings: {
    locale?: 'ru' | 'es'
    theme?: 'light' | 'dark'
    /** Размер шрифта интерфейса: s — мелкий, m — обычный, l — крупный */
    fontSize?: 's' | 'm' | 'l'
    /** Поэтапная сборка фразы («Слова по шагам»): усложнённый режим,
     *  в котором плитки-кандидаты открываются шаг за шагом */
    stagedBuild?: boolean
  }
  updatedAt: number
}

/** Пустой прогресс для нового пользователя */
export function emptyProgress(): Progress {
  return {
    version: 1,
    words: {},
    phrases: {},
    answers: { correct: 0, wrong: 0 },
    streakDates: [],
    achievements: {},
    settings: {},
    updatedAt: 0,
  }
}

/**
 * Сколько верных ответов нужно, чтобы слово считалось выученным.
 * Механика приложения: только тесты (объективный счётчик).
 */
export const KNOWN_THRESHOLD = 2

/**
 * Слово выучено? Порог верных ответов — или пользователь подтвердил
 * знание кнопкой «Уже знал» (тогда слово включается во фразы,
 * как будто пройдено в уроках).
 */
export function isWordKnown(w: WordProgress | undefined): boolean {
  return !!w && (w.correct >= KNOWN_THRESHOLD || !!w.star)
}

/** ===== Аутентификация / API ===== */

/** Ответ сервера на регистрацию/вход */
export interface AuthResponse {
  ok: true
  token: string
  profileId: number
  name: string
}

/** Ответ с прогрессом */
export interface ProgressResponse {
  ok: true
  progress: Progress
}
