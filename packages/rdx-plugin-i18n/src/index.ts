import type { RdxLocalizationOptions, RdxPlugin } from '@lexibase/rdx-types'

/** Explicitly activate multilingual content. Language tags never imply machine translation. */
export function i18n(options: RdxLocalizationOptions): RdxPlugin {
  if (
    !options ||
    typeof options !== 'object' ||
    !Array.isArray(options.locales)
  )
    throw new Error('i18n() requires an object with a locales array.')
  return {
    name: '@lexibase/rdx-i18n',
    apiVersion: 1,
    setup: () => ({ localization: options }),
  }
}
