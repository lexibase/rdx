import {
  lstat,
  mkdir,
  realpath,
  rmdir,
  writeFile,
  readFile,
  unlink,
} from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { normalizeLocalization } from '@lexibase/rdx-core/config'

function languageLabel(code) {
  try {
    const label = new Intl.DisplayNames([code], { type: 'language' }).of(code)
    return label[0].toLocaleUpperCase(code) + label.slice(1)
  } catch {
    // Valid tags with extensions need not have a display name in ICU.
    return code
  }
}

/** Additional language tags; the existing lang always remains primary. */
export function initialLocales(primary, additional) {
  const lang = Intl.getCanonicalLocales(primary)[0]
  if (!lang) throw new Error('lang must be a valid language tag.')
  if (typeof additional !== 'string' || !additional.trim())
    throw new Error('Enter at least one additional language, e.g. en, es-ES.')
  const codes = additional.split(',').map((value) => {
    const code = Intl.getCanonicalLocales(value.trim())[0]
    if (!code) throw new Error('Enter language tags separated by commas.')
    return code
  })
  const locales = [lang, ...codes.filter((code) => code !== lang)].map(
    (code) => ({
      code,
      label: languageLabel(code),
    })
  )
  // Use the same validation as manual configuration, including duplicates.
  normalizeLocalization({ locales }, lang)
  return locales
}

export async function askI18nLanguages(primary) {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      'Interactive language setup needs a terminal. Use rdx add i18n --locales en,es-ES (additional languages; lang stays primary).'
    )
  const { default: prompts } = await import('prompts')
  const response = await prompts({
    type: 'text',
    name: 'languages',
    message: `Additional languages (primary: ${primary}; e.g. en, es-ES)`,
    validate(value) {
      try {
        initialLocales(primary, value)
        return true
      } catch (error) {
        return error.message
      }
    },
  })
  return response.languages
}

/** Create only empty translation directories; never copy or replace documents. */
export async function prepareLanguageFolders(rootDir, localization) {
  const root = await realpath(rootDir)
  const created = []
  const markers = []
  async function rollback() {
    for (const marker of markers)
      if ((await readFile(marker, 'utf8').catch(() => undefined)) === '')
        await unlink(marker).catch((error) => {
          if (error.code !== 'ENOENT') throw error
        })
    for (const directory of [...created].reverse())
      await rmdir(directory).catch((error) => {
        // A user may have started writing while installation was running.
        if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error
      })
  }
  try {
    for (const locale of localization.locales) {
      if (!locale.folder) continue
      let directory = root
      for (const part of ['locale', locale.folder, 'docs']) {
        directory = path.join(directory, part)
        try {
          await mkdir(directory)
          created.push(directory)
        } catch (error) {
          if (error.code !== 'EEXIST') throw error
        }
        const info = await lstat(directory)
        if (!info.isDirectory() || info.isSymbolicLink())
          throw new Error(
            `Translation folders must be regular project directories: ${directory}`
          )
      }
      if (created.includes(directory)) {
        const marker = path.join(directory, '.gitkeep')
        await writeFile(marker, '', { flag: 'wx' })
        markers.push(marker)
      }
    }
  } catch (error) {
    await rollback()
    throw error
  }
  return rollback
}
