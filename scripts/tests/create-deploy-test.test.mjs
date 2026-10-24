import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createDeployTest,
  parseDeployArguments,
} from '../create-deploy-test.mjs'

async function fixture(t) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'rdx-deploy-export-'))
  t.after(() => rm(base, { recursive: true, force: true }))
  const release = path.join(base, 'release with spaces')
  const source = path.join(release, 'project')
  const target = path.join(base, 'exported project')
  const archiveRoot = path.join(base, 'archive')
  await mkdir(path.join(archiveRoot, 'package'), { recursive: true })
  await mkdir(source, { recursive: true })
  const overrides = {}
  for (const shortName of [
    'rdx-types',
    'rdx-core',
    'rdx-ui',
    'rdx-next',
    'rdx-versioning',
  ]) {
    const name = `@lexibase/${shortName}`
    const archive = path.join(release, `${shortName}.tgz`)
    await writeFile(
      path.join(archiveRoot, 'package/package.json'),
      JSON.stringify({
        name,
        version: '1.0.0-beta.1',
        dependencies:
          shortName === 'rdx-next'
            ? {
                '@lexibase/rdx-core': '1.0.0-beta.1',
                '@lexibase/rdx-ui': '1.0.0-beta.1',
              }
            : shortName === 'rdx-core'
              ? { '@lexibase/rdx-types': '1.0.0-beta.1' }
              : {},
      })
    )
    execFileSync('tar', ['-czf', archive, '-C', archiveRoot, 'package'])
    overrides[name] = `file:${archive.replaceAll('\\', '/')}`
  }
  await writeFile(
    path.join(source, 'package.json'),
    JSON.stringify({
      name: 'project',
      scripts: { dev: 'rdx dev', build: 'rdx build', start: 'rdx start' },
      dependencies: {
        '@lexibase/rdx-next': overrides['@lexibase/rdx-next'],
        '@lexibase/rdx-versioning': overrides['@lexibase/rdx-versioning'],
        next: '^16.4.2',
      },
      pnpm: { overrides },
    })
  )
  await writeFile(
    path.join(source, 'rdx.config.ts'),
    'export default { metadata: { applicationName: "Fixture" }, search: false, TOC: false }'
  )
  for (const dir of [
    'docs',
    'public',
    'versioned_docs',
    'node_modules',
    '.rdx',
    '.git',
  ]) {
    await mkdir(path.join(source, dir))
    await writeFile(path.join(source, dir, 'marker.txt'), dir)
  }
  await writeFile(path.join(source, '.env.local'), 'SECRET=do-not-export')
  await writeFile(
    path.join(source, 'pnpm-lock.yaml'),
    'do not copy this absolute lockfile'
  )
  return { release, source, target }
}

test('deploy exporter creates relative vendor references and copies only source content without modifying its source', async (t) => {
  const { release, source, target } = await fixture(t)
  const original = await readFile(path.join(source, 'package.json'), 'utf8')
  assert.equal(await createDeployTest({ from: release, out: target }), target)
  const pkg = JSON.parse(
    await readFile(path.join(target, 'package.json'), 'utf8')
  )
  assert.equal(pkg.packageManager, 'pnpm@9.0.0')
  assert.equal(pkg.engines.node, '24.x')
  for (const reference of Object.values(pkg.pnpm.overrides))
    assert.match(reference, /^file:vendor\/[^/]+\.tgz$/)
  const workspace = await readFile(
    path.join(target, 'pnpm-workspace.yaml'),
    'utf8'
  )
  for (const [name, reference] of Object.entries(pkg.pnpm.overrides))
    assert.ok(
      workspace.includes(
        `${JSON.stringify(name)}: ${JSON.stringify(reference)}`
      )
    )
  assert.equal(
    pkg.dependencies['@lexibase/rdx-next'],
    'file:vendor/rdx-next.tgz'
  )
  assert.equal(pkg.pnpm.overrides['@lexibase/rdx-next'], undefined)
  assert.equal(
    pkg.pnpm.overrides['@lexibase/rdx-next>@lexibase/rdx-core'],
    'file:vendor/rdx-core.tgz'
  )
  assert.equal(
    pkg.pnpm.overrides['@lexibase/rdx-core>@lexibase/rdx-types'],
    'file:vendor/rdx-types.tgz'
  )
  assert.equal((await readdir(path.join(target, 'vendor'))).length, 5)
  assert.doesNotMatch(JSON.stringify(pkg), /file:[A-Za-z]:|workspace:|file:\//)
  const entries = await readdir(target)
  for (const name of [
    'node_modules',
    '.rdx',
    '.git',
    '.env.local',
    'pnpm-lock.yaml',
  ])
    assert.equal(entries.includes(name), false)
  assert.match(
    await readFile(path.join(target, 'rdx.config.ts'), 'utf8'),
    /search: true, TOC: true/
  )
  assert.equal(
    await readFile(path.join(source, 'package.json'), 'utf8'),
    original
  )
  assert.match(
    await readFile(path.join(source, 'rdx.config.ts'), 'utf8'),
    /search: false/
  )
  const vercel = JSON.parse(
    await readFile(path.join(target, 'vercel.json'), 'utf8')
  )
  assert.equal(vercel.framework, 'nextjs')
  assert.equal(vercel.outputDirectory, '.rdx/.next')
  assert.equal(vercel.installCommand, 'pnpm install --frozen-lockfile')
})

test('deploy exporter refuses existing destinations and source overlap', async (t) => {
  const { release, source, target } = await fixture(t)
  await mkdir(target)
  await writeFile(path.join(target, 'keep.txt'), 'preserved')
  await assert.rejects(
    createDeployTest({ from: release, out: target }),
    /already exists/
  )
  assert.equal(
    await readFile(path.join(target, 'keep.txt'), 'utf8'),
    'preserved'
  )
  await assert.rejects(
    createDeployTest({ from: release, out: path.join(source, 'nested') }),
    /overlap/
  )
})

test('deploy export validates archive identity before creating the destination', async (t) => {
  const { release, source, target } = await fixture(t)
  const pkg = JSON.parse(
    await readFile(path.join(source, 'package.json'), 'utf8')
  )
  pkg.pnpm.overrides['@lexibase/rdx-types'] =
    pkg.pnpm.overrides['@lexibase/rdx-core']
  await writeFile(path.join(source, 'package.json'), JSON.stringify(pkg))
  await assert.rejects(
    createDeployTest({ from: release, out: target }),
    /identity mismatch/
  )
  await assert.rejects(readdir(target), /ENOENT/)
})

test('deploy command requires explicit source and destination and rejects unknown or repeated flags', () => {
  assert.deepEqual(
    parseDeployArguments(['--from', 'release', '--out', '../test']),
    { from: 'release', out: '../test' }
  )
  for (const args of [
    [],
    ['--from'],
    ['--out', 'test'],
    ['--from', 'release', '--what', 'x'],
    ['--from', 'a', '--from', 'b', '--out', 'c'],
  ])
    assert.throws(() => parseDeployArguments(args), /Usage|required/)
})
