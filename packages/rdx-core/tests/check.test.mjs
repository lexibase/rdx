import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createRdxProject,
  getDocument,
  getDocsIndex,
  getRelatedDocumentLinks,
} from '../dist/index.js'
import {
  checkDocumentation,
  formatDocumentationCheck,
} from '../dist/check/index.js'

async function fixture(t, files, sources = [], plugins = []) {
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
      plugins: [
        ...plugins,
        ...(sources.length
          ? [{ name: 'fixtures', apiVersion: 1, setup: () => ({ sources }) }]
          : []),
      ],
    },
    { rootDir, command: 'check' }
  )
}

test('page redirects resolve links and reject duplicate, occupied, and invalid aliases', async (t) => {
  const project = await fixture(t, {
    'docs/install.md':
      '---\nredirectFrom: [/docs/old, /docs/other]\n---\n## Setup\n',
    'docs/other.md': '[Old setup](/docs/old#setup)',
    'docs/z-duplicate.md': '---\nredirectFrom: [/docs/old]\n---\n',
    'docs/invalid.md': '---\nredirectFrom: [https://example.com]\n---\n',
  })
  const { diagnostics } = checkDocumentation(project)
  assert.equal(diagnostics.length, 3)
  assert.ok(
    diagnostics.some(({ message }) => /\/docs\/old.*conflicts/.test(message))
  )
  assert.ok(
    diagnostics.some(({ message }) => /\/docs\/other.*conflicts/.test(message))
  )
  assert.ok(
    diagnostics.some(({ message }) => /redirectFrom\[0\] must be/.test(message))
  )
})

test('unlinked pages warn without failing and valid content links count through aliases', async (t) => {
  const project = await fixture(t, {
    'docs/start.md':
      '---\norder: 1\nrelated: [./related.md]\nprerequisites: [./setup.md]\n---\n[Guide](/docs/old-guide)\n',
    'docs/guide.md': '---\nredirectFrom: [/docs/old-guide]\n---\n',
    'docs/related.md': '## Related',
    'docs/setup.md': '## Setup',
    'docs/alone.md': '## Alone\n\n[This page](./alone.md#alone)',
  })
  const report = checkDocumentation(project)
  assert.deepEqual(report.diagnostics, [])
  assert.deepEqual(
    report.warnings.map(({ file, code }) => [file, code]),
    [['docs/alone.md', 'unlinked']]
  )
  assert.match(
    formatDocumentationCheck(report),
    /RDX check passed: 5 pages checked, 0 problems, 1 warning\./
  )
})

test('related documents and prerequisites use relative links and report broken destinations', async (t) => {
  const project = await fixture(t, {
    'docs/intro.mdx':
      '---\nrelated: [./01-guides/install.md, ./missing.md]\n---\n',
    'docs/01-guides/install.md':
      '---\ntitle: Installation\nnavTitle: Install\n---\n',
    'docs/invalid.md': '---\nrelated: [/docs/intro]\n---\n',
    'docs/prerequisites.md':
      '---\nprerequisites: [./01-guides/install.md, ./missing.md]\n---\n',
  })
  const docsDir = path.join(project.rootDir, 'docs')
  const pages = getDocsIndex({ docsDir }).flatMap(({ pages }) => pages)
  assert.deepEqual(
    getRelatedDocumentLinks(
      ['./01-guides/install.md', './intro.mdx', './01-guides/install.md'],
      {
        sourceRoot: docsDir,
        sourcePath: path.join(docsDir, 'intro.mdx'),
        documents: pages,
      },
      'intro',
      (page) => `/pt-br/docs/1.0.0/${page.slug}`
    ),
    [{ href: '/pt-br/docs/1.0.0/guides/install', label: 'Install' }]
  )
  const { diagnostics } = checkDocumentation(project)
  assert.equal(diagnostics.length, 3)
  assert.match(diagnostics[0].message, /related\[1\].*missing\.md/)
  assert.match(diagnostics[1].message, /related\[0\].*relative/)
  assert.match(diagnostics[2].message, /prerequisites\[1\].*missing\.md/)
})

