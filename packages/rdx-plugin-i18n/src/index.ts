import type { RdxLocalizationOptions, RdxPlugin } from '@lexibase/rdx-types'
import fs from 'node:fs'
import path from 'node:path'
import { normalizeLocalization } from '@lexibase/rdx-core/config'

function hasDocuments(directory: string): boolean {
  return fs
    .readdirSync(/* turbopackIgnore: true */ directory, { withFileTypes: true })
    .some((entry) => {
      if (entry.isDirectory())
        return hasDocuments(path.join(directory, entry.name))
      return entry.isFile() && entry.name.endsWith('.mdx')
    })
}

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
    snapshot(context) {
      const frozen = normalizeLocalization(options, context.config.lang)
      const directories = frozen.locales
        .filter((locale) => locale.folder)
        .map((locale) => ({
          sourceDir: `locale/${locale.folder}/docs`,
          snapshotDir: `locale/${locale.folder}/versioned_docs/version-${context.version}`,
        }))
      const translations = Object.fromEntries(
        frozen.locales
          .filter((locale) => locale.folder)
          .map((locale) => [
            locale.code,
            {
              docsDir: `locale/${locale.folder}/versioned_docs/version-${context.version}`,
              hasDocuments: hasDocuments(
                path.resolve(
                  /* turbopackIgnore: true */ context.rootDir,
                  'locale',
                  locale.folder!,
                  'docs'
                )
              ),
            },
          ])
      )
      return {
        directories,
        files: [
          {
            filename: `${context.snapshotDir}/.rdx-locales.json`,
            content:
              JSON.stringify(
                {
                  schemaVersion: 1,
                  defaultLocale: frozen.defaultLocale,
                  locales: frozen.locales.map(
                    ({ path: _path, ...locale }) => locale
                  ),
                  translations,
                },
                null,
                2
              ) + '\n',
          },
        ],
      }
    },
  }
}
