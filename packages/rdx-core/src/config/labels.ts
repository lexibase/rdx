import path from 'node:path'
import { readFileSync } from 'node:fs'

import type { RdxLabels } from '@lexibase/rdx-types'

export const labelsFileName = '_labels.json'
export const labelSections = ['interface', 'categories'] as const

/** Root for the primary language; locale/<folder>/ for each translation. */
export function labelsFile(folder?: string) {
  return folder ? `locale/${folder}/${labelsFileName}` : labelsFileName
}

export function emptyLabels(): RdxLabels {
  return { interface: {}, categories: {} }
}

/**
 * Parse a catalog without throwing: the site keeps the original text for any
 * invalid part, and `problems` explains what `rdx check` should report.
 */
export function parseLabels(raw: string) {
  const labels = emptyLabels()
  const problems: string[] = []
  let parsed: unknown
  try {
    // Editors on Windows may save UTF-8 with a byte order mark.
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ''))
  } catch {
    problems.push('is not valid JSON.')
    return { labels, problems }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    problems.push('must contain a JSON object.')
    return { labels, problems }
  }
  for (const [section, value] of Object.entries(parsed)) {
    if (!(labelSections as readonly string[]).includes(section)) {
      problems.push(
        `has an unknown section "${section}". Use "interface" or "categories".`
      )
      continue
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      problems.push(`"${section}" must be an object of text translations.`)
      continue
    }
    const target = labels[section as keyof RdxLabels]
    for (const [key, text] of Object.entries(value)) {
      if (typeof text === 'string') target[key] = text
      else problems.push(`"${section}" → "${key}" must be text.`)
    }
  }
  return { labels, problems }
}

export function readLabelsFile(rootDir: string, folder?: string) {
  let raw: string
  try {
    const file = path.join(
      /* turbopackIgnore: true */ rootDir,
      labelsFile(folder)
    )
    raw = readFileSync(/* turbopackIgnore: true */ file, 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR')
      return { exists: false, labels: emptyLabels(), problems: [] }
    throw error
  }
  return { exists: true, ...parseLabels(raw) }
}

export function readLabels(rootDir: string, folder?: string): RdxLabels {
  return readLabelsFile(rootDir, folder).labels
}

/** A blank translation keeps the original text. */
export function translateLabel(
  labels: Record<string, string> | undefined,
  text: string
) {
  const translated = labels?.[text]?.trim()
  return translated || text
}
