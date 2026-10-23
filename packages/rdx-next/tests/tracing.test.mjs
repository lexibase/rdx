import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { getRdxTracingConfig } from '../config.mjs'

const require = createRequire(import.meta.url)
const picomatch = require('next/dist/compiled/picomatch')

async function fixture(t) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-tracing-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  return rootDir
}

async function file(root, name, text = '') {
  const filename = path.join(root, name)
  await mkdir(path.dirname(filename), { recursive: true })
  await writeFile(filename, text)
}

test('tracing includes only configured MDX, category metadata and declared plugin runtime files', async (t) => {
  const rootDir = await fixture(t)
  await file(
    rootDir,
    'rdx.config.ts',
    `export default {
    title: 'Trace fixture', docsDir: 'content [live]',
    plugins: [{ name: 'custom', apiVersion: 1, setup() { return {
      runtimeFiles: ['metadata/releases.data'],
      sources: [{ id: 'archive', label: 'Archive', docsDir: 'snapshots/v1', routePrefix: 'v1' }]
    } } }]
  }`
  )
  const expected = [
    'content [live]/guides/intro.mdx',
    'content [live]/guides/_category.json',
    'snapshots/v1/guide.mdx',
    'metadata/releases.data',
  ]
  for (const name of expected)
    await file(rootDir, name, name.endsWith('.json') ? '{}' : '')
  for (const name of [
    '.env.local',
    'README.md',
    'home.tsx',
    'docs/ignored.mdx',
    'content [live]/private.txt',
    'public/images/logo.svg',
    'versions.json',
  ])
    await file(rootDir, name)
  const config = await getRdxTracingConfig({
    rootDir,
    appDir: path.join(rootDir, '.rdx'),
  })
  const patterns = config.outputFileTracingIncludes['/*']
  assert.equal(patterns.length, expected.length)
  const matches = picomatch(patterns)
  for (const name of expected) assert.ok(matches(`../${name}`), name)
  assert.equal(matches('../content l/guides/intro.mdx'), false)
  assert.equal(matches('../content [live]/private.txt'), false)
  assert.equal(matches('../versions.json'), false)
  assert.equal(matches('../.env.local'), false)
  assert.deepEqual(
    await getRdxTracingConfig({ rootDir, appDir: path.join(rootDir, '.rdx') }),
    config
  )
})

test('tracing supports empty projects without enabling versioning or creating files', async (t) => {
  const rootDir = await fixture(t)
  await file(
    rootDir,
    'rdx.config.ts',
    "export default { title: 'Empty project' }"
  )
  assert.deepEqual(await getRdxTracingConfig({ rootDir }), {
    outputFileTracingIncludes: { '/*': [] },
  })
})

test('configured versioning traces custom manifests and both active and archived snapshots', async (t) => {
  const rootDir = await fixture(t)
  const plugin = new URL(
    '../../rdx-plugin-versioning/dist/index.js',
    import.meta.url
  ).href
  await file(
    rootDir,
    'rdx.config.ts',
    `import { versioning } from '${plugin}';
    export default { title: 'Versions', docsDir: 'content', plugins: [versioning({
      versionsFile: 'metadata/editions.data', versionsDir: 'snapshots'
    })] }`
  )
  for (const name of [
    'content/intro.mdx',
    'snapshots/version-1.0.0/intro.mdx',
    'snapshots/version-0.1.0/intro.mdx',
  ])
    await file(rootDir, name)
  await file(
    rootDir,
    'metadata/editions.data',
    JSON.stringify({ active: ['1.0.0'], archived: ['0.1.0'] })
  )
  assert.deepEqual(
    (await getRdxTracingConfig({ rootDir })).outputFileTracingIncludes['/*'],
    [
      'content/intro.mdx',
      'metadata/editions.data',
      'snapshots/version-0.1.0/intro.mdx',
      'snapshots/version-1.0.0/intro.mdx',
    ]
  )
})

test('missing or non-file plugin runtime entries fail instead of creating an incomplete deployment', async (t) => {
  const rootDir = await fixture(t)
  await file(
    rootDir,
    'rdx.config.ts',
    `export default { title: 'Invalid files',
    plugins: [{ name: 'custom', apiVersion: 1, setup: () => ({runtimeFiles: ['metadata']}) }]
  }`
  )
  await assert.rejects(getRdxTracingConfig({ rootDir }), /ENOENT/)
  await mkdir(path.join(rootDir, 'metadata'))
  await assert.rejects(
    getRdxTracingConfig({ rootDir }),
    /runtimeFiles must name a file/
  )
})
