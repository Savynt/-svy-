export const LOCALES = ['en', 'ru', 'uz'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'svy-locale'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  uz: "O'zbek",
}