test('checks release links, anchors and public assets when changelog is active', async (t) => {
  const project = await fixture(
    t,
    {
      'docs/guides/install.md': '## Setup\n\n[Release](/changelog#v1.0.0)\n',
      'public/downloads/setup.zip': '',
      'changelog/1.0.0.mdx': [
        '---',
        "version: '1.0.0'",
        "date: '2026-11-13'",
        'title: First release',
        'links:',
        '  - label: Guide',
        '    href: /docs/guides/install#setup',
        '  - label: Missing guide',
        '    href: /docs/guides/missing',
        '---',
        '',
        '## Changes',
        '[This note](#changes) [Release](#v1.0.0)',
        '[Download](/downloads/setup.zip) [Feed](/changelog/rss.xml)',
        '[External](https://example.com/not-checked)',
        '[Section](/docs/guides/install#missing)',
        '![Image](/images/missing.png)',
        '[Release](#v2.0.0)',
      ].join('\n'),
      'changelog/broken.md': '---\ntitle: Incomplete\n---\n',
    },
    [],
    [{ name: '@lexibase/rdx-changelog', apiVersion: 1 }]
  )
  const report = checkDocumentation(project)
  assert.equal(report.checkedPages, 2)
  assert.deepEqual(
    report.diagnostics.map(({ file, line, code }) => [file, line, code]),
    [
      ['changelog/1.0.0.mdx', 1, 'page'],
      ['changelog/1.0.0.mdx', 16, 'anchor'],
      ['changelog/1.0.0.mdx', 17, 'asset'],
      ['changelog/1.0.0.mdx', 18, 'anchor'],
      ['changelog/broken.md', 1, 'syntax'],
    ]
  )
  assert.match(
    report.diagnostics[0].message,
    /links\[1\]\.href.*\/docs\/guides\/missing/
  )
})

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
      '## Setup\n\n## Setup\n\n## **Café** and `code` ![alt](/images/logo.svg)\n\n[Intro](./intro.mdx)\n',
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
  const initial = checkDocumentation(project)
  assert.equal(initial.checkedPages, 4)
  assert.deepEqual(initial.diagnostics, [])
  assert.deepEqual(
    initial.warnings.map(({ file }) => file),
    ['docs/guides/intro.mdx']
  )
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

test('the documentation index and page loader reject executable frontmatter', async (t) => {
  const project = await fixture(t, {
    'docs/executable.mdx':
      '\uFEFF---JaVaScRiPt\r\n(() => { globalThis.__rdxFrontmatterExecuted = true; return {} })()\r\n---\r\nText',
  })
  t.after(() => {
    delete globalThis.__rdxFrontmatterExecuted
  })
  const options = { docsDir: path.join(project.rootDir, 'docs') }
  assert.throws(() => getDocsIndex(options), /YAML or JSON frontmatter/)
  assert.throws(
    () => getDocument('executable', options),
    /YAML or JSON frontmatter/
  )
  assert.equal(globalThis.__rdxFrontmatterExecuted, undefined)
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

test('mixed Markdown and MDX pages share routes, anchors and static validation', async (t) => {
  const project = await fixture(t, {
    'docs/guides/intro.md':
      '---\ntitle: Intro\n---\n## Literal {value}\n\n[Guide](guide.mdx#setup)\n\n> [!TIP]\n> Press :kbd[Enter].\n\n:::tabs\n### pnpm\npnpm dev\n### npm\nnpm run dev\n:::',
    'docs/guides/guide.mdx': '## Setup\n\n[Intro](intro.md#literal-value)',
  })
  const { getDocument, getDocsPaths } = await import('../dist/index.js')
  const options = { docsDir: path.join(project.rootDir, 'docs') }
  assert.deepEqual(
    new Set(getDocsPaths(options)),
    new Set(['guides/intro', 'guides/guide'])
  )
  assert.match(getDocument('guides/intro', options).sourcePath, /intro\.md$/)
  assert.deepEqual(checkDocumentation(project).diagnostics, [])
  fs.appendFileSync(
    path.join(project.rootDir, 'docs/guides/intro.md'),
    '\n[Missing](missing.md)\n[Missing section](guide.mdx#absent)'
  )
  assert.deepEqual(
    checkDocumentation(project).diagnostics.map(({ code }) => code),
    ['page', 'anchor']
  )
})

test('duplicate Markdown and MDX slugs fail reads and produce actionable check diagnostics', async (t) => {
  const project = await fixture(t, {
    'docs/intro.md': '# Markdown',
    'docs/intro.mdx': '# MDX',
  })
  const { getDocument, getDocsIndex } = await import('../dist/index.js')
  const options = { docsDir: path.join(project.rootDir, 'docs') }
  assert.throws(
    () => getDocsIndex(options),
    /Duplicate documentation route "intro"/
  )
  assert.throws(
    () => getDocument('intro', options),
    /Duplicate documentation route "intro"/
  )
  assert.ok(
    checkDocumentation(project).diagnostics.some(({ message }) =>
      /intro\.md.*intro\.mdx/.test(message)
    )
  )
})

test('configured logo assets are checked without executing React components', async (t) => {
  const project = await fixture(t, {
    'docs/intro.md': 'Welcome',
    'public/images/brand mark.svg': '<svg />',
  })
  project.config.navbar = { logo: '/images/brand%20mark.svg?v=2' }
  assert.deepEqual(checkDocumentation(project).diagnostics, [])
  project.config.navbar.logo = '/images/missing.png'
  const report = checkDocumentation(project)
  assert.equal(report.diagnostics.length, 1)
  assert.equal(report.diagnostics[0].file, 'rdx.config.ts')
  assert.equal(report.diagnostics[0].code, 'asset')
  assert.match(report.diagnostics[0].message, /navbar.logo.*missing\.png/)
  project.config.navbar.logo = () => {
    throw new Error('Do not execute components')
  }
  assert.deepEqual(checkDocumentation(project).diagnostics, [])
})
