// ============================================================
// test/unit/speech.spec.ts — выбор испанского голоса для озвучки.
// Гарантия: при наличии es-* голосов всегда берётся испанский,
// латиноамериканские варианты приоритетнее es-ES.
// ============================================================
import { describe, expect, it } from 'vitest'
import { pickSpanishVoice } from '../../app/composables/useSpeech'

const voice = (lang: string, name = `Voice ${lang}`) => ({ lang, name, default: false })

describe('pickSpanishVoice — выбор испанского голоса', () => {
  it('предпочитает es-MX всем остальным', () => {
    const voices = [voice('ru-RU'), voice('en-US'), voice('es-ES'), voice('es-MX')]
    expect(pickSpanishVoice(voices)?.name).toBe('Voice es-MX')
  })

  it('выбирает es-419 (латиноамериканский общий), даже если es-ES идёт раньше', () => {
    const voices = [voice('es-ES'), voice('es-419'), voice('ru-RU')]
    expect(pickSpanishVoice(voices)?.name).toBe('Voice es-419')
  })

  it('es-US (испанский США) приоритетнее es-ES', () => {
    const voices = [voice('es-ES'), voice('es-US')]
    expect(pickSpanishVoice(voices)?.name).toBe('Voice es-US')
  })

  it('если латиноамериканских нет — берёт любой испанский (es-ES)', () => {
    const voices = [voice('ru-RU'), voice('en-US'), voice('es-ES'), voice('fr-FR')]
    expect(pickSpanishVoice(voices)?.lang).toBe('es-ES')
  })

  it('понимает вариант записи с подчёркиванием (es_MX)', () => {
    const voices = [voice('es_MX'), voice('ru_RU')]
    expect(pickSpanishVoice(voices)?.lang).toBe('es_MX')
  })

  it('без испанских голосов возвращает null (включая русский по умолчанию)', () => {
    const voices = [voice('ru-RU', 'Microsoft Irina'), voice('en-US')]
    expect(pickSpanishVoice(voices)).toBeNull()
  })

  it('пустой список голосов (Chrome ещё не загрузил) — null', () => {
    expect(pickSpanishVoice([])).toBeNull()
  })

  it('регистр языка не важен', () => {
    const voices = [voice('ES-MX'), voice('RU-ru')]
    expect(pickSpanishVoice(voices)?.lang).toBe('ES-MX')
  })
})
