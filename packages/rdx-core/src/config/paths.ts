import fs from 'node:fs'
import path from 'node:path'
import { RdxConfigError } from './error'

/** Resolve project-owned paths without allowing traversal or filesystem roots. */
export function resolveProjectPath(
  rootDir: string,
  value: string,
  field: string
) {
  if (typeof value !== 'string' || !value.trim())
    throw new RdxConfigError(`${field} must be a non-empty string.`)
  const resolved = path.resolve(/* turbopackIgnore: true */ rootDir, value)
  const relative = path.relative(rootDir, resolved)
  if (
    path.isAbsolute(value) ||
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new RdxConfigError(
      `${field} must be a relative path inside the project.`
    )
  return resolved
}

export function inside(parent: string, child: string) {
  const relative = path.relative(parent, child)
  return (
    !relative ||
    (relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  )
}

/** Check existing parents too, so a junction cannot redirect a new snapshot. */
export function boundedProjectPath(
  rootDir: string,
  value: string,
  field: string
) {
  const target = resolveProjectPath(rootDir, value, field)
  const root = fs.realpathSync(/* turbopackIgnore: true */ rootDir)
  let parent = target
  while (true) {
    try {
      fs.lstatSync(/* turbopackIgnore: true */ parent)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      parent = path.dirname(parent)
    }
  }
  const canonical = path.resolve(
    fs.realpathSync(/* turbopackIgnore: true */ parent),
    path.relative(parent, target)
  )
  if (!inside(root, canonical))
    throw new RdxConfigError(
      `${field} must remain inside the project, including filesystem links.`
    )
  return canonical
}
