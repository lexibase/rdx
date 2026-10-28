import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchIndex } from '../dist/search/index.js'

test('search extracts readable MDX sections and stable duplicate/Unicode heading IDs without executing JavaScript', () => {
  globalThis.__rdxSearchExecuted = false
  const content = `import something from 'private-module'

Intro with **bold**, [a link](https://secret.example) and ![Helpful image](/private-image.svg).

{globalThis.__rdxSearchExecuted = true}

## Configuração

Configure the project.

<Callout title="Searchable note">

### Nested section

Literal content and \`inline code\`.

</Callout>

> ## Configuração

Duplicate inside a quote.

## Configuração

Final duplicate.

<script>secretScript()</script>
`
  const index = buildSearchIndex([
    {
      title: 'Guide',
      category: 'Basics',
      description: 'Description',
      href: '/docs/1.0.0/guide',
      content,
    },
  ])
  assert.equal(globalThis.__rdxSearchExecuted, false)
  delete globalThis.__rdxSearchExecuted
  assert.equal(index.schemaVersion, 1)
  assert.deepEqual(
    index.entries.map((entry) => entry.href),
    [
      '/docs/1.0.0/guide',
      '/docs/1.0.0/guide#configura%C3%A7%C3%A3o',
      '/docs/1.0.0/guide#nested-section',
      '/docs/1.0.0/guide#configura%C3%A7%C3%A3o-1',
      '/docs/1.0.0/guide#configura%C3%A7%C3%A3o-2',
    ]
  )
  assert.match(
    index.entries[0].text,
    /Description Intro with bold, a link and Helpful image/
  )
  assert.match(index.entries[2].text, /Literal content and inline code/)
  assert.doesNotMatch(
    JSON.stringify(index),
    /private-module|secret\.example|private-image|secretScript|__rdxSearchExecuted/
  )
})

test('search retains fenced code, tables and literal component content, but no configuration or filenames', () => {
  const index = buildSearchIndex([
    {
      title: 'API',
      category: 'Reference',
      href: '/docs/api',
      content:
        '## Usage\n\n```ts\nconst value = "<script>"\n```\n\n| Key | Value |\n| --- | --- |\n| config | enabled |\n\n<Tabs><TabsContent value="secret-attribute">Readable example</TabsContent></Tabs>',
    },
  ])
  assert.match(index.entries[1].text, /const value = "<script>"/)
  assert.match(index.entries[1].text, /config enabled/)
  assert.match(index.entries[1].text, /Readable example/)
  assert.doesNotMatch(
    JSON.stringify(index),
    /secret-attribute|sourcePath|frontmatter/
  )
  assert.deepEqual(buildSearchIndex([]), { schemaVersion: 1, entries: [] })
})

test('content in interactive panels is searchable without pointing at unmounted headings', () => {
  const index = buildSearchIndex([
    {
      title: 'Tabs',
      href: '/docs/tabs',
      category: 'Components',
      content:
        '## Example\n\n<TabsContent value="other">\n\n### Hidden\n\nSearchable hidden text.\n\n</TabsContent>\n\n## Hidden\n\nVisible text.',
    },
  ])
  assert.match(index.entries[1].text, /Hidden Searchable hidden text/)
  assert.equal(index.entries[2].href, '/docs/tabs#hidden-1')
  assert.equal(index.entries.length, 3)
})

test('natural Markdown components index labels and hidden content under reachable sections', () => {
  const index = buildSearchIndex([
    {
      title: 'Guide',
      category: 'Docs',
      href: '/docs/1.0/guide',
      content:
        '## Usage\n\n> [!TIP] Useful title\n> Press :kbd[Enter].\n\n:::tabs\n\n### pnpm\n\nFirst command\n\n### npm\n\n#### Hidden detail\n\nSecond command\n\n:::\n\n:::accordion\n\n### Question\n\nAnswer\n\n:::\n\n## Hidden detail\n\nVisible section',
    },
  ])
  assert.deepEqual(
    index.entries.map((entry) => entry.href),
    [
      '/docs/1.0/guide',
      '/docs/1.0/guide#usage',
      '/docs/1.0/guide#hidden-detail-1',
    ]
  )
  assert.match(index.entries[1].text, /Useful title Press Enter/)
  assert.match(
    index.entries[1].text,
    /pnpm npm First command Hidden detail Second command Question Answer/
  )
  assert.doesNotMatch(index.entries[1].text, /:::|\[!TIP\]|:kbd|item-1/)
})

test('disabled tab metadata and unreachable panels do not enter search or shift heading IDs', () => {
  const index = buildSearchIndex([
    {
      title: 'Guide',
      href: '/docs/guide',
      category: 'Docs',
      content:
        '## Commands\n\n:::tabs\n\n### npm {disabled}\n\n#### Hidden\n\nUnavailable command\n\n### pnpm\n\npnpm dev\n\n:::\n\n## Hidden\n\nVisible text',
    },
  ])
  assert.match(index.entries[1].text, /npm pnpm pnpm dev/)
  assert.doesNotMatch(JSON.stringify(index), /disabled|Unavailable command/)
  assert.equal(index.entries[2].href, '/docs/guide#hidden')
})
