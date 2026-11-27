import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { catalogFolders, collectCategoryNames } from '@lexibase/rdx-core/check'
import { labelsFile, parseLabels } from '@lexibase/rdx-core/config'

function missingFile(error) {
  return error.code === 'ENOENT' || error.code === 'ENOTDIR'
}

const english = (lang = 'en') => /^en(?:[-_]|$)/i.test(lang.trim())

/**
 * Keep every language's `_labels.json` aligned with the interface texts and the
 * categories of every edition. New keys start blank; translations are never
 * removed unless `prune` is requested.
 */
export async function syncLabelCatalogs(
  project,
  interfaceTexts,
  { prune = false } = {}
) {
  const categories = [...collectCategoryNames(project)]
  const languages = new Map(
    (project.localization?.locales ?? []).map((locale) => [
      locale.folder,
      locale.code,
    ])
  )
  const updates = []
  for (const folder of catalogFolders(project)) {
    const lang = folder ? languages.get(folder) : project.config.lang
    const file = labelsFile(folder)
    const target = path.join(project.rootDir, file)
    const info = await lstat(target).catch((error) => {
      if (!missingFile(error)) throw error
    })
    if (info && !info.isFile())
      throw new Error(`${file} must be a regular file.`)
    // English is built in: an English primary language needs no root catalog.
    if (!info && !folder && english(lang)) continue
    const raw = info ? await readFile(target, 'utf8') : undefined
    let catalog = {}
    if (raw !== undefined) {
      const { problems } = parseLabels(raw)
      if (problems.length)
        throw new Error(
          `Cannot sync ${file}: it ${problems[0]} Fix it and run rdx i18n sync again.`
        )
      catalog = JSON.parse(raw.replace(/^\uFEFF/, ''))
    }
    const wanted = {
      // English pages already show the built-in text; keep only overrides.
      interface: english(lang) ? [] : interfaceTexts,
      categories,
    }
    let added = 0
    let removed = 0
    const next = { ...catalog }
    for (const section of ['interface', 'categories']) {
      const entries = { ...(catalog[section] ?? {}) }
      const known = new Set(
        section === 'interface' ? interfaceTexts : categories
      )
      if (prune)
        for (const key of Object.keys(entries))
          if (!known.has(key)) {
            delete entries[key]
            removed++
          }
      for (const key of wanted[section])
        if (!Object.hasOwn(entries, key)) {
          entries[key] = ''
          added++
        }
      if (Object.keys(entries).length || Object.hasOwn(catalog, section))
        next[section] = entries
    }
    if (added || removed)
      updates.push({ file, target, info, raw, added, removed, next })
  }

  for (const { file, target, info, raw, added, removed, next } of updates) {
    const content = JSON.stringify(next, null, 2) + '\n'
    if (raw === undefined) {
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, content, { flag: 'wx' })
    } else {
      const temporary = `${target}.${randomUUID()}.tmp`
      try {
        await writeFile(temporary, content, { flag: 'wx', mode: info.mode })
        if (
          !(await lstat(target)).isFile() ||
          (await readFile(target, 'utf8')) !== raw
        )
          throw new Error(
            `${file} changed during sync. Run rdx i18n sync again.`
          )
        await rename(temporary, target)
      } finally {
        await rm(temporary, { force: true })
      }
    }
    const parts = [
      added && `added ${added} ${added === 1 ? 'entry' : 'entries'}`,
      removed &&
        `removed ${removed} unused ${removed === 1 ? 'entry' : 'entries'}`,
    ].filter(Boolean)
    console.log(`[RDX] ${file}: ${parts.join(', ')}.`)
  }
  if (!updates.length) console.log('[RDX] Label catalogs are up to date.')
}
