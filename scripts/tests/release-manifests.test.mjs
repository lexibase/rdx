import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const directories = [
  'rdx-types',
  'rdx-core',
  'rdx-ui',
  'rdx-next',
  'rdx-plugin-versioning',
  'create-rdx',
]
const manifest = async (filename) =>
  JSON.parse(await readFile(path.join(root, filename), 'utf8'))

test('public packages, development and generated projects share the tested Node policy', async () => {
  for (const filename of [
    'package.json',
    'apps/web/package.json',
    ...directories.map((name) => `packages/${name}/package.json`),
    'packages/create-rdx/templates/default/package.json',
  ]) {
    const pkg = await manifest(filename)
    assert.equal(pkg.engines.node, '^22.18.0 || ^24.11.0', filename)
  }
})

test('the creator template pins the matching public runtime and UI releases', async () => {
  const creator = await manifest('packages/create-rdx/package.json')
  const template = await manifest(
    'packages/create-rdx/templates/default/package.json'
  )
  for (const directory of ['rdx-next', 'rdx-ui']) {
    const pkg = await manifest(`packages/${directory}/package.json`)
    assert.equal(template.dependencies[pkg.name], pkg.version)
    if (!creator.version.includes('-')) {
      assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
    }
  }
})

test('UI wildcard exports name actual modules, not empty placeholder directories', async () => {
  const pkg = await manifest('packages/rdx-ui/package.json')
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    if (!subpath.includes('*')) continue
    const star = target.indexOf('*')
    const prefix = target.slice(0, star)
    const suffix = target.slice(star + 1)
    const entries = await readdir(path.join(root, 'packages/rdx-ui', prefix), {
      withFileTypes: true,
    })
    assert.ok(
      entries.some((entry) => entry.isFile() && entry.name.endsWith(suffix)),
      `${subpath} must expose at least one module`
    )
  }
})
