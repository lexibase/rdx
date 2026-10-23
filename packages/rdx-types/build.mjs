import { watch } from 'node:fs'
import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const source = path.join(root, 'src')
const output = path.join(root, 'dist')

async function prune(sourceDir, outputDir) {
  const expected = new Set(await readdir(sourceDir))
  for (const entry of await readdir(outputDir, { withFileTypes: true })) {
    const target = path.join(outputDir, entry.name)
    if (!expected.has(entry.name))
      await rm(target, { recursive: true, force: true })
    else if (entry.isDirectory())
      await prune(path.join(sourceDir, entry.name), target)
  }
}

async function build() {
  await mkdir(output, { recursive: true })
  await cp(source, output, { recursive: true })
  await prune(source, output)
}

if (process.argv.includes('--watch')) {
  let timer
  let pending = Promise.resolve()
  watch(source, { recursive: true }, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      pending = pending.then(build).then(
        () => console.log('[rdx-types] Updated local declarations.'),
        (error) => console.error('[rdx-types]', error)
      )
    }, 100)
  })
  pending = build()
  await pending
  console.log('[rdx-types] Watching local declarations...')
} else {
  await build()
}
