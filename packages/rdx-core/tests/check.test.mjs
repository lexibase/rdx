import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createRdxProject } from '../dist/index.js'
import {
  checkDocumentation,
  formatDocumentationCheck,
} from '../dist/check/index.js'

async function fixture(t, files, sources = []) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-check-'))
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true })
    fs.writeFileSync(path.join(rootDir, file), content)
  }
  return createRdxProject(
    {
      metadata: {
        applicationName: 'Docs',
        metadataBase: 'https://docs.example.com',
      },
      homepage: { enabled: true },
      search: true,
      plugins: sources.length
        ? [{ name: 'fixtures', apiVersion: 1, setup: () => ({ sources }) }]
        : [],
    },
    { rootDir, command: 'check' }
  )
}

test('valid static links, exact heading IDs, literal anchors and assets pass without requests, rendering or writes', async (t) => {
  const project = await fixture(t, {
    'docs/guides/intro.mdx': [
      '---',
      'title: Introduction',
      '---',
      '',
      "export const neverEvaluate = (() => { throw new Error('Do not execute MDX') })()",
      '',
      '# Introduction',
      '',
      '[Local](guide.mdx#setup-1)',
      '[Self](#introduction)',
      '[Named](#manual)',
      '<a id="manual" />',
      '[Reference][guide]',
      '![Logo][logo]',
      '[guide]: ./guide.mdx#caf%C3%A9-and-code-',
      '[logo]: /images/logo.svg',
      '[Download](../../downloads/file%20name.txt?download=1#anything)',
      '[Absolute](https://docs.example.com/docs/guides/guide#setup)',
      '[External](https://external.example.com/missing#section)',
      '[Mail](mailto:hello@example.com)',
      '[Home](/)',
      '[Robots](/robots.txt)',
      '[Search](/rdx-search/_)',
      '```md',
      '[Example](missing.mdx)',
      '![Example](/missing.png)',
      '```',
    ].join('\n'),
    'docs/guides/guide.mdx':
      '## Setup\n\n## Setup\n\n## **Café** and `code` ![alt](/images/logo.svg)\n',
    'public/images/logo.svg': '<svg/>',
    'public/downloads/file name.txt': 'Download',
  })
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Do not request URLs')
  })
  const before = fs.readdirSync(project.rootDir, { recursive: true })
  const report = checkDocumentation(project)
  assert.deepEqual(report, { checkedPages: 2, diagnostics: [] })
  assert.equal(
    formatDocumentationCheck(report),
    'RDX check passed: 2 pages checked, 0 problems.'
  )
  assert.deepEqual(fs.readdirSync(project.rootDir, { recursive: true }), before)
})

test('all broken references are reported with original frontmatter-aware locations and public boundaries', async (t) => {
  const project = await fixture(t, {
    'docs/guides/intro.mdx':
      '---\ntitle: Intro\n---\n\n[Missing](missing.mdx)\n\n[Section](guide.mdx#missing)\n\n![Image](/images/missing.png)\n\n[Private](/../private.txt)\n\n[Route](/docs/not-a-page)\n',
    'docs/guides/guide.mdx': '## Setup\n',
    'private.txt': 'Not a public asset',
  })
  const report = checkDocumentation(project)
  assert.equal(report.checkedPages, 2)
  assert.deepEqual(
    report.diagnostics.map(({ file, line, column, code }) => ({
      file,
      line,
      column,
      code,
    })),
    [
      [5, 'page'],
      [7, 'anchor'],
      [9, 'asset'],
      [11, 'asset'],
      [13, 'page'],
    ].map(([line, code]) => ({
      file: 'docs/guides/intro.mdx',
      line,
      column: 1,
      code,
    }))
  )
  assert.match(formatDocumentationCheck(report), /5 problems/)
  assert.match(
    formatDocumentationCheck(report),
    /docs\/guides\/intro.mdx:7:1 \[anchor\]/
  )
})

test('each edition has its own headings and relative targets; historical redirects are resolved without rechecking snapshots', async (t) => {
  const project = await fixture(
    t,
    {
      'docs/guides/intro.mdx':
        '[Live](guide.mdx#live)\n[Snapshot](/docs/1.0.0/guides/guide#published)\n[Alias](/docs/0.9.0/guides/guide#published)',
      'docs/guides/guide.mdx': '## Live',
      'snapshots/guides/intro.mdx': '[Snapshot](guide.mdx#published)',
      'snapshots/guides/guide.mdx': '## Published',
    },
    [
      {
        id: 'snapshot',
        label: '1.0.0',
        routePrefix: '1.0.0',
        docsDir: 'snapshots',
        badge: 'Archived',
      },
      {
        id: 'alias',
        label: '0.9.0',
        routePrefix: '0.9.0',
        docsDir: 'snapshots',
        redirectTo: '1.0.0',
      },
    ]
  )
  assert.deepEqual(checkDocumentation(project), {
    checkedPages: 4,
    diagnostics: [],
  })
  fs.appendFileSync(
    path.join(project.rootDir, 'snapshots/guides/intro.mdx'),
    '\n[Wrong edition](guide.mdx#live)'
  )
  const report = checkDocumentation(project)
  assert.equal(report.diagnostics.length, 1)
  assert.equal(report.diagnostics[0].file, 'snapshots/guides/intro.mdx')
  assert.equal(report.diagnostics[0].code, 'anchor')
})

