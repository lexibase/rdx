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
  'rdx',
  'rdx-plugin-versioning',
  'rdx-plugin-i18n',
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

test('the creator template pins the main framework without exposing internal packages', async () => {
  const creator = await manifest('packages/create-rdx/package.json')
  const template = await manifest(
    'packages/create-rdx/templates/default/package.json'
  )
  for (const directory of ['rdx']) {
    const pkg = await manifest(`packages/${directory}/package.json`)
    assert.equal(template.dependencies[pkg.name], pkg.version)
    if (!creator.version.includes('-')) {
      assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
    }
  }
  assert.equal(template.dependencies['@lexibase/rdx-next'], undefined)
  assert.equal(template.dependencies['@lexibase/rdx-ui'], undefined)
  const framework = await manifest('packages/rdx/package.json')
  for (const name of ['rdx-next', 'rdx-ui']) {
    assert.equal(framework.dependencies[`@lexibase/${name}`], 'workspace:*')
  }
  assert.equal(framework.dependencies['@lexibase/rdx-versioning'], undefined)
  assert.equal(framework.dependencies['@lexibase/rdx-i18n'], undefined)
})

test('the optional language plugin is public and belongs to the grouped release', async () => {
  const plugin = await manifest('packages/rdx-plugin-i18n/package.json')
  assert.notEqual(plugin.private, true)
  assert.equal(plugin.version, '1.0.0')
  assert.equal(plugin.publishConfig.access, 'public')
  assert.equal(plugin.dependencies['@lexibase/rdx-core'], 'workspace:*')
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

test('the runtime consumes a compatible project-owned UI while workspace development stays local', async () => {
  const runtime = await manifest('packages/rdx-next/package.json')
  assert.equal(runtime.dependencies['@lexibase/rdx-ui'], undefined)
  assert.equal(runtime.optionalDependencies?.['@lexibase/rdx-ui'], undefined)
  assert.equal(runtime.peerDependencies['@lexibase/rdx-ui'], '^3.3.0')
  assert.equal(runtime.devDependencies['@lexibase/rdx-ui'], 'workspace:*')
  assert.notEqual(
    runtime.peerDependenciesMeta?.['@lexibase/rdx-ui']?.optional,
    true
  )
  for (const command of ['dev', 'build']) {
    assert.match(
      runtime.scripts[command],
      /--external @lexibase\/rdx-ui(?: |$)/
    )
  }
})
