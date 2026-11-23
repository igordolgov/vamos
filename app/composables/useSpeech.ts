// ============================================================
// app/composables/useSpeech.ts — озвучка через Web Speech API.
//
// Латиноамериканское произношение: предпочитаем es-MX, затем
// es-419 / es-US и остальные es-*. Если синтеза речи нет — кнопки
// не показываем.
//
// ВАЖНО: Chrome/Edge/Safari отдают список голосов асинхронно
// (после события voiceschanged). Если в момент клика список ещё
// пуст, pickVoice возвращает null, и движок озвучивает текст
// голосом ПО УМОЛЧАНИЮ — например, русским. Поэтому:
//   1) голоса кешируются + подписка на voiceschanged + опросы;
//   2) speakEs дожидается загрузки списка (до ~2 c) перед выбором;
//   3) если испанского голоса нет в системе вовсе — показываем
//      одноразовое предупреждение (пользователь понимает, почему
//      произношение может звучать неправильно).
// ============================================================

/** Доступен ли синтез речи в браузере */
export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Глобальный тост (назначается в AppToasts) */
declare global {
  interface Window {
    __vamosToast?: (text: string, icon?: string) => void
  }
}

/** Языки в порядке предпочтения — латиноамериканский испанский первым */
const PREFERRED_LANGS = ['es-mx', 'es-419', 'es-us', 'es-co', 'es-ar', 'es-cl', 'es-pe', 'es-es']

/**
 * Чистая функция выбора испанского голоса (вынесена для тестов).
 * 1) точное совпадение с предпочтительными вариантами;
 * 2) любой голос, чей lang начинается с «es»;
 * 3) null — испанского голоса нет.
 */
export function pickSpanishVoice(voices: Array<{ lang?: string }>): { lang?: string } | null {
  for (const lang of PREFERRED_LANGS) {
    const voice = voices.find((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(lang))
    if (voice) return voice
  }
  return voices.find((v) => v.lang?.toLowerCase().startsWith('es')) ?? null
}

// Кеш голосов: список грузится асинхронно, слушаем voiceschanged
let cachedVoices: SpeechSynthesisVoice[] = []
let listenerBound = false

function refreshVoices(): void {
  if (!speechAvailable()) return
  const list = window.speechSynthesis.getVoices()
  if (list.length) cachedVoices = list
}

function bindVoiceEvents(): void {
  if (!speechAvailable() || listenerBound) return
  listenerBound = true
  refreshVoices()
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  // Страховка для движков, которые событие voiceschanged не шлют
  setTimeout(refreshVoices, 300)
  setTimeout(refreshVoices, 1500)
}

/** Предзагрузка списка голосов (вызывается из layout при старте) */
export function warmUpVoices(): void {
  bindVoiceEvents()
}

/** Есть ли в системе испанский голос (после загрузки списка) */
export function hasSpanishVoice(): boolean {
  if (!speechAvailable()) return false
  if (!cachedVoices.length) refreshVoices()
  return pickSpanishVoice(cachedVoices) !== null
}

/** Локаль интерфейса без Nuxt-контекста (cookie читаем напрямую) */
function currentLocale(): 'ru' | 'es' {
  try {
    const m = document.cookie.match(/vamos\.locale=(ru|es)/)
    return m?.[1] === 'es' ? 'es' : 'ru'
  } catch {
    return 'ru'
  }
}

/** Предупреждение об отсутствии испанского голоса (RU/ES) */
const NO_VOICE_WARN: Record<'ru' | 'es', string> = {
  ru: 'В системе не найден испанский голос — озвучка может звучать неправильно. Установите испанский TTS-голос (es-MX / es-419).',
  es: 'No se encontró voz en español en el sistema — la pronunciación puede ser incorrecta. Instala una voz TTS en español (es-MX / es-419).',
}

/** Предупреждение показываем один раз за сессию */
let warnedNoVoice = false

/** Озвучить текст на испанском */
export async function speakEs(text: string): Promise<void> {
  if (!speechAvailable()) return
  try {
    bindVoiceEvents()
    // Прерываем предыдущую озвучку — кнопки часто нажимают подряд
    window.speechSynthesis.cancel()

    // Список голосов ещё не загружен — дожидаемся (до ~2 c),
    // иначе движок возьмёт системный голос по умолчанию
    if (!cachedVoices.length) {
      const started = Date.now()
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          refreshVoices()
          if (cachedVoices.length || Date.now() - started > 2000) {
            clearInterval(timer)
            resolve()
          }
        }, 100)
      })
    }

    const utter = new SpeechSynthesisUtterance(text)
    const voice = pickSpanishVoice(cachedVoices) as SpeechSynthesisVoice | null
    if (voice) {
      utter.voice = voice
      utter.lang = voice.lang
    } else {
      // Голоса нет — языковая метка может помочь движку выбрать синтез,
      // а пользователю показываем причину неточного произношения
      utter.lang = 'es-MX'
      if (!warnedNoVoice) {
        warnedNoVoice = true
        window.__vamosToast?.(NO_VOICE_WARN[currentLocale()], '🔇')
      }
    }
    utter.rate = 0.92
    utter.pitch = 1
    window.speechSynthesis.speak(utter)
  } catch {
    // синтез может упасть в редких средах — молча игнорируем
  }
}
