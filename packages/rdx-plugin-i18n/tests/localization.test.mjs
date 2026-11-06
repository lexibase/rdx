import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createRdxProject,
  getLocalizedProject,
  resolveDocsRoute,
  getDocsHref,
} from '@lexibase/rdx-core'
import { checkDocumentation } from '@lexibase/rdx-core/check'
import { i18n } from '../dist/index.js'

function fixture(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-locales-'))
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  function write(file, content) {
    fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true })
    fs.writeFileSync(path.join(rootDir, file), content)
  }
  write('docs/02-reference/api.md', '---\ntitle: API\n---\n\n## API')
  write(
    'docs/01-guides/03-intro.mdx',
    '---\ntitle: Introduction\norder: 1\n---\n\n## Hello\n\n[Install](./02-install.mdx#requirements)'
  )
  write(
    'docs/01-guides/02-install.mdx',
    '---\ntitle: Install\n---\n\n## Requirements'
  )
  write(
    'locale/ptbr/docs/09-guides/08-intro.md',
    '---\ntitle: Introdução\nnavTitle: Começar\norder: 100\n---\n\n## Olá\n\n[Instalar](./02-install.mdx#requirements)\n\n[English](/en/docs/guides/intro#hello)'
  )
  const options = {
    locales: [
      { code: 'en', label: 'English' },
      { code: 'pt-BR', label: 'Português (Brasil)', folder: 'ptbr' },
    ],
  }
  const config = {
    metadata: {
      applicationName: 'Docs',
      metadataBase: 'https://docs.example.test',
    },
    lang: 'en',
    plugins: [i18n(options)],
  }
  return { rootDir, config, options, write }
}

test('installing without configuring the plugin leaves the project unchanged', async (t) => {
  const { rootDir, config } = fixture(t)
  const project = await createRdxProject(
    { ...config, plugins: [] },
    { rootDir }
  )
  assert.equal(project.localization, undefined)
  assert.equal(
    getDocsHref(project, project.sources[0], 'guides/intro'),
    '/docs/guides/intro'
  )
  assert.equal(fs.existsSync(path.join(rootDir, '.rdx')), false)
})

test('optional contribution URLs use explicit HTTP(S) destinations and preserve configured languages without translations', async (t) => {
  const f = fixture(t)
  for (const contributionUrl of [
    '',
    '/locale',
    'javascript:alert(1)',
    'data:text/html,test',
    'https://user:secret@example.test/locale',
    42,
  ]) {
    await assert.rejects(
      createRdxProject(
        { ...f.config, plugins: [i18n({ ...f.options, contributionUrl })] },
        { rootDir: f.rootDir }
      ),
      /contributionUrl/
    )
  }
  const contributionUrl =
    'https://github.com/example/project/tree/main/apps/web/locale'
  fs.mkdirSync(path.join(f.rootDir, 'locale/es/docs'), { recursive: true })
  const project = await createRdxProject(
    {
      ...f.config,
      plugins: [
        i18n({
          ...f.options,
          contributionUrl,
          locales: [...f.options.locales, { code: 'es', label: 'Español' }],
        }),
      ],
    },
    { rootDir: f.rootDir }
  )
  assert.equal(project.localization.contributionUrl, contributionUrl)
  assert.equal(
    getLocalizedProject(project, 'pt-br').localization.contributionUrl,
    contributionUrl
  )
  assert.deepEqual(
    project.localization.locales.map((locale) => locale.code),
    ['en', 'pt-BR', 'es']
  )
  assert.equal(
    (await createRdxProject(f.config, { rootDir: f.rootDir })).localization
      .contributionUrl,
    undefined
  )
})

