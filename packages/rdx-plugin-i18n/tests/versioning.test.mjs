import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createRdxProject,
  getLocalizedProject,
  getLanguageLinks,
  resolveDocsRoute,
} from '@lexibase/rdx-core'
import { checkDocumentation } from '@lexibase/rdx-core/check'
import { versioning } from '@lexibase/rdx-versioning'
import { i18n } from '../dist/index.js'

function fixture(t) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rdx-multilingual-editions-')
  )
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  function write(file, content) {
    fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true })
    fs.writeFileSync(path.join(rootDir, file), content)
  }
  write(
    'docs/guides/intro.mdx',
    '---\ntitle: Introduction\n---\nPrimarySnapshotMarker'
  )
  write(
    'docs/guides/reference.mdx',
    '---\ntitle: Reference\n---\nPrimaryReferenceMarker'
  )
  write(
    'locale/ptbr/docs/guides/intro.mdx',
    '---\ntitle: Introdução\n---\nPortugueseSnapshotMarker'
  )
  const locales = [
    { code: 'en', label: 'English' },
    { code: 'pt-BR', label: 'Português', folder: 'ptbr' },
  ]
  const config = (order = false, entries = locales, extra = []) => ({
    metadata: { applicationName: 'Docs' },
    lang: 'en',
    plugins: [
      ...(order
        ? [i18n({ locales: entries }), versioning()]
        : [versioning(), i18n({ locales: entries })]),
      ...extra,
    ],
  })
  const project = (options = config(), command = 'prepare') =>
    createRdxProject(options, { rootDir, command })
  const run = (project, command, value) =>
    project.commands
      .find((entry) => entry.name === command)
      .run({ rootDir, config: project.config, command, args: [value] })
  const read = (file) => fs.readFileSync(path.join(rootDir, file), 'utf8')
  const exists = (file) => fs.existsSync(path.join(rootDir, file))
  return { rootDir, write, config, project, run, read, exists, locales }
}

test('historical editions use the current contribution URL without rewriting frozen metadata', async (t) => {
  const f = fixture(t)
  const config = (contributionUrl) => ({
    ...f.config(),
    plugins: [versioning(), i18n({ locales: f.locales, contributionUrl })],
  })
  const first = await f.project(
    config('https://github.com/old/project/tree/main/locale')
  )
  f.run(first, 'version', '1.0.0')
  const metadata = f.read('versioned_docs/version-1.0.0/.rdx-locales.json')
  const url = 'https://github.com/new/project/tree/docs/locale'
  const updated = getLocalizedProject(await f.project(config(url)), 'pt-br')
  assert.equal(updated.localization.contributionUrl, url)
  assert.equal(
    resolveDocsRoute(updated, [
      '1.0.0',
      'guides',
      'intro',
    ]).document.content.includes('PortugueseSnapshotMarker'),
    true
  )
  assert.equal(
    f.read('versioned_docs/version-1.0.0/.rdx-locales.json'),
    metadata
  )
  assert.equal(JSON.parse(metadata).contributionUrl, undefined)
})

for (const reversed of [false, true])
  test(`one command freezes all languages independently of plugin order (${reversed})`, async (t) => {
    const f = fixture(t)
    const project = await f.project(f.config(reversed))
    f.run(project, 'version', '1.0.0')
    const metadataPath = 'versioned_docs/version-1.0.0/.rdx-locales.json'
    const metadata = f.read(metadataPath)
    assert.equal(
      JSON.parse(metadata).translations['pt-BR'].docsDir,
      'locale/ptbr/versioned_docs/version-1.0.0'
    )
    f.write('docs/guides/intro.mdx', 'PrimaryLiveMarker')
    f.write(
      'locale/ptbr/docs/guides/intro.mdx',
      'PortugueseLiveMarker\n\n## Detalhes'
    )
    f.write(
      'locale/ptbr/docs/guides/reference.mdx',
      'NewPortugueseReferenceMarker'
    )
    const pt = getLocalizedProject(await f.project(f.config(reversed)), 'pt-br')
    assert.match(
      resolveDocsRoute(pt, ['1.0.0', 'guides', 'intro']).document.content,
      /PortugueseSnapshotMarker/
    )
    assert.match(
      resolveDocsRoute(pt, ['1.0.0', 'guides', 'reference']).document.content,
      /PrimaryReferenceMarker/
    )
    assert.match(
      resolveDocsRoute(pt, ['guides', 'reference']).document.content,
      /NewPortugueseReferenceMarker/
    )
    assert.deepEqual(
      checkDocumentation(await f.project(f.config(reversed))).diagnostics,
      []
    )
    f.run(project, 'archive', '1.0.0')
    let archived = getLocalizedProject(
      await f.project(f.config(reversed)),
      'pt-br'
    )
    assert.equal(
      resolveDocsRoute(archived, ['1.0.0', 'guides', 'intro']).source.badge,
      'Archived'
    )
    assert.equal(f.read(metadataPath), metadata)
    f.run(project, 'unarchive', '1.0.0')
    f.run(project, 'version', '1.1.0')
    f.run(project, 'version', '2.0.0')
    const updated = getLocalizedProject(
      await f.project(f.config(reversed)),
      'pt-br'
    )
    assert.equal(
      resolveDocsRoute(updated, ['1.0.0', 'guides', 'intro']).source.redirectTo,
      '1.1.0'
    )
    assert.match(
      resolveDocsRoute(updated, ['1.1.0', 'guides', 'intro']).document.content,
      /PortugueseLiveMarker/
    )
    assert.deepEqual(
      getLanguageLinks(
        updated,
        updated.sources.find((source) => source.routePrefix === '1.1.0'),
        'guides/intro'
      ).map((entry) => entry.href),
      ['/en/docs/1.1.0/guides/intro', '/pt-br/docs/1.1.0/guides/intro']
    )
    assert.match(
      f.read('locale/ptbr/versioned_docs/version-1.0.0/guides/intro.mdx'),
      /PortugueseSnapshotMarker/
    )
    assert.equal(f.read(metadataPath), metadata)
    assert.deepEqual(JSON.parse(f.read('versions.json')).active, [
      '2.0.0',
      '1.1.0',
    ])
    f.write(
      'locale/ptbr/docs/guides/intro.mdx',
      'PortugueseLiveMarker\n\n## Detalhes\n\n[Previous Portuguese section](/pt-br/docs/1.0.0/guides/intro#detalhes)'
    )
    assert.deepEqual(
      checkDocumentation(await f.project(f.config(reversed))).diagnostics,
      []
    )
  })

