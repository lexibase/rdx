import fs from 'node:fs'
import path from 'node:path'

import { parseStaticDocument } from '../content/static-source'
import { boundedProjectPath } from './paths'

export const changelogPluginName = '@lexibase/rdx-changelog'

export function isChangelogVersion(version: unknown): version is string {
  return (
    typeof version === 'string' &&
    /^\d+\.\d+\.\d+(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?$/i.test(version) &&
    version === version.trim()
  )
}

export function getChangelogDirectory(rootDir: string) {
  return boundedProjectPath(rootDir, 'changelog', 'changelog/')
}

export function getChangelogFiles(rootDir: string) {
  const directory = getChangelogDirectory(rootDir)
  let files
  try {
    files = fs.readdirSync(/* turbopackIgnore: true */ directory, {
      withFileTypes: true,
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  return files
    .filter((file) => file.isFile() && /\.mdx?$/.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name }) => ({
      filename: path.join('changelog', name),
      sourcePath: path.join(directory, name),
    }))
}

export function readChangelog(rootDir: string) {
  const versions = new Set<string>()
  return getChangelogFiles(rootDir)
    .map(({ filename, sourcePath }) => {
      try {
        const { content, data } = parseStaticDocument(
          fs.readFileSync(/* turbopackIgnore: true */ sourcePath, 'utf8')
        )
        const { title, version } = data
        const date =
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : data.date
        if (typeof title !== 'string' || !title.trim())
          throw new Error('title must be a non-empty string')
        if (!isChangelogVersion(version))
          throw new Error('version must be a release version such as 1.2.0')
        if (
          typeof date !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          Number.isNaN(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date
        )
          throw new Error('date must be a valid date in YYYY-MM-DD format')
        if (versions.has(version))
          throw new Error(`duplicate version ${version}`)
        versions.add(version)
        return {
          title: title.trim(),
          version,
          date,
          content,
          filename,
          sourcePath,
        }
      } catch (error) {
        throw new Error(`${filename}: ${(error as Error).message}`, {
          cause: error,
        })
      }
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.version.localeCompare(a.version, 'en', { numeric: true })
    )
}
