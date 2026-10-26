'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { getMessages, resolveInterfaceLocale } from '../lib/i18n'

const LocaleContext = createContext('en')

/** Use the configured locale on both server rendering and hydration. */
export function LocaleProvider({
  lang,
  children,
}: {
  lang?: string
  children: ReactNode
}) {
  return (
    <LocaleContext.Provider value={resolveInterfaceLocale(lang)}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useInterfaceLocale() {
  return useContext(LocaleContext)
}

export function useMessages() {
  return getMessages(useInterfaceLocale())
}
