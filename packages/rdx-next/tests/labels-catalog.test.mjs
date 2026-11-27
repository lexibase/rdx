import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createJiti } from 'jiti'
import { createRdxProject } from '@lexibase/rdx-core'

import { syncLabelCatalogs } from '../bin/labels-catalog.mjs'

const jiti = createJiti(import.meta.url)
const { interfaceTexts } = await jiti.import('../../rdx-ui/src/lib/i18n.ts')

async function fixture(t, { lang = 'en', localized = false } = {}) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-labels-sync-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  async function write(file, content) {
    const target = path.join(rootDir, file)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  const read = async (file) =>
    JSON.parse(await readFile(path.join(rootDir, file), 'utf8'))
  await write('docs/01-getting-started/intro.mdx', '---\ntitle: Intro\n---\n')
  // An older edition keeps a category the live documentation no longer has.
  await write('archive/01-migration/upgrade.mdx', '---\ntitle: Upgrade\n---\n')
  const plugins = [
    {
      name: 'edition-fixture',
      apiVersion: 1,
      setup: () => ({
        sources: [
          {
            id: '1.0.0',
            label: '1.0.0',
            docsDir: 'archive',
            routePrefix: '1.0.0',
          },
        ],
        ...(localized
          ? {
              localization: {
                locales: [
                  { code: lang, label: 'Primary' },
                  { code: 'pt-BR', label: 'Português', folder: 'ptbr' },
                ],
              },
            }
          : {}),
      }),
    },
  ]
  const sync = async (options) =>
    syncLabelCatalogs(
      await createRdxProject(
        { metadata: { applicationName: 'Sync' }, lang, plugins },
        { rootDir }
      ),
      interfaceTexts,
      options
    )
  return { rootDir, write, read, sync }
}

function quietly(t) {
  const log = t.mock.method(console, 'log', () => {})
  return () => log.mock.calls.map((call) => call.arguments.join(' '))
}

test('an English-only project needs no root catalog', async (t) => {
  const { rootDir, sync } = await fixture(t)
  const output = quietly(t)
  await sync()
  await assert.rejects(readFile(path.join(rootDir, '_labels.json')))
  assert.match(output().join('\n'), /up to date/)
})

test('a non-English primary language gets every interface text and category', async (t) => {
  const { read, sync } = await fixture(t, { lang: 'pt-BR' })
  quietly(t)
  await sync()
  const catalog = await read('_labels.json')
  assert.deepEqual(Object.keys(catalog.interface), [...interfaceTexts])
  assert.ok(Object.values(catalog.interface).every((value) => value === ''))
  assert.deepEqual(catalog.categories, { 'Getting Started': '', Migration: '' })
})

test('sync keeps translations and orphans; --prune removes only unused keys', async (t) => {
  const { write, read, sync } = await fixture(t, { localized: true })
  await write(
    'locale/ptbr/_labels.json',
    JSON.stringify({
      interface: { 'On this page': 'Nesta página', 'Retired text': 'x' },
      categories: { 'Getting Started': 'Primeiros passos', Removed: 'Velho' },
    })
  )
  const output = quietly(t)
  await sync()
  let catalog = await read('locale/ptbr/_labels.json')
  assert.equal(catalog.interface['On this page'], 'Nesta página')
  assert.equal(catalog.interface['Retired text'], 'x')
  assert.equal(catalog.categories.Removed, 'Velho')
  assert.equal(catalog.categories.Migration, '')
  await sync({ prune: true })
  catalog = await read('locale/ptbr/_labels.json')
  assert.equal(catalog.interface['On this page'], 'Nesta página')
  assert.equal(Object.hasOwn(catalog.interface, 'Retired text'), false)
  assert.deepEqual(catalog.categories, {
    'Getting Started': 'Primeiros passos',
    Migration: '',
  })
  assert.match(output().join('\n'), /removed 2 unused entries/)
})

test('an invalid catalog is never overwritten', async (t) => {
  const { rootDir, write, sync } = await fixture(t, { lang: 'pt-BR' })
  await write('_labels.json', '{ broken')
  await assert.rejects(
    sync(),
    /Cannot sync _labels\.json: it is not valid JSON/
  )
  assert.equal(
    await readFile(path.join(rootDir, '_labels.json'), 'utf8'),
    '{ broken'
  )
})