test('a non-English primary language and custom primary snapshot paths share the same lifecycle', async (t) => {
  const f = fixture(t)
  f.write('locale/english/docs/guides/intro.mdx', 'EnglishSnapshotMarker')
  const config = {
    metadata: { applicationName: 'Docs' },
    lang: 'pt-BR',
    plugins: [
      i18n({
        locales: [
          { code: 'pt-BR', label: 'Português' },
          { code: 'en', label: 'English', folder: 'english' },
        ],
      }),
      versioning({
        versionsDir: 'history/releases',
        versionsFile: 'history/versions.json',
      }),
    ],
  }
  const project = await f.project(config)
  f.run(project, 'version', '2.0.0')
  const next = await f.project(config)
  const english = getLocalizedProject(next, 'en')
  assert.match(
    resolveDocsRoute(english, ['2.0.0', 'guides', 'intro']).document.content,
    /EnglishSnapshotMarker/
  )
  const source = english.sources.find((entry) => entry.routePrefix === '2.0.0')
  assert.equal(
    source.fallbackDocsDir,
    path.join('history', 'releases', 'version-2.0.0')
  )
  assert.equal(next.localization.defaultLocale, 'pt-BR')
  assert.ok(
    next.runtimeFiles.includes(
      path.join('history/releases/version-2.0.0', '.rdx-locales.json')
    )
  )
  assert.deepEqual(JSON.parse(f.read('history/versions.json')).active, [
    '2.0.0',
  ])
})

test('enabling localization on older snapshots never borrows their translations from live content', async (t) => {
  const f = fixture(t)
  const original = await f.project({
    metadata: { applicationName: 'Docs' },
    plugins: [versioning()],
  })
  f.run(original, 'version', '1.0.0')
  const legacy = f.read('versioned_docs/version-1.0.0/guides/intro.mdx')
  const project = await f.project()
  const route = resolveDocsRoute(getLocalizedProject(project, 'pt-br'), [
    '1.0.0',
    'guides',
    'intro',
  ])
  assert.match(route.document.content, /PrimarySnapshotMarker/)
  assert.equal(route.source.fallbackOnly, true)
  assert.equal(f.read('versioned_docs/version-1.0.0/guides/intro.mdx'), legacy)
  assert.equal(
    f.exists('versioned_docs/version-1.0.0/.rdx-locales.json'),
    false
  )
})

test('frozen folder identities survive live alias changes and retired languages keep historical URLs available', async (t) => {
  const f = fixture(t)
  const first = await f.project()
  f.run(first, 'version', '1.0.0')
  f.write('locale/new-pt/docs/guides/intro.mdx', 'NewFolderMarker')
  const changed = f.config(false, [
    { code: 'en', label: 'English' },
    { code: 'pt-BR', label: 'Novo Português', folder: 'new-pt' },
  ])
  const renamed = getLocalizedProject(await f.project(changed), 'pt-br')
  assert.match(
    resolveDocsRoute(renamed, ['1.0.0', 'guides', 'intro']).document.content,
    /PortugueseSnapshotMarker/
  )
  assert.match(
    resolveDocsRoute(renamed, ['guides', 'intro']).document.content,
    /NewFolderMarker/
  )
  f.write('locale/es/docs/guides/intro.mdx', 'SpanishMarker')
  const current = f.config(false, [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ])
  const release = await f.project(current)
  f.run(release, 'version', '1.1.0')
  const project = await f.project(current)
  assert.ok(
    project.localization.locales.some((locale) => locale.code === 'pt-BR')
  )
  const historical = resolveDocsRoute(getLocalizedProject(project, 'pt-br'), [
    '1.0.0',
    'guides',
    'intro',
  ])
  assert.equal(historical.source.redirectTo, '1.1.0')
  assert.equal(historical.source.fallbackOnly, true)
  assert.match(historical.document.content, /PrimarySnapshotMarker/)
  assert.ok(
    project.runtimeFiles.includes(
      path.join('versioned_docs/version-1.0.0', '.rdx-locales.json')
    )
  )
})

