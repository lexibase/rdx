import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
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
import {
  createDocumentDateReader,
  getSnapshotDocumentDate,
} from '@lexibase/rdx-core/config'
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

const config = () => ({
  metadata: { applicationName: 'Docs' },
  plugins: [versioning()],
})

test('delete removes an exact alias or a full edition while preserving live docs and other majors', async (t) => {
  const rootDir = await fixture(t)
  const input = {
    ...config(),
    plugins: [
      versioning({
        versionsFile: 'releases/versions.json',
        versionsDir: 'snapshots',
      }),
    ],
  }
  const project = await createRdxProject(input, { rootDir, command: 'prepare' })
  const run = (name, version) =>
    project.commands
      .find((entry) => entry.name === name)
      .run({ rootDir, config: project.config, command: name, args: [version] })
  const manifest = path.join(rootDir, 'releases/versions.json')
  const exists = (label) =>
    fs.existsSync(path.join(rootDir, `snapshots/version-${label}`))
  for (const version of ['1.0.0', '1.1.0', '1.2.0', '2.0.0'])
    run('version', version)
  run('archive', '1.2.0')
  run('delete', '1.0.0')
  assert.equal(exists('1.0.0'), false)
  assert.equal(exists('1.2.0'), true)
  assert.deepEqual(JSON.parse(await readFile(manifest, 'utf8')), {
    active: ['2.0.0'],
    archived: ['1.2.0'],
    redirects: { '1.1.0': '1.2.0' },
  })
  assert.throws(() => run('delete', '1.0.0'), /does not exist/)
  assert.throws(() => run('delete', '../docs'), /safe version label/)
  run('delete', '1.2.0')
  assert.equal(exists('1.1.0'), false)
  assert.equal(exists('1.2.0'), false)
  assert.equal(exists('2.0.0'), true)
  assert.deepEqual(JSON.parse(await readFile(manifest, 'utf8')), {
    active: ['2.0.0'],
    archived: [],
  })
  const updated = await createRdxProject(input, { rootDir })
  assert.deepEqual(
    updated.sources.map((source) => source.routePrefix),
    ['', '2.0.0']
  )
  run('delete', '2.0.0')
  assert.equal(exists('2.0.0'), false)
  assert.equal(
    await readFile(path.join(rootDir, 'docs/guides/intro.mdx'), 'utf8'),
    'Original documentation'
  )
  assert.deepEqual(fs.readdirSync(path.dirname(manifest)), ['versions.json'])
})

test('delete refuses a linked snapshot and restores a staged snapshot if manifest replacement fails', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const run = (name) =>
    project.commands
      .find((entry) => entry.name === name)
      .run({ rootDir, config: project.config, command: name, args: ['1.0.0'] })
  run('version')
  const manifest = path.join(rootDir, 'versions.json')
  const before = await readFile(manifest, 'utf8')
  const snapshot = path.join(rootDir, 'versioned_docs/version-1.0.0')
  const saved = path.join(rootDir, 'saved')
  const lock = `${manifest}.rdx-lock`
  await writeFile(lock, '')
  for (const name of ['archive', 'delete'])
    assert.throws(() => run(name), /Another version command owns/)
  await rm(lock)
  fs.renameSync(snapshot, saved)
  fs.symlinkSync(
    path.join(rootDir, 'docs'),
    snapshot,
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  assert.throws(
    () => run('delete'),
    /snapshot directory without filesystem links/
  )
  fs.rmSync(snapshot, { force: true })
  fs.renameSync(saved, snapshot)
  const rename = fs.renameSync
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === manifest) throw new Error('Intentional write failure')
    return rename(from, to)
  })
  assert.throws(() => run('delete'), /Intentional write failure/)
  assert.equal(await readFile(manifest, 'utf8'), before)
  assert.equal(
    await readFile(path.join(snapshot, 'guides/intro.mdx'), 'utf8'),
    'Original documentation'
  )
  assert.deepEqual(fs.readdirSync(path.dirname(snapshot)), ['version-1.0.0'])
})