test('syntax and frontmatter errors do not hide unrelated link errors or produce false missing-page errors', async (t) => {
  const project = await fixture(t, {
    'docs/bad-frontmatter.mdx': '---\ntitle: [invalid\n---\nHello',
    'docs/bad-mdx.mdx': '<Broken',
    'docs/good.mdx':
      '[Broken target exists](bad-mdx.mdx#heading)\n![Missing](/missing.png)',
  })
  const report = checkDocumentation(project)
  assert.equal(report.checkedPages, 3)
  assert.deepEqual(report.diagnostics.map(({ code }) => code).sort(), [
    'asset',
    'syntax',
    'syntax',
  ])
})

test('Markdown component labels are not headings; nested headings and literal HTML links are checked', async (t) => {
  const project = await fixture(t, {
    'docs/intro.mdx':
      ':::tabs\n\n### pnpm\n\n## Inside\n\n[Inside](#inside)\n\n:::\n\n[Not a heading](#pnpm)\n\n<img src="/missing.png" />\n\n<a href="/docs/missing">Missing</a>\n',
  })
  const report = checkDocumentation(project)
  assert.deepEqual(
    report.diagnostics.map(({ code }) => code),
    ['anchor', 'asset', 'page']
  )
})

test('the check command name is reserved for the framework', async (t) => {
  const project = await fixture(t, {})
  await assert.rejects(
    createRdxProject(
      {
        metadata: { applicationName: 'Docs' },
        plugins: [
          {
            name: 'collision',
            apiVersion: 1,
            commands: [{ name: 'check', description: 'No', run() {} }],
          },
        ],
      },
      { rootDir: project.rootDir }
    ),
    /check/
  )
})

test('malformed paths and source escapes are reported; dynamic IDs and href expressions are not evaluated', async (t) => {
  const project = await fixture(t, {
    'docs/guide.mdx':
      '<span id={unknownId} />\n\n<a href={unknownHref}>Dynamic</a>\n\n[Unknown ID](#dynamic)\n\n[Escapes](../private.mdx)\n\n[Malformed](%E0%A4%A.mdx)',
    'private.mdx': '# Private',
  })
  const report = checkDocumentation(project)
  assert.equal(report.diagnostics.length, 2)
  assert.ok(report.diagnostics.every(({ code }) => code === 'page'))
  assert.match(
    formatDocumentationCheck(report),
    /escapes this documentation source/
  )
})

test('repeated checks retain frontmatter errors with YAML locations and never run executable frontmatter', async (t) => {
  const project = await fixture(t, {
    'docs/bad.mdx': '---\ntitle: Valid\nlist:\n  - item\nbroken: [\n---\nText',
    'docs/executable.mdx':
      '---js\n(() => { globalThis.__rdxCheckExecuted = true; return {} })()\n---\nText',
  })
  t.after(() => {
    delete globalThis.__rdxCheckExecuted
  })
  const first = checkDocumentation(project)
  assert.equal(first.diagnostics.length, 2)
  assert.equal(first.diagnostics[0].line, 6)
  assert.equal(first.diagnostics[0].column, 1)
  assert.match(first.diagnostics[1].message, /YAML or JSON/)
  assert.deepEqual(checkDocumentation(project), first)
  assert.equal(globalThis.__rdxCheckExecuted, undefined)
})

test('JSON frontmatter and BOM/CRLF files preserve static parsing and original line numbers', async (t) => {
  const project = await fixture(t, {
    'docs/data.mdx':
      '---json\n{"title":"Data"}\n---\n\n## JSON\n\n[Section](#json)',
    'docs/windows.mdx':
      '\uFEFF---\r\ntitle: Windows\r\n---\r\n\r\n[Missing](missing.mdx)',
  })
  const report = checkDocumentation(project)
  assert.equal(report.diagnostics.length, 1)
  assert.equal(report.diagnostics[0].file, 'docs/windows.mdx')
  assert.equal(report.diagnostics[0].line, 5)
  assert.equal(report.diagnostics[0].column, 1)
})
