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
} from '../dist/index.js'

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