test('snapshot stores the committed source date and omits uncommitted content dates', async (t) => {
  const rootDir = await fixture(t)
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: rootDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: '2026-04-10T12:00:00Z',
        GIT_COMMITTER_DATE: '2026-04-10T12:00:00Z',
      },
    })
  git('init')
  git('add', '--', 'docs')
  git(
    '-c',
    'user.name=RDX Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--no-verify',
    '-m',
    'test: add sample document'
  )
  const live = path.join(rootDir, 'docs/guides/intro.mdx')
  const pending = path.join(rootDir, 'docs/guides/pending.md')
  await writeFile(pending, 'Draft')
  const dateFor = createDocumentDateReader(rootDir)
  assert.equal(dateFor(live), '2026-04-10')
  assert.equal(dateFor(pending), undefined)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  await project.commands[0].run({
    rootDir,
    config: project.config,
    command: 'version',
    args: ['1.0.0'],
  })
  await writeFile(live, 'Uncommitted edits')
  assert.equal(dateFor(live), undefined)
  const snapshot = path.join(rootDir, 'versioned_docs/version-1.0.0')
  assert.equal(
    getSnapshotDocumentDate(snapshot, path.join(snapshot, 'guides/intro.mdx')),
    '2026-04-10'
  )
  assert.equal(
    getSnapshotDocumentDate(snapshot, path.join(snapshot, 'guides/pending.md')),
    undefined
  )
})

test('patch and minor releases advance one edition per major and retain historical route aliases', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const publish = (version) =>
    project.commands[0].run({
      rootDir,
      config: project.config,
      command: 'version',
      args: [version],
    })
  await publish('2.0.0')
  await publish('3.1.0')
  await writeFile(
    path.join(rootDir, 'docs/guides/intro.mdx'),
    'Ready for 3.2.0'
  )
  await publish('3.2.0')
  await writeFile(
    path.join(rootDir, 'docs/guides/intro.mdx'),
    'Ready for 3.2.1'
  )
  await publish('3.2.1')
  await writeFile(
    path.join(rootDir, 'docs/guides/intro.mdx'),
    'Canary keeps moving'
  )
  const manifest = JSON.parse(
    await readFile(path.join(rootDir, 'versions.json'))
  )
  assert.deepEqual(manifest, {
    active: ['3.2.1', '2.0.0'],
    archived: [],
    redirects: { '3.1.0': '3.2.1', '3.2.0': '3.2.1' },
  })
  const next = await createRdxProject(config(), { rootDir })
  assert.deepEqual(
    next.sources
      .filter((source) => source.redirectTo === undefined)
      .map((source) => source.label),
    ['Current', '3.2.1', '2.0.0']
  )
  assert.equal(
    resolveDocsRoute(next, ['3.1.0', 'guides', 'intro']).source.redirectTo,
    '3.2.1'
  )
  assert.equal(
    resolveDocsRoute(next, ['3.1.0', 'guides', 'intro']).document.content,
    'Ready for 3.2.1'
  )
  assert.equal(
    resolveDocsRoute(next, ['guides', 'intro']).document.content,
    'Canary keeps moving'
  )
  assert.equal(
    resolveDocsRoute(next, ['2.0.0', 'guides', 'intro']).document.content,
    'Original documentation'
  )
  assert.deepEqual(getProjectDocsPaths(next), [
    'guides/intro',
    '3.2.1/guides/intro',
    '2.0.0/guides/intro',
  ])
  assert.equal(
    await readFile(
      path.join(rootDir, 'versioned_docs/version-3.1.0/guides/intro.mdx'),
      'utf8'
    ),
    'Original documentation'
  )
  assert.throws(() => publish('3.2.0'), /never overwritten/)
  assert.throws(() => publish('3.1.9'), /must be newer/)
  await publish('4.0.0')
  const upgraded = JSON.parse(
    await readFile(path.join(rootDir, 'versions.json'))
  )
  assert.deepEqual(upgraded.active, ['4.0.0', '3.2.1', '2.0.0'])
  assert.equal(
    await readFile(
      path.join(rootDir, 'versioned_docs/version-3.2.1/guides/intro.mdx'),
      'utf8'
    ),
    'Ready for 3.2.1'
  )
})

