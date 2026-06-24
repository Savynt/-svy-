'use client'

import { createContext, useContext } from 'react'
import { interpolate, type Messages, type Locale } from './index'
import { DEFAULT_LOCALE } from './locales'
import { messages } from './index'

interface LocaleContextValue {
  locale: Locale
  m: Messages
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  m: messages[DEFAULT_LOCALE],
})

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <LocaleContext.Provider value={{ locale, m: messages[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale
}

export function useT() {
  const { m } = useContext(LocaleContext)
  const fallback = messages[DEFAULT_LOCALE]
  return function t(key: string, vars?: Record<string, string | number>): string {
    const str = m[key] ?? fallback[key] ?? key
    return vars ? interpolate(str, vars) : str
  }
}
