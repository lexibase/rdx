import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createRdxProject,
  defineConfig,
  resolveConfig,
  getProjectDocsPaths,
  resolveDocsRoute,
  getDocsIndex,
  getDocument,
  createDocumentLinkResolver,
} from '../dist/index.js'
import { getEditPageHref } from '../dist/config/index.js'

async function fixture(t) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-core-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  await mkdir(path.join(rootDir, 'docs/guides'), { recursive: true })
  await writeFile(
    path.join(rootDir, 'docs/guides/intro.mdx'),
    '---\ntitle: Intro\n---\nLive documentation'
  )
  return rootDir
}

test('edit links use the live file path within the project', () => {
  const metadata = { applicationName: 'Docs' }
  const baseUrl = 'https://github.com/example/docs/edit/main/apps/web/'
  const rootDir = path.resolve('example-project')
  const file = path.join(rootDir, 'locale', 'ptbr', 'docs', 'Quick start #1.md')
  const source = { id: 'current' }
  const project = {
    rootDir,
    config: resolveConfig({ metadata, editPage: { baseUrl } }),
  }
  assert.equal(
    getEditPageHref(project, source, file),
    `${baseUrl}locale/ptbr/docs/Quick%20start%20%231.md`
  )
  assert.equal(getEditPageHref(project, { id: '1.0.0' }, file), undefined)
  assert.equal(
    getEditPageHref(project, source, path.resolve('outside.md')),
    undefined
  )
  for (const editPage of [undefined, false]) {
    assert.equal(
      getEditPageHref(
        { rootDir, config: resolveConfig({ metadata, editPage }) },
        source,
        file
      ),
      undefined
    )
  }
  for (const baseUrl of [
    'javascript:alert(1)',
    'https://user@example.com/edit/main',
    'https://example.com/edit/main?ref=main',
  ]) {
    assert.throws(
      () => resolveConfig({ metadata, editPage: { baseUrl } }),
      /editPage\.baseUrl/
    )
  }
})

test('configuration defaults and legacy runtime config objects remain usable', () => {
  const input = { metadata: { applicationName: 'RDX' } }
  assert.equal(defineConfig(input), input)
  assert.deepEqual(resolveConfig(input), {
    metadata: { applicationName: 'RDX' },
    TOC: false,
    search: false,
    description: '',
    lang: 'en',
    theme: { defaultTheme: 'system' },
    plugins: [],
  })
})

test('numbered source names order the sidebar without becoming route segments', async (t) => {
  const root = await fixture(t)
  const docsDir = path.join(root, 'docs')
  const category = path.join(docsDir, '02-getting-started')
  await mkdir(path.join(category, '01-details'), { recursive: true })
  await writeFile(
    path.join(category, '08-install.mdx'),
    '---\ntitle: Install the framework\nnavTitle: Install\nhighlighting: important\norder: 0\nlink_position: 99\n---\nInstall the package.'
  )
  await writeFile(path.join(category, '01-intro.md'), 'Introduction')
  const detail = path.join(category, '01-details', '03-config.md')
  await writeFile(detail, 'Configuration details')

  const [first] = getDocsIndex({ docsDir })
  assert.equal(first.title, 'Getting Started')
  assert.deepEqual(
    first.pages.map((page) => page.slug),
    [
      'getting-started/install',
      'getting-started/intro',
      'getting-started/details/config',
    ]
  )
  assert.equal(first.pages[0].title, 'Install the framework')
  assert.equal(first.pages[0].navTitle, 'Install')
  assert.equal(first.pages[0].highlighting, 'important')
  assert.equal(first.pages[1].highlighting, undefined)
  assert.equal(first.pages[1].navTitle, undefined)
  assert.equal(
    getDocument('getting-started/details/config', { docsDir }).sourcePath,
    detail
  )

  const translated = path.join(root, 'locale/ptbr/docs')
  const translatedCategory = path.join(translated, '04-getting-started')
  await mkdir(translatedCategory, { recursive: true })
  const translatedIntro = path.join(translatedCategory, '03-intro.md')
  await writeFile(
    translatedIntro,
    '---\nnavTitle: Introdução\nhighlighting: new\n---\nTexto em português.'
  )
  const options = { docsDir: translated, fallbackDocsDir: docsDir }
  const [localized] = getDocsIndex(options)
  assert.equal(localized.pages[1].navTitle, 'Introdução')
  assert.equal(localized.pages[1].highlighting, 'new')
  assert.equal(
    getDocument('getting-started/intro', options).sourcePath,
    translatedIntro
  )
  assert.equal(
    getDocument('getting-started/details/config', options).sourcePath,
    detail
  )
  const resolveLink = createDocumentLinkResolver({
    sourceRoot: translated,
    sourcePath: translatedIntro,
    virtualPaths: true,
    documents: localized.pages,
  })
  assert.equal(
    resolveLink('./01-details/03-config.md'),
    '/docs/getting-started/details/config'
  )

  await writeFile(path.join(category, '99-intro.mdx'), 'Collision')
  assert.throws(
    () => getDocsIndex({ docsDir }),
    /Duplicate documentation route "getting-started\/intro"/
  )
  assert.throws(
    () => getDocument('getting-started/intro', { docsDir }),
    /Duplicate documentation route/
  )
})