test('old manifests consolidate numerically without writes, and archived majors stay archived when updated', async (t) => {
  const rootDir = await fixture(t)
  for (const version of ['3.2.0', '3.10.0', '2.0.0']) {
    await mkdir(
      path.join(rootDir, `versioned_docs/version-${version}/guides`),
      { recursive: true }
    )
    await writeFile(
      path.join(rootDir, `versioned_docs/version-${version}/guides/intro.mdx`),
      version
    )
  }
  const filename = path.join(rootDir, 'versions.json')
  const original = JSON.stringify({
    active: ['3.2.0', '3.10.0'],
    archived: ['2.0.0'],
  })
  await writeFile(filename, original)
  const project = await createRdxProject(config(), { rootDir })
  assert.equal(await readFile(filename, 'utf8'), original)
  assert.deepEqual(
    project.sources
      .filter((source) => source.redirectTo === undefined)
      .map((source) => source.label),
    ['Current', '3.10.0', '2.0.0']
  )
  assert.equal(
    project.sources.find((source) => source.routePrefix === '3.2.0').redirectTo,
    '3.10.0'
  )
  await project.commands[0].run({
    rootDir,
    config: project.config,
    command: 'version',
    args: ['2.0.1'],
  })
  const saved = JSON.parse(await readFile(filename))
  assert.deepEqual(saved.active, ['3.10.0'])
  assert.deepEqual(saved.archived, ['2.0.1'])
  assert.equal(saved.redirects['3.2.0'], '3.10.0')
  assert.throws(
    () =>
      project.commands
        .find((entry) => entry.name === 'archive')
        .run({
          rootDir,
          config: project.config,
          command: 'archive',
          args: ['2.0.0'],
        }),
    /replaced by/
  )
})

test('failed edition publication leaves the previous manifest and content usable and permits retry', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const publish = (version) =>
    project.commands[0].run({
      rootDir,
      config: project.config,
      command: 'version',
      args: [version],
    })
  await publish('1.0.0')
  const filename = path.join(rootDir, 'versions.json')
  const before = await readFile(filename, 'utf8')
  const mocked = t.mock.method(fs, 'renameSync', () => {
    throw new Error('Write failed')
  })
  assert.throws(() => publish('1.0.1'), /Write failed/)
  mocked.mock.restore()
  assert.equal(await readFile(filename, 'utf8'), before)
  assert.equal(
    fs.existsSync(path.join(rootDir, 'versioned_docs/version-1.0.1')),
    false
  )
  await publish('1.0.1')
  assert.deepEqual(JSON.parse(await readFile(filename)).active, ['1.0.1'])
})

test('redirect manifests reject cycles, cross-major targets and missing editions', async (t) => {
  const rootDir = await fixture(t)
  for (const redirects of [
    { '1.0.0': '1.0.1', '1.0.1': '1.0.0' },
    { '1.0.0': '2.0.0' },
    { '1.0.0': '1.0.9' },
  ]) {
    await writeFile(
      path.join(rootDir, 'versions.json'),
      JSON.stringify({ active: ['2.0.0'], archived: [], redirects })
    )
    await assert.rejects(createRdxProject(config(), { rootDir }), /redirect/)
  }
})

test('pre-release identifiers compare numerically and stable releases advance the same major', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const publish = (version) =>
    project.commands[0].run({
      rootDir,
      config: project.config,
      command: 'version',
      args: [version],
    })
  await publish('1.0.0-beta.9')
  await publish('1.0.0-beta.10')
  assert.throws(() => publish('1.0.0-beta.8'), /must be newer/)
  await publish('1.0.0')
  assert.throws(() => publish('1.0.0-rc.1'), /must be newer/)
  assert.deepEqual(
    JSON.parse(await readFile(path.join(rootDir, 'versions.json'))).active,
    ['1.0.0']
  )
})

