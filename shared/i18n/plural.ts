/**
 * Склонение существительных при числах.
 * «+1 фраза», «+2 фразы», «+5 фраз», «+12 фраз», «+101 фраза».
 */

/** Русская форма: forms = [1, 2–4, 5+] */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const m100 = Math.abs(Math.trunc(n)) % 100
  const m10 = m100 % 10
  if (m100 > 10 && m100 < 20) return forms[2]
  if (m10 === 1) return forms[0]
  if (m10 >= 2 && m10 <= 4) return forms[1]
  return forms[2]
}

/** Испанская форма: 1 → единственное число, остальное — множественное */
export function pluralEs(n: number, one: string, many: string): string {
  return Math.abs(Math.trunc(n)) === 1 ? one : many
}

/** Слово «фраза» в форме, подходящей к числу */
export function phrasesWord(n: number, locale: 'ru' | 'es'): string {
  return locale === 'es'
    ? pluralEs(n, 'frase', 'frases')
    : pluralRu(n, ['фраза', 'фразы', 'фраз'])
}
