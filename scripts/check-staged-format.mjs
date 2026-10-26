import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import * as prettier from 'prettier'

/** Check index contents without formatting working files or staging extra edits. */
export async function checkStagedFormat(cwd = process.cwd()) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  }).trim()
  const filenames = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'],
    { cwd: root, encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean)
  const unformatted = []
  for (const filename of filenames) {
    const filepath = path.join(root, filename)
    const info = await prettier.getFileInfo(filepath, {
      ignorePath: path.join(root, '.prettierignore'),
    })
    if (info.ignored || !info.inferredParser) continue
    const source = execFileSync('git', ['show', `:${filename}`], {
      cwd: root,
      encoding: 'utf8',
    })
    const options = await prettier.resolveConfig(filepath)
    if (!(await prettier.check(source, { ...options, filepath })))
      unformatted.push(filename)
  }
  return unformatted
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const unformatted = await checkStagedFormat()
  if (unformatted.length) {
    console.error(
      `Format and stage these files before committing:\n${unformatted.join('\n')}`
    )
    process.exitCode = 1
  }
}
