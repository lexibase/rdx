import { createRequire } from 'node:module'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

/** Resolve the framework installed in the new project, including hoisted workspaces. */
export async function installedRuntime(directory) {
  const require = createRequire(path.join(directory, 'package.json'))
  let filename
  try {
    filename = require.resolve('@lexibase/rdx/package.json')
  } catch {
    throw new Error(
      'Could not find @lexibase/rdx in the new project after installation.'
    )
  }
  const manifest = JSON.parse(await readFile(filename, 'utf8'))
  const entry =
    typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.rdx
  if (typeof entry !== 'string' || !entry)
    throw new Error(
      'The installed @lexibase/rdx package does not provide its rdx executable.'
    )
  const executable = path.resolve(path.dirname(filename), entry)
  try {
    if (!(await stat(executable)).isFile()) throw new Error()
  } catch {
    throw new Error(
      'The installed RDX executable is missing. Run the package manager install command again.'
    )
  }
  return executable
}
