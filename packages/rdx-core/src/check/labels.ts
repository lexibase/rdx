import path from 'node:path'

import type { RdxProject } from '@lexibase/rdx-types'

import { getDocsIndex } from '../content/index'
import { labelsFile, readLabelsFile } from '../config/labels'

/**
 * Primary category names across every edition the site serves, so a name that
 * left the live docs keeps its translation while an older edition shows it.
 */
export function collectCategoryNames(project: RdxProject) {
  const names = new Set<string>()
  for (const source of project.sources) {
    if (source.redirectTo !== undefined) continue
    const categories = getDocsIndex(
      { docsDir: path.resolve(project.rootDir, source.docsDir) },
      // Broken pages are reported by the content checks, not here.
      () => {}
    )
    for (const category of categories) names.add(category.title)
  }
  return names
}

/** Every catalog location: the root for the primary language, then translations. */
export function catalogFolders(project: RdxProject) {
  const folders: (string | undefined)[] = [undefined]
  for (const locale of project.localization?.locales ?? [])
    if (
      locale.folder &&
      locale.code !== project.localization!.defaultLocale &&
      !folders.includes(locale.folder)
    )
      folders.push(locale.folder)
  return folders
}

function placeholders(text: string) {
  return (text.match(/\{\w+\}/g) ?? []).sort()
}

export type LabelsWarning = {
  file: string
  line: number
  column: number
  code: 'labels'
  message: string
}

/**
 * Catalog problems never break the site, which keeps the original text, so
 * they are warnings. `interfaceTexts` enables interface checks when known.
 */
export function checkLabels(
  project: RdxProject,
  interfaceTexts?: readonly string[]
): LabelsWarning[] {
  const warnings: LabelsWarning[] = []
  const categories = collectCategoryNames(project)
  const known = interfaceTexts ? new Set(interfaceTexts) : undefined
  for (const folder of catalogFolders(project)) {
    const file = labelsFile(folder)
    const { exists, labels, problems } = readLabelsFile(project.rootDir, folder)
    if (!exists) continue
    const warn = (message: string) =>
      warnings.push({ file, line: 1, column: 1, code: 'labels', message })
    for (const problem of problems) warn(`${file} ${problem}`)
    for (const name of Object.keys(labels.categories))
      if (!categories.has(name))
        warn(
          `${file}: "${name}" is not a category in any edition. Remove it, or run "rdx i18n sync --prune".`
        )
    for (const [text, translated] of Object.entries(labels.interface)) {
      if (known && !known.has(text)) {
        warn(
          `${file}: "${text}" is not an interface text. Remove it, or run "rdx i18n sync --prune".`
        )
        continue
      }
      if (
        translated.trim() &&
        placeholders(translated).join() !== placeholders(text).join()
      )
        warn(
          `${file}: the translation of "${text}" must keep ${placeholders(text).join(', ') || 'no placeholders'}; RDX shows the original text until it does.`
        )
    }
  }
  return warnings
}