test('locale views match normalized routes, preserve primary order and use translated page labels', async (t) => {
  const { rootDir, config } = fixture(t)
  const project = await createRdxProject(config, { rootDir })
  const pt = getLocalizedProject(project, 'pt-br')
  const intro = resolveDocsRoute(pt, ['guides', 'intro'])
  assert.equal(intro.document.frontmatter.title, 'Introdução')
  assert.deepEqual(
    intro.categories.map((category) => category.title),
    ['Guides', 'Reference']
  )
  assert.equal(intro.categories[0].pages[0].navTitle, 'Começar')
  assert.deepEqual(
    intro.categories[0].pages.map((page) => page.slug),
    ['guides/intro', 'guides/install']
  )
  assert.equal(
    resolveDocsRoute(pt, ['guides', 'install']).document.frontmatter.title,
    'Install'
  )
  assert.equal(resolveDocsRoute(pt, ['missing']).document, null)
  assert.equal(project.config.lang, 'en')
  assert.equal(project.sources[0].docsDir, 'docs')
  assert.equal(pt.config.lang, 'pt-BR')
  const en = getLocalizedProject(pt, 'en')
  assert.equal(en.sources[0].docsDir, 'docs')
  assert.equal(en.sources[0].fallbackDocsDir, undefined)
  assert.equal(
    getDocsHref(pt, pt.sources[0], 'guides/intro'),
    '/pt-br/docs/guides/intro'
  )
  assert.throws(() => getLocalizedProject(project, 'ptbr'), /Unknown/)
})

test('an existing translated category label still applies', async (t) => {
  const { rootDir, config, write } = fixture(t)
  write(
    'locale/ptbr/docs/09-guides/_category.json',
    JSON.stringify({ title: 'Guias' })
  )
  const project = await createRdxProject(config, { rootDir })
  const pt = getLocalizedProject(project, 'pt-br')
  assert.equal(
    resolveDocsRoute(pt, ['guides', 'intro']).categories[0].title,
    'Guias'
  )
})

test('checking follows translated links and fallback anchors, includes cross-locale URLs and reports authored files once', async (t) => {
  const { rootDir, config, write } = fixture(t)
  let project = await createRdxProject(config, { rootDir })
  let report = checkDocumentation(project)
  assert.deepEqual(report.diagnostics, [])
  assert.equal(report.checkedPages, 4)
  write(
    'docs/01-guides/02-install.mdx',
    '## Requirements\n\n[Broken](./missing.mdx)'
  )
  report = checkDocumentation(project)
  assert.equal(report.diagnostics.length, 1)
  assert.equal(report.diagnostics[0].file, 'docs/01-guides/02-install.mdx')
  write('locale/ptbr/docs/orphan.mdx', '## Orphan')
  project = await createRdxProject(config, { rootDir })
  report = checkDocumentation(project)
  assert.ok(
    report.diagnostics.some(
      (entry) =>
        entry.file === 'locale/ptbr/docs/orphan.mdx' &&
        /counterpart/.test(entry.message)
    )
  )
})

test('unsafe, missing, duplicate and incomplete locale declarations fail without creating content', async (t) => {
  const { rootDir, config } = fixture(t)
  for (const locales of [
    [{ code: 'en', label: 'English' }],
    [
      { code: 'en', label: 'English' },
      { code: 'en', label: 'Again' },
    ],
    [
      { code: 'en', label: 'English', folder: 'en' },
      { code: 'pt-BR', label: 'PT', folder: 'ptbr' },
    ],
    [
      { code: 'en', label: 'English' },
      { code: 'pt-BR', label: 'PT', folder: '../outside' },
    ],
    [
      { code: 'en', label: 'English' },
      { code: 'pt-BR', label: 'PT', folder: 'missing' },
    ],
    [
      { code: 'en', label: 'English' },
      { code: 'pt_BR', label: 'PT', folder: 'ptbr' },
    ],
    [
      { code: 'pt-BR', label: 'PT', folder: 'ptbr' },
      { code: 'es', label: 'ES' },
    ],
  ])
    await assert.rejects(
      createRdxProject(
        { ...config, plugins: [i18n({ locales })] },
        { rootDir, command: 'check' }
      ),
      /localization/
    )
  assert.throws(() => i18n(), /locales/)
  assert.equal(fs.existsSync(path.join(rootDir, '.rdx')), false)
})

test('localization no longer reserves or blocks another plugin version command', async (t) => {
  const { rootDir, config } = fixture(t)
  const editions = {
    name: 'editions-fixture',
    apiVersion: 1,
    commands: [
      {
        name: 'version',
        description: 'Snapshot',
        run() {
          throw new Error('must not run')
        },
      },
    ],
  }
  for (const plugins of [
    [...config.plugins, editions],
    [editions, ...config.plugins],
  ])
    assert.ok(
      (
        await createRdxProject({ ...config, plugins }, { rootDir })
      ).commands.some((entry) => entry.name === 'version')
    )
})
