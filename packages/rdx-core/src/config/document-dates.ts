import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export const snapshotDatesFilename = '_rdx-last-updated.json'
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function relativeFile(root: string, file: string) {
  const relative = path.relative(root, file)
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.split(path.sep)[0] === '..'
  )
    return
  return relative.split(path.sep).join('/')
}

export function createDocumentDateReader(root: string) {
  const git = (...args: string[]) =>
    execFileSync('git', ['--literal-pathspecs', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 3000,
      windowsHide: true,
    }).trim()

  let shallow: boolean | undefined
  try {
    shallow = git('rev-parse', '--is-shallow-repository') === 'true'
  } catch {
    return () => undefined
  }

  return (file: string): string | undefined => {
    const relative = relativeFile(root, file)
    if (!relative) return
    try {
      git('ls-files', '--error-unmatch', '--', relative)
      git('diff', '--quiet', '--no-ext-diff', 'HEAD', '--', relative)
      const [date, parents] = git(
        'log',
        '-1',
        '--format=%cs%x00%P',
        'HEAD',
        '--',
        relative
      ).split('\0')
      // A shallow boundary can look like the commit that added every file.
      if (date && datePattern.test(date) && (!shallow || parents)) return date
    } catch {
      // Missing history or local edits cannot date the exported content.
    }
  }
}

export function collectSnapshotDocumentDates(
  directory: string,
  dateFor: (file: string) => string | undefined
) {
  const dates: Record<string, string> = Object.create(null)
  function visit(folder: string) {
    for (const entry of fs
      .readdirSync(/* turbopackIgnore: true */ folder, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const file = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(file)
      else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
        const date = dateFor(file)
        if (date) dates[relativeFile(directory, file)!] = date
      }
    }
  }
  visit(directory)
  return Object.keys(dates).length
    ? JSON.stringify(dates, null, 2) + '\n'
    : undefined
}

export function getSnapshotDocumentDate(directory: string, file: string) {
  const relative = relativeFile(directory, file)
  if (!relative) return
  try {
    const filename = path.join(directory, snapshotDatesFilename)
    const dates = JSON.parse(
      fs.readFileSync(/* turbopackIgnore: true */ filename, 'utf8')
    )
    if (!dates || typeof dates !== 'object' || !Object.hasOwn(dates, relative))
      return
    const date = dates[relative]
    if (typeof date === 'string' && datePattern.test(date)) return date
  } catch {
    // Snapshots created before date capture have no reliable source date.
  }
}