test('historical prefixes resolve content but do not multiply static pages, and reject unsafe redirect targets', async (t) => {
  const rootDir = await fixture(t)
  const source = {
    id: 'release',
    label: '1.1.0',
    routePrefix: '1.1.0',
    docsDir: 'docs',
  }
  const alias = {
    id: 'old',
    label: '1.0.0',
    routePrefix: '1.0.0',
    docsDir: 'docs',
    redirectTo: '1.1.0',
  }
  const input = (entries) => ({
    metadata: { applicationName: 'Test' },
    plugins: [
      { name: 'releases', apiVersion: 1, setup: () => ({ sources: entries }) },
    ],
  })
  const project = await createRdxProject(input([source, alias]), { rootDir })
  assert.deepEqual(getProjectDocsPaths(project), [
    'guides/intro',
    '1.1.0/guides/intro',
  ])
  assert.equal(
    resolveDocsRoute(project, ['1.0.0', 'guides', 'intro']).source.redirectTo,
    '1.1.0'
  )
  for (const redirectTo of ['missing', '1.0.0', '../outside', 3]) {
    await assert.rejects(
      createRdxProject(input([source, { ...alias, redirectTo }]), { rootDir }),
      /redirectTo/
    )
  }
  await assert.rejects(
    createRdxProject(input([source, { ...alias, docsDir: 'other' }]), {
      rootDir,
    }),
    /redirectTo/
  )
})

test('docsDir is rejected even when it repeats the fixed docs/ convention', () => {
  for (const docsDir of ['docs', 'content', '..', undefined])
    assert.throws(
      () => resolveConfig({ metadata: { applicationName: 'Docs' }, docsDir }),
      /docsDir is not configurable.*docs\//
    )
})

test('TOC is opt-in and accepts only booleans', () => {
  assert.equal(
    resolveConfig({ metadata: { applicationName: 'Docs' } }).TOC,
    false
  )
  for (const TOC of [true, false])
    assert.equal(
      resolveConfig({ metadata: { applicationName: 'Docs' }, TOC }).TOC,
      TOC
    )
  for (const TOC of ['false', 0, 1, null, {}])
    assert.throws(
      () => resolveConfig({ metadata: { applicationName: 'Docs' }, TOC }),
      /TOC must be a boolean/
    )
})

test('search is opt-in and accepts only booleans', () => {
  assert.equal(
    resolveConfig({ metadata: { applicationName: 'Docs' } }).search,
    false
  )
  for (const search of [true, false])
    assert.equal(
      resolveConfig({ metadata: { applicationName: 'Docs' }, search }).search,
      search
    )
  for (const search of ['true', 1, null, {}, []])
    assert.throws(
      () => resolveConfig({ metadata: { applicationName: 'Docs' }, search }),
      /search must be a boolean/
    )
})

test('invalid options fail with the exact configuration field', () => {
  for (const [input, field] of [
    [{}, 'metadata'],
    [
      { metadata: { applicationName: 'Docs' }, docsDirectory: 'content' },
      'docsDirectory',
    ],
    [
      {
        metadata: { applicationName: 'Docs' },
        theme: { defaultTheme: ['dark'] },
      },
      'theme.defaultTheme',
    ],
    [
      {
        metadata: { applicationName: 'Docs' },
        navbar: {
          actions: { github: { visible: 'yes', url: 'https://github.com' } },
        },
      },
      'github.visible',
    ],
    [
      {
        metadata: { applicationName: 'Docs' },
        navbar: {
          actions: { github: { visible: true, url: 'javascript:alert(1)' } },
        },
      },
      'github.url',
    ],
    [
      { metadata: { applicationName: 'Docs' }, plugins: ['not-a-plugin'] },
      'plugins[0]',
    ],
  ])
    assert.throws(
      () => resolveConfig(input),
      (error) =>
        error.name === 'RdxConfigError' && error.message.includes(field)
    )
})

test('GitHub accepts only HTTP(S) URLs or the explicit placeholder', () => {
  for (const url of [
    '#',
    'https://github.com/lexibase/rdx',
    'http://localhost:3000',
  ]) {
    const config = resolveConfig({
      metadata: { applicationName: 'Docs' },
      navbar: {
        actions: { github: { visible: true, url }, showToggleMode: true },
      },
    })
    assert.equal(config.navbar.actions.github.url, url)
    assert.equal(config.navbar.actions.showToggleMode, true)
  }
  for (const url of [
    '#repository',
    '/repo',
    '//example.com',
    'javascript:alert(1)',
    'https://',
    '',
  ])
    assert.throws(
      () =>
        resolveConfig({
          metadata: { applicationName: 'Docs' },
          navbar: { actions: { github: { visible: true, url } } },
        }),
      /github.url/
    )
})

