import en, { type Messages, type MessageKey } from './messages/en'
import ru from './messages/ru'
import uz from './messages/uz'
import { type Locale } from './locales'

export const messages: Record<Locale, Messages> = { en, ru, uz }

/** Replace {{key}} placeholders in a translation string. */
export function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''))
}

export type { Messages, MessageKey, Locale }