test('corrupt metadata, missing published translation trees and primary-language changes fail without rewriting snapshots', async (t) => {
  const f = fixture(t)
  const project = await f.project()
  f.run(project, 'version', '1.0.0')
  const filename = 'versioned_docs/version-1.0.0/.rdx-locales.json'
  const frozen = f.read(filename)
  f.write(filename, '{invalid json')
  await assert.rejects(f.project(), /Invalid.*rdx-locales/)
  assert.equal(f.read(filename), '{invalid json')
  f.write(filename, frozen)
  const changedPrimary = {
    ...f.config(false, [
      { code: 'pt-BR', label: 'Português' },
      { code: 'en', label: 'English' },
    ]),
    lang: 'pt-BR',
  }
  f.write('locale/en/docs/guides/intro.mdx', 'English marker')
  await assert.rejects(f.project(changedPrimary), /primary language differs/)
  fs.rmSync(path.join(f.rootDir, 'locale/ptbr/versioned_docs/version-1.0.0'), {
    recursive: true,
  })
  await assert.rejects(f.project(), /Missing snapshot translation.*Restore/)
  assert.equal(f.read(filename), frozen)
})

test('failed translation copies and manifest writes roll back only newly reserved snapshots and allow retry', async (t) => {
  const f = fixture(t)
  const project = await f.project()
  f.run(project, 'version', '1.0.0')
  const manifest = f.read('versions.json')
  const originalCopy = fs.cpSync
  const copy = t.mock.method(fs, 'cpSync', (from, to, options) => {
    if (String(from).split(path.sep).join('/').includes('/locale/ptbr/docs/'))
      throw new Error('Translation copy failed')
    return originalCopy(from, to, options)
  })
  assert.throws(
    () => f.run(project, 'version', '1.1.0'),
    /Translation copy failed/
  )
  copy.mock.restore()
  for (const folder of [
    'versioned_docs/version-1.1.0',
    'locale/ptbr/versioned_docs/version-1.1.0',
  ])
    assert.equal(f.exists(folder), false)
  assert.equal(f.read('versions.json'), manifest)
  const rename = t.mock.method(fs, 'renameSync', () => {
    throw new Error('Manifest write failed')
  })
  assert.throws(
    () => f.run(project, 'version', '1.1.0'),
    /Manifest write failed/
  )
  rename.mock.restore()
  assert.equal(f.exists('locale/ptbr/versioned_docs/version-1.1.0'), false)
  assert.equal(f.exists('versioned_docs/version-1.1.0'), false)
  assert.equal(f.read('versions.json'), manifest)
  assert.match(
    f.read('locale/ptbr/versioned_docs/version-1.0.0/guides/intro.mdx'),
    /PortugueseSnapshotMarker/
  )
  f.run(project, 'version', '1.1.0')
  assert.deepEqual(JSON.parse(f.read('versions.json')).active, ['1.1.0'])
})

test('pre-existing translation targets, unsafe contributions and source metadata collisions are preserved', async (t) => {
  const f = fixture(t)
  let project = await f.project()
  f.write('locale/ptbr/versioned_docs/version-1.0.0/keep.txt', 'User content')
  assert.throws(() => f.run(project, 'version', '1.0.0'), /already exists/)
  assert.equal(
    f.read('locale/ptbr/versioned_docs/version-1.0.0/keep.txt'),
    'User content'
  )
  assert.equal(f.exists('versioned_docs/version-1.0.0'), false)
  for (const snapshot of [
    () => ({ directories: [{ sourceDir: 'docs', snapshotDir: '../outside' }] }),
    () => ({ files: [{ filename: 'versions.json', content: 'overwrite' }] }),
    () => ({
      files: [
        {
          filename: 'versioned_docs/version-2.0.0/.rdx-locales.json',
          content: '{}',
        },
      ],
    }),
    () => Promise.resolve({}),
  ]) {
    project = await f.project(
      f.config(false, f.locales, [
        { name: 'snapshot-fixture', apiVersion: 1, snapshot },
      ])
    )
    assert.throws(
      () => f.run(project, 'version', '2.0.0'),
      /project|unique paths|synchronous/
    )
    assert.equal(f.exists('versioned_docs/version-2.0.0'), false)
  }
  project = await f.project()
  f.write('docs/.rdx-locales.json', 'User metadata')
  assert.throws(() => f.run(project, 'version', '2.0.0'), /metadata conflicts/)
  assert.equal(f.read('docs/.rdx-locales.json'), 'User metadata')
  assert.equal(f.exists('locale/ptbr/versioned_docs/version-2.0.0'), false)
})
