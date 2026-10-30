import fs from 'node:fs'
import path from 'node:path'
import type {
  RdxContentSource,
  RdxLocalization,
  RdxSourceLocalization,
} from '@lexibase/rdx-types'
import { normalizeLocalization } from './localization'
import { boundedProjectPath } from './paths'
import { RdxConfigError } from './error'

function readSnapshot(
  rootDir: string,
  source: RdxContentSource,
  current: RdxLocalization,
  validateContent = true
): RdxSourceLocalization | undefined {
  const relative = path.join(source.docsDir, '.rdx-locales.json')
  const filename = boundedProjectPath(
    rootDir,
    relative,
    'snapshot locale metadata'
  )
  try {
    if (!fs.lstatSync(/* turbopackIgnore: true */ filename).isFile())
      throw new Error('Expected a regular metadata file.')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  try {
    const value: unknown = JSON.parse(
      fs.readFileSync(/* turbopackIgnore: true */ filename, 'utf8')
    )
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Expected a metadata object.')
    const stored = value as Record<string, unknown>
    if (
      stored.schemaVersion !== 1 ||
      Object.keys(stored).some(
        (key) =>
          ![
            'schemaVersion',
            'defaultLocale',
            'locales',
            'translations',
          ].includes(key)
      ) ||
      typeof stored.defaultLocale !== 'string'
    )
      throw new Error('Unsupported snapshot locale metadata.')
    const frozen = normalizeLocalization(
      { locales: stored.locales },
      stored.defaultLocale
    )
    if (frozen.defaultLocale !== current.defaultLocale)
      throw new Error(
        'The primary language differs from this snapshot. Restore the original lang setting before using its versions.'
      )
    if (
      !stored.translations ||
      typeof stored.translations !== 'object' ||
      Array.isArray(stored.translations)
    )
      throw new Error('Expected translations metadata.')
    const translations = stored.translations as Record<string, unknown>
    const expected = frozen.locales.filter((locale) => locale.folder)
    if (
      Object.keys(translations).some(
        (code) => !expected.some((locale) => locale.code === code)
      )
    )
      throw new Error('Unknown snapshot translation language.')
    const docs: Record<string, string> = {
      [frozen.defaultLocale]: source.docsDir,
    }
    for (const locale of expected) {
      const entry = translations[locale.code]
      if (!entry || typeof entry !== 'object' || Array.isArray(entry))
        throw new Error(`Missing snapshot translation metadata: ${locale.code}`)
      const data = entry as Record<string, unknown>
      const directory = `locale/${locale.folder}/versioned_docs/version-${source.version}`
      if (
        data.docsDir !== directory ||
        typeof data.hasDocuments !== 'boolean' ||
        Object.keys(data).some(
          (key) => !['docsDir', 'hasDocuments'].includes(key)
        )
      )
        throw new Error(`Invalid snapshot directory for ${locale.code}.`)
      const absolute = boundedProjectPath(
        rootDir,
        directory,
        'snapshot translation'
      )
      if (
        validateContent &&
        fs.existsSync(/* turbopackIgnore: true */ absolute)
      ) {
        if (!fs.statSync(/* turbopackIgnore: true */ absolute).isDirectory())
          throw new Error(
            `Snapshot translation must be a directory: ${directory}`
          )
      } else if (validateContent && data.hasDocuments)
        throw new Error(
          `Missing snapshot translation ${directory}. Restore the published snapshot; live translations cannot replace it.`
        )
      docs[locale.code] = directory
    }
    return { ...frozen, docs }
  } catch (error) {
    throw new RdxConfigError(
      `Invalid ${relative}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/** Read-only hydration after all plugin setup hooks; plugin order cannot change editions. */
export function hydrateSourceLocalizations(
  rootDir: string,
  sources: RdxContentSource[],
  current: RdxLocalization,
  runtimeFiles: Set<string>
): RdxLocalization {
  const primary = current.locales.find(
    (locale) => locale.code === current.defaultLocale
  )!
  const languages = new Map(
    current.locales.map((locale) => [locale.code, locale])
  )
  for (const [index, source] of sources.entries()) {
    let inventory: RdxSourceLocalization
    if (source.id === 'current') {
      inventory = {
        ...current,
        docs: Object.fromEntries(
          current.locales.map((locale) => [
            locale.code,
            locale.folder ? `locale/${locale.folder}/docs` : source.docsDir,
          ])
        ),
      }
    } else {
      const frozen = source.version
        ? readSnapshot(rootDir, source, current)
        : undefined
      inventory = frozen ?? {
        defaultLocale: current.defaultLocale,
        locales: [primary],
        docs: { [primary.code]: source.docsDir },
      }
      if (frozen)
        runtimeFiles.add(path.join(source.docsDir, '.rdx-locales.json'))
    }
    sources[index] = { ...source, localization: inventory }
    for (const locale of inventory.locales)
      if (!languages.has(locale.code)) languages.set(locale.code, locale)
    if (source.redirectTo !== undefined && source.previousSnapshot) {
      const retained = readSnapshot(
        rootDir,
        { ...source, ...source.previousSnapshot },
        current,
        false
      )
      if (retained) {
        runtimeFiles.add(
          path.join(source.previousSnapshot.docsDir, '.rdx-locales.json')
        )
        for (const locale of retained.locales)
          if (!languages.has(locale.code)) languages.set(locale.code, locale)
      }
    }
  }
  return {
    ...current,
    defaultLocale: current.defaultLocale,
    locales: [...languages.values()],
  }
}
