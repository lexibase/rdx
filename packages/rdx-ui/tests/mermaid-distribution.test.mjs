import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../', import.meta.url))
const upstream = path.dirname(require.resolve('mermaid/package.json'))
const distribution = path.join(root, 'dist/mermaid')

test('the published diagram engine retains upstream modules and license notices without production Mermaid dependencies', async () => {
  const pkg = JSON.parse(
    await readFile(path.join(root, 'package.json'), 'utf8')
  )
  assert.equal(pkg.dependencies.mermaid, undefined)
  assert.ok(pkg.devDependencies.mermaid)
  assert.ok(pkg.files.includes('dist/mermaid'))
  const modules = (await readdir(distribution, { recursive: true })).filter(
    (filename) => filename.endsWith('.mjs')
  )
  // The complete upstream distribution includes lazy engines for all diagrams.
  assert.ok(modules.length > 80)
  assert.ok(modules.some((filename) => filename.includes('sequenceDiagram')))
  assert.ok(modules.some((filename) => filename.includes('flowDiagram')))
  assert.ok(modules.some((filename) => filename.includes('classDiagram')))
  for (const filename of modules) {
    const actual = await readFile(path.join(distribution, filename), 'utf8')
    const original = await readFile(
      path.join(upstream, 'dist', filename),
      'utf8'
    )
    assert.equal(actual, original.replace(/^\/\/# sourceMappingURL=.*$/gm, ''))
  }
  assert.equal(
    await readFile(path.join(distribution, 'LICENSE'), 'utf8'),
    await readFile(path.join(upstream, 'LICENSE'), 'utf8')
  )
  assert.ok(
    !(await readdir(distribution, { recursive: true })).some((filename) =>
      filename.endsWith('.map')
    )
  )
})