test('archive and unarchive preserve snapshots, routes and the current published edition', async (t) => {
  const rootDir = await fixture(t)
  const input = {
    metadata: { applicationName: 'Docs' },
    plugins: [
      versioning({
        versionsFile: 'releases/versions.json',
        versionsDir: 'snapshots',
      }),
    ],
  }
  const project = await createRdxProject(input, { rootDir, command: 'prepare' })
  const run = (name, version) =>
    project.commands
      .find((entry) => entry.name === name)
      .run({ rootDir, config: project.config, command: name, args: [version] })
  for (const version of ['1.0.0', '2.0.0', '3.0.0'])
    await run('version', version)
  const snapshot = path.join(
    rootDir,
    'snapshots/version-1.0.0/guides/intro.mdx'
  )
  const before = await readFile(snapshot, 'utf8')
  const manifest = path.join(rootDir, 'releases/versions.json')
  await run('archive', '1.0.0')
  const archived = await createRdxProject(input, { rootDir })
  assert.equal(
    archived.sources.find((entry) => entry.label === '1.0.0').badge,
    'Archived'
  )
  assert.equal(
    resolveDocsRoute(archived, ['1.0.0', 'guides', 'intro']).document.content,
    before
  )
  const serialized = await readFile(manifest, 'utf8')
  await run('archive', '1.0.0')
  assert.equal(await readFile(manifest, 'utf8'), serialized)
  await run('archive', '2.0.0')
  await run('unarchive', '1.0.0')
  assert.deepEqual(JSON.parse(await readFile(manifest)), {
    active: ['3.0.0', '1.0.0'],
    archived: ['2.0.0'],
  })
  await run('unarchive', '1.0.0')
  const restored = await createRdxProject(input, { rootDir })
  assert.equal(
    restored.sources.find((entry) => entry.label === '1.0.0').badge,
    undefined
  )
  assert.equal(await readFile(snapshot, 'utf8'), before)
  assert.equal(
    await readFile(path.join(rootDir, 'docs/guides/intro.mdx'), 'utf8'),
    before
  )
  assert.deepEqual(fs.readdirSync(path.dirname(manifest)), ['versions.json'])
})

test('archive commands reject invalid arguments, unknown versions and missing snapshots without rewriting the manifest', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const context = {
    rootDir,
    config: project.config,
    command: 'version',
    args: ['1.0.0'],
  }
  await project.commands[0].run(context)
  const manifest = path.join(rootDir, 'versions.json')
  const before = await readFile(manifest, 'utf8')
  for (const name of ['archive', 'unarchive']) {
    const command = project.commands.find((entry) => entry.name === name)
    for (const args of [[], ['1.0.0', '2.0.0']])
      assert.throws(
        () => command.run({ ...context, command: name, args }),
        /Usage:/
      )
    assert.throws(
      () => command.run({ ...context, args: ['../escape'] }),
      /safe version label/
    )
    assert.throws(
      () => command.run({ ...context, args: ['9.0.0'] }),
      /does not exist/
    )
    assert.equal(await readFile(manifest, 'utf8'), before)
  }
  await rm(path.join(rootDir, 'versioned_docs/version-1.0.0'), {
    recursive: true,
  })
  assert.throws(
    () =>
      project.commands.find((entry) => entry.name === 'archive').run(context),
    /Snapshot.*missing/
  )
  assert.equal(await readFile(manifest, 'utf8'), before)
})

test('failed manifest replacement preserves the original and removes its temporary file', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(config(), {
    rootDir,
    command: 'prepare',
  })
  const context = {
    rootDir,
    config: project.config,
    command: 'version',
    args: ['1.0.0'],
  }
  await project.commands[0].run(context)
  const manifest = path.join(rootDir, 'versions.json')
  const before = await readFile(manifest, 'utf8')
  t.mock.method(fs, 'renameSync', () => {
    throw new Error('Intentional write failure')
  })
  assert.throws(
    () =>
      project.commands.find((entry) => entry.name === 'archive').run(context),
    /Intentional write failure/
  )
  assert.equal(await readFile(manifest, 'utf8'), before)
  assert.deepEqual(
    fs.readdirSync(rootDir).filter((name) => name.startsWith('versions.json')),
    ['versions.json']
  )
})

test('installing without configuring versioning creates no manifest or commands', async (t) => {
  const rootDir = await fixture(t)
  const project = await createRdxProject(
    { metadata: { applicationName: 'Docs' } },
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
  assert.deepEqual(project.runtimeFiles, ['versions.json'])
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

for (const extension of ['md', 'mdx'])
  test(`snapshot creation rejects live ${extension} page collisions before copying content`, async (t) => {
    const rootDir = await fixture(t)
    await writeFile(
      path.join(rootDir, `docs/1.0.0.${extension}`),
      'Existing live page'
    )
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
        {
          metadata: { applicationName: 'Docs' },
          plugins: [versioning({ versionsDir })],
        },
        { rootDir, command: 'prepare' }
      ),
      /separate directories|inside the project/
    )
  }
})
