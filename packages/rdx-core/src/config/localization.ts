import fs from 'node:fs'
import path from 'node:path'
import type { RdxLocalization } from '@lexibase/rdx-types'
import { RdxConfigError } from './error'

/** Validate language identities without depending on live filesystem trees. */
export function normalizeLocalization(
  input: unknown,
  language: string
): RdxLocalization {
  const fail = (message: string): never => {
    throw new RdxConfigError(`localization: ${message}`)
  }
  if (!input || typeof input !== 'object' || Array.isArray(input))
    fail('expected an object.')
  const value = input as Record<string, unknown>
  if (
    Object.keys(value).some((key) => key !== 'locales') ||
    !Array.isArray(value.locales) ||
    value.locales.length < 2
  )
    fail('locales must declare at least two languages.')
  function code(value: unknown) {
    if (typeof value !== 'string')
      return fail('locale code must be a language tag.')
    try {
      return Intl.getCanonicalLocales(value)[0] ?? fail('empty locale code.')
    } catch {
      return fail(`invalid language tag "${value}".`)
    }
  }
  const primary = code(language)
  const seen = new Set<string>()
  const folders = new Set<string>()
  const locales = (value.locales as unknown[]).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      return fail('each locale must be an object.')
    const entry = item as Record<string, unknown>
    if (
      Object.keys(entry).some(
        (key) => !['code', 'label', 'folder'].includes(key)
      )
    )
      fail('unknown locale option.')
    const tag = code(entry.code)
    const url = tag.toLowerCase()
    if (['docs', 'rdx-search', 'api'].includes(url) || seen.has(url))
      fail(`duplicate or reserved locale "${tag}".`)
    seen.add(url)
    if (typeof entry.label !== 'string' || !entry.label.trim())
      return fail(`locale ${tag} requires a label.`)
    if (tag === primary) {
      if (entry.folder !== undefined)
        fail('the primary language always uses docs/.')
      return { code: tag, path: url, label: entry.label }
    }
    const folder = entry.folder ?? url
    if (
      typeof folder !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(folder)
    )
      return fail(`unsafe folder for ${tag}.`)
    if (folders.has(folder.toLowerCase())) fail(`duplicate folder "${folder}".`)
    folders.add(folder.toLowerCase())
    return { code: tag, path: url, label: entry.label, folder }
  })
  if (!seen.has(primary.toLowerCase()))
    fail(`locales must include the primary language ${primary}.`)
  return { defaultLocale: primary, locales }
}

export function resolveLocalization(
  input: unknown,
  language: string,
  rootDir: string,
  command: string
) {
  const localization = normalizeLocalization(input, language)
  for (const locale of localization.locales) {
    if (!locale.folder) continue
    const directory = path.resolve(
      /* turbopackIgnore: true */ rootDir,
      'locale',
      locale.folder,
      'docs'
    )
    if (!fs.existsSync(/* turbopackIgnore: true */ directory)) {
      if (command === 'runtime' || command === 'start') continue
      throw new RdxConfigError(
        `localization: missing locale/${locale.folder}/docs/. Create it before enabling ${locale.code}.`
      )
    }
    if (!fs.statSync(/* turbopackIgnore: true */ directory).isDirectory())
      throw new RdxConfigError(
        `localization: locale/${locale.folder}/docs/ must be a directory.`
      )
    const relative = path.relative(
      fs.realpathSync(/* turbopackIgnore: true */ rootDir),
      fs.realpathSync(/* turbopackIgnore: true */ directory)
    )
    if (
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      throw new RdxConfigError(
        `localization: locale ${locale.code} must remain inside the project.`
      )
  }
  return localization
}
