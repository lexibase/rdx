import fs from 'node:fs'
import path from 'node:path'
import type { RdxPluginContext, RdxSnapshotContext } from '@lexibase/rdx-types'
import { boundedProjectPath, inside } from './paths'
import { RdxConfigError } from './error'

/** Gather and validate every participant before the first destination is reserved. */
export function collectSnapshotContributions(
  context: RdxPluginContext,
  options: { version: string; snapshotDir: string; sourceDir: string }
) {
  const directories = [
    { sourceDir: options.sourceDir, snapshotDir: options.snapshotDir },
  ]
  const files: { filename: string; content: string }[] = []
  const snapshotContext: RdxSnapshotContext = {
    ...context,
    version: options.version,
    snapshotDir: options.snapshotDir,
  }
  for (const plugin of context.config.plugins) {
    const result = plugin.snapshot?.(snapshotContext)
    if (result === undefined) continue
    if (
      !result ||
      typeof result !== 'object' ||
      Array.isArray(result) ||
      'then' in result ||
      Object.keys(result).some((key) => !['directories', 'files'].includes(key))
    )
      throw new RdxConfigError(
        `Plugin "${plugin.name}" must declare a synchronous snapshot contribution.`
      )
    if (
      (result.directories !== undefined &&
        !Array.isArray(result.directories)) ||
      (result.files !== undefined && !Array.isArray(result.files))
    )
      throw new RdxConfigError(
        `Plugin "${plugin.name}" snapshot directories and files must be arrays.`
      )
    directories.push(...(result.directories ?? []))
    files.push(...(result.files ?? []))
  }
  const mapped = directories.map((entry) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Object.keys(entry).some(
        (key) => !['sourceDir', 'snapshotDir'].includes(key)
      )
    )
      throw new RdxConfigError('Invalid snapshot directory contribution.')
    const from = boundedProjectPath(
      context.rootDir,
      entry.sourceDir,
      'snapshot sourceDir'
    )
    const to = boundedProjectPath(
      context.rootDir,
      entry.snapshotDir,
      'snapshot snapshotDir'
    )
    if (!fs.statSync(/* turbopackIgnore: true */ from).isDirectory())
      throw new RdxConfigError(
        `Snapshot source must be a directory: ${entry.sourceDir}`
      )
    try {
      fs.lstatSync(/* turbopackIgnore: true */ to)
      throw new RdxConfigError(
        `Snapshot destination already exists: ${entry.snapshotDir}`
      )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return { from, to }
  })
  for (const [index, entry] of mapped.entries()) {
    for (const other of mapped) {
      if (inside(entry.from, other.to) || inside(other.to, entry.from))
        throw new RdxConfigError(
          'Snapshot destinations and source trees must not overlap.'
        )
    }
    for (const other of mapped.slice(index + 1))
      if (inside(entry.to, other.to) || inside(other.to, entry.to))
        throw new RdxConfigError(
          'Snapshot destinations must be distinct, non-overlapping directories.'
        )
  }
  const seen = new Set<string>()
  const metadata = files.map((entry) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.content !== 'string' ||
      Object.keys(entry).some((key) => !['filename', 'content'].includes(key))
    )
      throw new RdxConfigError('Invalid snapshot file contribution.')
    const filename = boundedProjectPath(
      context.rootDir,
      entry.filename,
      'snapshot filename'
    )
    const directory = mapped.find(
      (entry) => filename !== entry.to && inside(entry.to, filename)
    )
    if (!directory || seen.has(filename))
      throw new RdxConfigError(
        'Snapshot files must have unique paths inside the new snapshot directories.'
      )
    seen.add(filename)
    const copiedFile = path.join(
      directory.from,
      path.relative(directory.to, filename)
    )
    if (fs.existsSync(/* turbopackIgnore: true */ copiedFile))
      throw new RdxConfigError(
        `Snapshot metadata conflicts with source content: ${entry.filename}`
      )
    return { filename, content: entry.content }
  })
  return {
    rootDir: fs.realpathSync(/* turbopackIgnore: true */ context.rootDir),
    directories: mapped,
    files: metadata,
  }
}
