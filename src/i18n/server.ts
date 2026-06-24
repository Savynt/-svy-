import { cookies } from 'next/headers'
import { messages, interpolate } from './index'
import { type Locale, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from './locales'

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return (value && (LOCALES as readonly string[]).includes(value)) ? (value as Locale) : DEFAULT_LOCALE
}

export async function getT() {
  const locale = await getLocale()
  const m = messages[locale]
  const fallback = messages[DEFAULT_LOCALE]
  return function t(key: string, vars?: Record<string, string | number>): string {
    const str = m[key] ?? fallback[key] ?? key
    return vars ? interpolate(str, vars) : str
  }
}
