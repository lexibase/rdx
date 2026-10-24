import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const out = path.join(root, 'dist')
const require = createRequire(import.meta.url)
const adapter = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve('@lexibase/rdx-next'))),
  '..'
)
const ui = path.resolve(
  path.dirname(require.resolve('@lexibase/rdx-ui/components/button')),
  '../..'
)
assert.equal(path.relative(root, out), 'dist')
try {
  assert.equal(
    (await lstat(out)).isSymbolicLink(),
    false,
    'Build output must not be a link'
  )
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

async function emit(filename, content) {
  await mkdir(path.dirname(path.join(out, filename)), { recursive: true })
  await writeFile(path.join(out, filename), content)
}

for (const [name, target] of Object.entries({
  index: '@lexibase/rdx-next',
  runtime: '@lexibase/rdx-next/runtime',
  config: '@lexibase/rdx-next/config',
})) {
  for (const extension of ['js', 'd.ts'])
    await emit(`${name}.${extension}`, `export * from '${target}'\n`)
}
await emit(
  'postcss.config.js',
  "export { default } from '@lexibase/rdx-next/postcss.config'\n"
)
await emit('styles.css', "@import '@lexibase/rdx-next/styles.css';\n")
await emit('styles.d.css.ts', 'export {}\n')
await emit('ui/globals.css', "@import '@lexibase/rdx-ui/globals.css';\n")
await emit('ui/globals.d.css.ts', 'export {}\n')

// Proxy individual public UI modules without bundling or recreating components.
for (const group of ['components', 'lib', 'providers']) {
  for (const entry of await readdir(path.join(ui, 'src', group))) {
    if (!/\.tsx?$/.test(entry) || entry.endsWith('.d.ts')) continue
    const name = entry.replace(/\.tsx?$/, '')
    const target = `@lexibase/rdx-ui/${group}/${name}`
    for (const extension of ['js', 'd.ts'])
      await emit(
        `ui/${group}/${name}.${extension}`,
        `export * from '${target}'\n`
      )
  }
}

await cp(path.join(adapter, 'templates/runtime'), path.join(out, 'templates'), {
  recursive: true,
})
async function rewrite(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) await rewrite(filename)
    else if (/\.(?:tsx?|mjs|css)$/.test(entry.name)) {
      const source = await readFile(filename, 'utf8')
      await writeFile(
        filename,
        source.replaceAll('@lexibase/rdx-next', '@lexibase/rdx')
      )
    }
  }
}
await rewrite(path.join(out, 'templates'))
console.log(
  'RDX entry package prepared with shared runtime, UI exports and templates.'
)