test('homepage is opt-in and validates labels, nested options and safe button URLs', () => {
  assert.equal(
    resolveConfig({ metadata: { applicationName: 'Docs' } }).homepage,
    undefined
  )
  const homepage = {
    enabled: true,
    title: 'Welcome',
    description: '',
    buttons: [
      { label: 'Docs', href: '/docs' },
      { label: 'Source', href: 'https://github.com/lexibase/rdx' },
    ],
  }
  assert.deepEqual(
    resolveConfig({ metadata: { applicationName: 'Docs' }, homepage }).homepage,
    homepage
  )
  assert.equal(
    resolveConfig({
      metadata: { applicationName: 'Docs' },
      homepage: { enabled: false },
    }).homepage.enabled,
    false
  )
  for (const homepage of [
    null,
    { enabled: 'yes' },
    { title: '' },
    { extra: true },
    { buttons: {} },
    { buttons: [{ label: '', href: '/docs' }] },
    ...[
      'javascript:alert(1)',
      '//evil.test',
      '/\\evil.test',
      'https://',
      '/docs\n',
      'relative',
    ].map((href) => ({ buttons: [{ label: 'Go', href }] })),
  ])
    assert.throws(
      () => resolveConfig({ metadata: { applicationName: 'Docs' }, homepage }),
      /homepage/
    )
})

test('project-owned homepage and navbar components are preserved without executing them', () => {
  const Home = () => {
    throw new Error('must not execute during validation')
  }
  const Logo = () => null
  const config = resolveConfig({
    metadata: { applicationName: 'Docs' },
    homepage: { enabled: true, component: Home },
    navbar: { logo: Logo, actions: { showToggleMode: true } },
  })
  assert.equal(config.homepage.component, Home)
  assert.equal(config.navbar.logo, Logo)
  for (const input of [
    { homepage: { component: './home.tsx' } },
    {
      homepage: {
        component: { $$typeof: Symbol.for('react.transitional.element') },
      },
    },
    { navbar: { logo: 'logo.svg' } },
    { navbar: { actions: { showToggleMode: 'yes' } } },
  ])
    assert.throws(
      () => resolveConfig({ metadata: { applicationName: 'Docs' }, ...input }),
      /homepage.component|navbar.logo|showToggleMode/
    )
})

test('plain projects ignore versions.json and always read live content from docs/', async (t) => {
  const rootDir = await fixture(t)
  await mkdir(path.join(rootDir, 'content'), { recursive: true })
  await writeFile(
    path.join(rootDir, 'content/ignored.mdx'),
    'Not live documentation'
  )
  await writeFile(path.join(rootDir, 'versions.json'), 'not even json')
  const project = await createRdxProject(
    { metadata: { applicationName: 'Docs' } },
    { rootDir, command: 'prepare' }
  )
  assert.deepEqual(getProjectDocsPaths(project), ['guides/intro'])
  assert.equal(project.sources[0].docsDir, 'docs')
  assert.equal(
    resolveDocsRoute(project, ['guides', 'intro']).document.content.trim(),
    'Live documentation'
  )
  assert.equal(
    await readFile(path.join(rootDir, 'versions.json'), 'utf8'),
    'not even json'
  )
  assert.equal(project.commands.length, 0)
  assert.equal(project.sources.length, 1)
  assert.deepEqual(project.runtimeFiles, [])
})

test('plugins declare project-relative runtime files without needing to add a content source', async (t) => {
  const rootDir = await fixture(t)
  const plugin = (runtimeFiles) => ({
    name: 'files',
    apiVersion: 1,
    setup: () => ({ runtimeFiles }),
  })
  const project = await createRdxProject(
    {
      metadata: { applicationName: 'Files' },
      plugins: [plugin(['meta/manifest.json', 'meta/manifest.json'])],
    },
    { rootDir }
  )
  assert.deepEqual(project.runtimeFiles, [path.join('meta', 'manifest.json')])
  for (const runtimeFiles of [
    'manifest.json',
    [null],
    ['../outside.json'],
    ['.'],
    [rootDir],
  ]) {
    await assert.rejects(
      createRdxProject(
        {
          metadata: { applicationName: 'Files' },
          plugins: [plugin(runtimeFiles)],
        },
        { rootDir }
      ),
      /runtimeFiles/
    )
  }
})

