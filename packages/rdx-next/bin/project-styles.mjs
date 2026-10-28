import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** Import project-owned CSS after the theme without copying or editing it. */
export async function prepareProjectStyles(projectRoot, runtimeDirectory) {
  const source = path.join(projectRoot, 'rdx.css')
  const destination = path.join(runtimeDirectory, 'app', 'globals.css')
  const current = await readFile(destination, 'utf8')
  const original = current.replace(
    /^@import "\.\.\/\.\.\/rdx\.css";\r?\n/gm,
    ''
  )
  let exists = false
  try {
    const info = await stat(source)
    if (!info.isFile()) throw new Error('rdx.css must be a CSS file.')
    exists = true
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const next = exists
    ? original.replace(/(@import[^;]+;)/, '$1\n@import "../../rdx.css";')
    : original
  if (next !== current) {
    await writeFile(destination, next)
  }
}
