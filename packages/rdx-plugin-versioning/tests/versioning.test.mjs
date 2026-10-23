import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  access,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createRdxProject,
  getProjectDocsPaths,
  resolveDocsRoute,
} from '@lexibase/rdx-core'
import { versioning } from '../dist/index.js'

async function fixture(t) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-versioning-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  await mkdir(path.join(rootDir, 'docs/guides'), { recursive: true })
  await writeFile(
    path.join(rootDir, 'docs/guides/intro.mdx'),
    'Original documentation'
  )
  return rootDir
}

const config = () => ({ title: 'Docs', plugins: [versioning()] })

test('installing without configuring versioning creates no manifest or commands', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(
    { title: 'Docs' },
    { rootDir, command: 'prepare' }
  )
  await assert.rejects(access(path.join(rootDir, 'versions.json')))
  assert.equal(project.commands.length, 0)
})

test('enabled versioning initializes on prepare, snapshots docs, and preserves archived content', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  assert.deepEqual(
    JSON.parse(await readFile(path.join(rootDir, 'versions.json'))),
    { active: [], archived: [] }
  )
  const command = project.commands.find((entry) => entry.name === 'version')
  const context = {
    rootDir,
    config: project.config,
    command: 'version',
    args: ['1.0.0'],
  }
  await command.run(context)
  await writeFile(
    path.join(rootDir, 'docs/guides/intro.mdx'),
    'New documentation'
  )
  const versioned = await createRdxProject(config(), { rootDir })
  assert.deepEqual(getProjectDocsPaths(versioned), [
    'guides/intro',
    '1.0.0/guides/intro',
  ])
  assert.equal(
    resolveDocsRoute(versioned, ['guides', 'intro']).document.content,
    'New documentation'
  )
  assert.equal(
    resolveDocsRoute(versioned, ['1.0.0', 'guides', 'intro']).document.content,
    'Original documentation'
  )
  await assert.rejects(async () => command.run(context), /never overwritten/)
  await assert.rejects(
    async () => command.run({ ...context, args: ['../../outside'] }),
    /safe version label/
  )
  await writeFile(
    path.join(rootDir, 'versions.json'),
    JSON.stringify({ active: [], archived: ['1.0.0'] })
  )
  const archived = await createRdxProject(config(), { rootDir })
  assert.equal(archived.sources[1].badge, 'Archived')
  assert.equal(
    resolveDocsRoute(archived, ['1.0.0', 'guides', 'intro']).document.content,
    'Original documentation'
  )
})

test('snapshots reserve the root and copy only into absent destinations on newer Node releases', async (t) => {
  const rootDir = await fixture(t)
  await mkdir(path.join(rootDir, 'docs/empty'))
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const snapshotDir = path.join(rootDir, 'versioned_docs/version-1.0.0')
  const originalCopy = fs.cpSync
  const destinations = []
  t.mock.method(fs, 'cpSync', (source, destination, options) => {
    assert.ok(fs.statSync(snapshotDir).isDirectory())
    assert.equal(fs.existsSync(destination), false)
    assert.equal(options.force, false)
    assert.equal(options.errorOnExist, true)
    destinations.push(path.relative(snapshotDir, destination))
    return originalCopy(source, destination, options)
  })
  await project.commands[0].run({
    rootDir,
    config: project.config,
    command: 'version',
    args: ['1.0.0'],
  })
  assert.deepEqual(destinations.sort(), ['empty', 'guides'])
  assert.ok(fs.statSync(path.join(snapshotDir, 'empty')).isDirectory())
  assert.equal(
    await readFile(path.join(snapshotDir, 'guides/intro.mdx'), 'utf8'),
    'Original documentation'
  )
})

test('snapshot directories missing from the manifest are still never overwritten', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const snapshotDir = path.join(rootDir, 'versioned_docs/version-1.0.0')
  await mkdir(snapshotDir, { recursive: true })
  await writeFile(path.join(snapshotDir, 'keep.txt'), 'Existing snapshot')
  await assert.rejects(
    async () =>
      project.commands[0].run({
        rootDir,
        config: project.config,
        command: 'version',
        args: ['1.0.0'],
      }),
    /never overwritten/
  )
  assert.deepEqual(fs.readdirSync(snapshotDir), ['keep.txt'])
  assert.equal(
    await readFile(path.join(snapshotDir, 'keep.txt'), 'utf8'),
    'Existing snapshot'
  )
  assert.deepEqual(
    JSON.parse(await readFile(path.join(rootDir, 'versions.json'))),
    { active: [], archived: [] }
  )
})

test('invalid manifests are not overwritten, and missing snapshots are actionable', async (t) => {
  const rootDir = await fixture(t)
  const manifest = path.join(rootDir, 'versions.json')
  await writeFile(manifest, 'broken')
  await assert.rejects(
    createRdxProject(config(), { rootDir, command: 'prepare' }),
    /valid JSON/
  )
  assert.equal(await readFile(manifest, 'utf8'), 'broken')
  await writeFile(
    manifest,
    JSON.stringify({ active: ['1.0.0'], archived: ['1.0.0'] })
  )
  await assert.rejects(
    createRdxProject(config(), { rootDir }),
    /Duplicate version/
  )
  await writeFile(manifest, JSON.stringify({ active: ['1.0.0'], archived: [] }))
  await assert.rejects(
    createRdxProject(config(), { rootDir }),
    /Snapshot.*missing/
  )
})

test('snapshot creation rejects live page collisions before copying content', async (t) => {
  const rootDir = await fixture(t)
  await writeFile(path.join(rootDir, 'docs/1.0.0.mdx'), 'Existing live page')
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  await assert.rejects(
    async () =>
      project.commands[0].run({
        rootDir,
        config: project.config,
        command: 'version',
        args: ['1.0.0'],
      }),
    /conflicts with live documentation/
  )
  await assert.rejects(
    access(path.join(rootDir, 'versioned_docs/version-1.0.0'))
  )
  assert.deepEqual(
    JSON.parse(await readFile(path.join(rootDir, 'versions.json'))),
    { active: [], archived: [] }
  )
})

test('snapshot paths cannot overlap live docs or escape the project', async (t) => {
  const rootDir = await fixture(t)
  for (const versionsDir of ['docs/history', '../outside']) {
    await assert.rejects(
      createRdxProject(
        { title: 'Docs', plugins: [versioning({ versionsDir })] },
        { rootDir, command: 'prepare' }
      ),
      /separate directories|inside the project/
    )
  }
})
