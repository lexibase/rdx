import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import {
  normalizeLocalization,
  resolveProjectPath,
} from '@lexibase/rdx-core/config'

function inspect(root: string, directory: string) {
  const expected = resolveProjectPath(
    root,
    path.relative(root, directory),
    'snapshot to delete'
  )
  try {
    const entry = fs.lstatSync(/* turbopackIgnore: true */ directory)
    if (
      !entry.isDirectory() ||
      !fs
        .readdirSync(/* turbopackIgnore: true */ path.dirname(directory))
        .includes(path.basename(directory)) ||
      path.relative(
        expected,
        fs.realpathSync(/* turbopackIgnore: true */ directory)
      )
    )
      throw new Error(
        `Expected a snapshot directory without filesystem links: ${directory}`
      )
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

function translations(snapshot: string, version: string): string[] {
  const filename = path.join(snapshot, '.rdx-locales.json')
  try {
    if (!fs.lstatSync(/* turbopackIgnore: true */ filename).isFile())
      throw new Error('Expected a regular metadata file.')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const stored = JSON.parse(
    fs.readFileSync(/* turbopackIgnore: true */ filename, 'utf8')
  )
  if (stored?.schemaVersion !== 1 || typeof stored.defaultLocale !== 'string')
    throw new Error(`Invalid snapshot locale metadata: ${filename}`)
  const { locales } = normalizeLocalization(
    { locales: stored.locales },
    stored.defaultLocale
  )
  return locales.flatMap(({ code, folder }) => {
    if (!folder) return []
    const directory = `locale/${folder}/versioned_docs/version-${version}`
    if (stored.translations?.[code]?.docsDir !== directory)
      throw new Error(`Invalid snapshot directory for ${code} in ${filename}.`)
    return [directory]
  })
}

/** Move snapshots out of the way before updating the manifest so a failed update can be rolled back. */
export function deleteSnapshots(
  rootDir: string,
  versionsDir: string,
  versionsFile: string,
  versions: string[],
  updateManifest: () => void
) {
  const root = fs.realpathSync(/* turbopackIgnore: true */ rootDir)
  const manifest = fs.realpathSync(/* turbopackIgnore: true */ versionsFile)
  const directories = new Set<string>()
  function add(directory: string) {
    const absolute = resolveProjectPath(root, directory, 'snapshot to delete')
    if (!inspect(root, absolute)) return
    const segments = directory.split(/[\\/]/).map((part) => part.toLowerCase())
    const relativeManifest = path.relative(absolute, manifest)
    if (
      segments[0] === 'docs' ||
      (segments[0] === 'locale' &&
        (segments.length < 3 || segments[2] === 'docs')) ||
      (!path.isAbsolute(relativeManifest) &&
        relativeManifest !== '..' &&
        !relativeManifest.startsWith(`..${path.sep}`))
    )
      throw new Error(
        `Cannot delete a snapshot containing live docs or the version manifest: ${directory}`
      )
    directories.add(absolute)
  }

  for (const version of versions) {
    const snapshot = path.relative(
      rootDir,
      path.join(versionsDir, `version-${version}`)
    )
    add(snapshot)
    for (const translation of translations(path.join(root, snapshot), version))
      add(translation)
  }

  const moved: { original: string; temporary: string }[] = []
  try {
    for (const original of directories) {
      const temporary = `${original}.rdx-delete-${randomUUID()}`
      fs.renameSync(original, temporary)
      moved.push({ original, temporary })
    }
    updateManifest()
  } catch (error) {
    const failures = []
    for (const { original, temporary } of moved.reverse()) {
      try {
        fs.renameSync(temporary, original)
      } catch (rollbackError) {
        failures.push(
          new Error(`Could not restore ${temporary} to ${original}.`, {
            cause: rollbackError,
          })
        )
      }
    }
    if (failures.length)
      throw new AggregateError(
        [error, ...failures],
        failures.map((entry) => entry.message).join(' ')
      )
    throw error
  }
  const failures = []
  for (const { temporary } of moved) {
    try {
      if (inspect(root, temporary))
        fs.rmSync(temporary, { recursive: true, maxRetries: 3 })
    } catch (error) {
      failures.push(
        new Error(`Could not clean up ${temporary}.`, { cause: error })
      )
    }
  }
  if (failures.length)
    throw new AggregateError(
      failures,
      `Version removed from the manifest. ${failures.map((entry) => entry.message).join(' ')}`
    )
}
