import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createRdxProject,
  getLocalizedProject,
  resolveDocsRoute,
} from '../dist/index.js'
import { parseLabels } from '../dist/config/index.js'

async function fixture(t, { localized = false } = {}) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-labels-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  async function write(file, content) {
    const target = path.join(rootDir, file)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  await write('docs/01-getting-started/intro.mdx', '---\ntitle: Intro\n---\n')
  await write('docs/02-guides/deploy.mdx', '---\ntitle: Deploy\n---\n')
  await write('docs/03-reference/api.mdx', '---\ntitle: API\n---\n')
  const plugins = localized
    ? [
        {
          name: 'localization-fixture',
          apiVersion: 1,
          setup: () => ({
            localization: {
              locales: [
                { code: 'en', label: 'English' },
                { code: 'pt-BR', label: 'Português', folder: 'ptbr' },
              ],
            },
          }),
        },
      ]
    : []
  const create = () =>
    createRdxProject(
      { metadata: { applicationName: 'Labels' }, lang: 'en', plugins },
      { rootDir }
    )
  return { rootDir, write, create }
}

const titles = (project) =>
  resolveDocsRoute(project).categories.map(({ title }) => title)

test('catalogs parse tolerantly and explain what rdx check should report', () => {
  assert.deepEqual(parseLabels('not json').problems, ['is not valid JSON.'])
  assert.deepEqual(parseLabels('[]').problems, ['must contain a JSON object.'])
  const { labels, problems } = parseLabels(
    '﻿' +
      JSON.stringify({
        interface: { 'On this page': 'Nesta página', Previous: 3 },
        categories: { Guides: 'Guias' },
        extra: {},
      })
  )
  assert.deepEqual(labels, {
    interface: { 'On this page': 'Nesta página' },
    categories: { Guides: 'Guias' },
  })
  assert.equal(problems.length, 2)
  assert.match(problems.join('\n'), /"interface" → "Previous" must be text/)
  assert.match(problems.join('\n'), /unknown section "extra"/)
})

test('the primary catalog renames categories without changing their order', async (t) => {
  const { write, create } = await fixture(t)
  assert.deepEqual(titles(await create()), [
    'Getting Started',
    'Guides',
    'Reference',
  ])
  await write(
    '_labels.json',
    JSON.stringify({
      categories: { 'Getting Started': 'Zebra start', Reference: '  ' },
    })
  )
  const project = await create()
  assert.ok(project.runtimeFiles.includes('_labels.json'))
  // A blank value keeps the folder name; the numeric order is untouched.
  assert.deepEqual(titles(project), ['Zebra start', 'Guides', 'Reference'])
})

test('each language reads its own catalog, including untranslated fallback pages', async (t) => {
  const { write, create } = await fixture(t, { localized: true })
  await write('locale/ptbr/docs/01-getting-started/intro.mdx', '# Intro\n')
  await write(
    'locale/ptbr/_labels.json',
    JSON.stringify({
      categories: { 'Getting Started': 'Primeiros passos', Guides: 'Guias' },
    })
  )
  await write(
    '_labels.json',
    JSON.stringify({ categories: { Guides: 'Docs' } })
  )
  const project = await create()
  assert.ok(project.runtimeFiles.includes('locale/ptbr/_labels.json'))
  assert.deepEqual(titles(getLocalizedProject(project, 'pt-br')), [
    'Primeiros passos',
    'Guias',
    'Reference',
  ])
  assert.deepEqual(titles(getLocalizedProject(project, 'en')), [
    'Getting Started',
    'Docs',
    'Reference',
  ])
})

test('_category.json no longer renames or reorders categories', async (t) => {
  const { write, create } = await fixture(t)
  await write(
    'docs/02-guides/_category.json',
    JSON.stringify({ title: 'Renamed', sidebar_position: -5 })
  )
  assert.deepEqual(titles(await create()), [
    'Getting Started',
    'Guides',
    'Reference',
  ])
})

test('rdx check reports stale keys, lost placeholders and invalid catalogs', async (t) => {
  const { write, create } = await fixture(t, { localized: true })
  await write(
    '_labels.json',
    JSON.stringify({
      categories: { Guides: 'Docs', Retired: 'Old' },
      interface: {
        'Version {version}': 'Version',
        'Old interface text': 'x',
        'On this page': '',
      },
    })
  )
  await write('locale/ptbr/_labels.json', '{ broken')
  const { checkDocumentation } = await import('../dist/check/index.js')
  const messages = (
    checkDocumentation(await create(), {
      interfaceTexts: ['Version {version}', 'On this page'],
    }).warnings ?? []
  )
    .filter((warning) => warning.code === 'labels')
    .map((warning) => warning.message)
  assert.equal(messages.length, 4, messages.join('\n'))
  assert.match(
    messages.join('\n'),
    /"Retired" is not a category in any edition/
  )
  assert.match(
    messages.join('\n'),
    /"Old interface text" is not an interface text/
  )
  assert.match(
    messages.join('\n'),
    /"Version \{version\}" must keep \{version\}/
  )
  assert.match(
    messages.join('\n'),
    /locale\/ptbr\/_labels\.json is not valid JSON/
  )
})