test('plugin hooks run in order and contribute generic content sources', async (t) => {
  const rootDir = await fixture(t)
  const calls = []
  await mkdir(path.join(rootDir, 'translated/guides'), { recursive: true })
  await writeFile(
    path.join(rootDir, 'translated/guides/intro.mdx'),
    'Translated documentation'
  )
  const project = await createRdxProject(
    {
      metadata: { applicationName: 'Docs' },
      plugins: [
        {
          name: 'first',
          apiVersion: 1,
          setup: async (context) => {
            calls.push(context.command)
            return {
              sources: [
                {
                  id: 'translation',
                  label: 'Portuguese',
                  docsDir: 'translated',
                  routePrefix: 'pt',
                },
              ],
            }
          },
        },
        {
          name: 'second',
          apiVersion: 1,
          setup: () => {
            calls.push('second')
          },
        },
      ],
    },
    { rootDir, command: 'build' }
  )
  assert.deepEqual(calls, ['build', 'second'])
  assert.deepEqual(getProjectDocsPaths(project), [
    'guides/intro',
    'pt/guides/intro',
  ])
  assert.equal(
    resolveDocsRoute(project, ['pt', 'guides', 'intro']).document.content,
    'Translated documentation'
  )
  assert.equal(resolveDocsRoute(project, ['..', 'secret']).document, null)
})

test('plugin routes cannot hide live documentation categories', async (t) => {
  const rootDir = await fixture(t)
  await assert.rejects(
    createRdxProject(
      {
        metadata: { applicationName: 'Docs' },
        plugins: [
          {
            name: 'conflicting',
            apiVersion: 1,
            setup: () => ({
              sources: [
                {
                  id: 'conflict',
                  label: 'Conflict',
                  docsDir: 'translated',
                  routePrefix: 'guides',
                },
              ],
            }),
          },
        ],
      },
      { rootDir, command: 'prepare' }
    ),
    /conflicts with live documentation/
  )
})

test('duplicate plugins, unsupported APIs, reserved commands, unsafe paths and sources fail', async (t) => {
  const rootDir = await fixture(t)
  const plugin = { name: 'fixture', apiVersion: 1 }
  for (const plugins of [
    [plugin, plugin],
    [{ ...plugin, apiVersion: 2 }],
    [
      {
        ...plugin,
        commands: [{ name: 'build', description: 'reserved', run() {} }],
      },
    ],
    [
      {
        ...plugin,
        commands: [{ name: 'add', description: 'reserved', run() {} }],
      },
    ],
    [
      {
        ...plugin,
        setup: () => ({
          sources: [
            {
              id: 'current',
              label: 'Duplicate',
              docsDir: 'content',
              routePrefix: 'duplicate',
            },
          ],
        }),
      },
    ],
    [
      {
        ...plugin,
        setup: () => ({
          sources: [
            {
              id: 'unsafe',
              label: 'Unsafe',
              docsDir: '../secret',
              routePrefix: 'safe',
            },
          ],
        }),
      },
    ],
  ])
    await assert.rejects(
      createRdxProject(
        { metadata: { applicationName: 'Docs' }, plugins },
        { rootDir }
      ),
      /Invalid rdx.config.ts/
    )
  await assert.rejects(
    createRdxProject(
      { metadata: { applicationName: 'Docs' }, docsDir: '..' },
      { rootDir }
    ),
    /docsDir/
  )
})

test('plugin route prefixes cannot hide a live Markdown page', async (t) => {
  const rootDir = await fixture(t)
  await writeFile(path.join(rootDir, 'docs/published.md'), '# Live page')
  await assert.rejects(
    createRdxProject(
      {
        metadata: { applicationName: 'Docs' },
        plugins: [
          {
            name: 'fixture',
            apiVersion: 1,
            setup: () => ({
              sources: [
                {
                  id: 'published',
                  label: 'Published',
                  docsDir: 'snapshot',
                  routePrefix: 'published',
                },
              ],
            }),
          },
        ],
      },
      { rootDir }
    ),
    /conflicts with live documentation/
  )
})

test('navbar logos accept public image URLs or React components and reject invalid paths', () => {
  for (const logo of [
    '/logo.png',
    '/images/logo.svg',
    '/images/brand%20mark.webp?v=2',
    '/logo.avif',
  ])
    assert.equal(
      resolveConfig({ metadata: { applicationName: 'Docs' }, navbar: { logo } })
        .navbar.logo,
      logo
    )
  for (const logo of [
    '',
    '/',
    '//example.com/logo.png',
    'https://example.com/logo.png',
    './logo.png',
    'logo.svg',
    '/images/logo.png\n',
    '/\\example.com/logo.png',
    null,
    { src: '/logo.png' },
  ])
    assert.throws(
      () =>
        resolveConfig({
          metadata: { applicationName: 'Docs' },
          navbar: { logo },
        }),
      /navbar.logo/
    )
})
