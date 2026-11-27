'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { getMessages, registerInterfaceLabels } from '../lib/i18n'

const LocaleContext = createContext('en')

/**
 * Use the configured locale on both server rendering and hydration. `labels`
 * are the language's `_labels.json` interface translations.
 */
export function LocaleProvider({
  lang,
  labels,
  children,
}: {
  lang?: string
  labels?: Record<string, string>
  children: ReactNode
}) {
  // Children read the catalog during this same render, so register it first.
  if (labels) registerInterfaceLabels(lang, labels)
  return (
    <LocaleContext.Provider value={lang ?? 'en'}>
      {children}
    </LocaleContext.Provider>
  )
}

/** The configured language tag, e.g. `es-ES`. */
export function useLanguage() {
  return useContext(LocaleContext)
}

export function useMessages() {
  return getMessages(useContext(LocaleContext))
}
