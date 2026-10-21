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
  await mkdir(path.join(rootDir, 'content/guides'), { recursive: true })
  await writeFile(
    path.join(rootDir, 'content/guides/intro.mdx'),
    '---\ntitle: Intro\n---\nLive documentation'
  )
  return rootDir
}

test('configuration defaults and legacy runtime config objects remain usable', () => {
  const input = { title: 'RDX' }
  assert.equal(defineConfig(input), input)
  assert.deepEqual(resolveConfig(input), {
    title: 'RDX',
    description: '',
    docsDir: 'docs',
    lang: 'en',
    theme: { defaultTheme: 'system' },
    plugins: [],
  })
})

test('invalid options fail with the exact configuration field', () => {
  for (const [input, field] of [
    [{}, 'title'],
    [{ title: 'Docs', docsDirectory: 'content' }, 'docsDirectory'],
    [
      { title: 'Docs', theme: { defaultTheme: ['dark'] } },
      'theme.defaultTheme',
    ],
    [
      {
        title: 'Docs',
        navbar: {
          actions: { github: { visible: 'yes', url: 'https://github.com' } },
        },
      },
      'github.visible',
    ],
    [
      {
        title: 'Docs',
        navbar: {
          actions: { github: { visible: true, url: 'javascript:alert(1)' } },
        },
      },
      'github.url',
    ],
    [{ title: 'Docs', plugins: ['not-a-plugin'] }, 'plugins[0]'],
  ])
    assert.throws(
      () => resolveConfig(input),
      (error) =>
        error.name === 'RdxConfigError' && error.message.includes(field)
    )
})

test('homepage is opt-in and validates labels, nested options and safe button URLs', () => {
  assert.equal(resolveConfig({ title: 'Docs' }).homepage, undefined)
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
    resolveConfig({ title: 'Docs', homepage }).homepage,
    homepage
  )
  assert.equal(
    resolveConfig({ title: 'Docs', homepage: { enabled: false } }).homepage
      .enabled,
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
    assert.throws(() => resolveConfig({ title: 'Docs', homepage }), /homepage/)
})

test('plain projects ignore versions.json and use configured docsDir', async (t) => {
  const rootDir = await fixture(t)
  await writeFile(path.join(rootDir, 'versions.json'), 'not even json')
  const project = await createRdxProject(
    { title: 'Docs', docsDir: 'content' },
    { rootDir, command: 'prepare' }
  )
  assert.deepEqual(getProjectDocsPaths(project), ['guides/intro'])
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
      title: 'Docs',
      docsDir: 'content',
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
        title: 'Docs',
        docsDir: 'content',
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
      createRdxProject({ title: 'Docs', plugins }, { rootDir }),
      /Invalid rdx.config.ts/
    )
  await assert.rejects(
    createRdxProject({ title: 'Docs', docsDir: '..' }, { rootDir }),
    /docsDir/
  )
})
