import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSearchIndex } from '@lexibase/rdx-core/search'

const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false })
const { prepareSearch, searchDocumentation } = await jiti.import(
  '../../rdx-ui/src/lib/docs-search.ts'
)
const { getSearchSources, getSearchResponse } = await jiti.import(
  '../src/runtime/search.ts'
)
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')

test('indexed section fragments exactly match the shared MDX renderer heading IDs', async () => {
  const content =
    '## Configuração\n\n## Configuração\n\n## Hello ![image label](/logo.svg)\n\n## **Bold** and `code`\n\n## Text <span>inside JSX</span>\n'
  const compiled = await compileDocumentation(content, {})
  const ids = [
    ...renderToStaticMarkup(compiled.content).matchAll(
      /<h[1-6][^>]*\bid="([^"]+)"/g
    ),
  ].map((match) => match[1])
  const entries = buildSearchIndex([
    { title: 'Headings', category: 'Test', href: '/docs/test', content },
  ]).entries.slice(1)
  assert.deepEqual(
    entries.map((entry) => decodeURIComponent(entry.href.split('#')[1])),
    ids
  )
})

function entry(title, section, text, href = '/docs/test') {
  return { title, section, text, href, category: 'Guides' }
}

test('search ranks titles/sections before body text, ignores accents/case and requires every query term', () => {
  const prepared = prepareSearch({
    schemaVersion: 1,
    entries: [
      entry('Other', '', 'Configuração', '/docs/body'),
      entry('Configuração', '', 'Project settings', '/docs/title'),
      entry('Settings', 'Configuração', 'Other settings', '/docs/section'),
    ],
  })
  assert.deepEqual(
    searchDocumentation(prepared, 'CONFIGURACAO').map((result) => result.href),
    ['/docs/title', '/docs/section', '/docs/body']
  )
  assert.equal(searchDocumentation(prepared, 'configuracao project').length, 1)
  assert.equal(searchDocumentation(prepared, 'nothing matches').length, 0)
  assert.equal(searchDocumentation(prepared, '  ').length, 0)
})

test('search bounds results and excerpts, validates its payload and rejects external navigation', () => {
  const prepared = prepareSearch({
    schemaVersion: 1,
    entries: Array.from({ length: 30 }, (_, i) =>
      entry(
        `Page ${i}`,
        '',
        'start '.repeat(80) + 'needle ' + 'end '.repeat(80),
        `/docs/${i}`
      )
    ),
  })
  const results = searchDocumentation(prepared, 'needle')
  assert.equal(results.length, 12)
  assert.ok(
    results.every(
      (result) =>
        result.excerpt.includes('needle') && result.excerpt.length <= 172
    )
  )
  assert.throws(() => prepareSearch({ schemaVersion: 2, entries: [] }))
  for (const href of [
    'javascript:alert(1)',
    '//external.test',
    'https://external.test',
    '/rdx.config.ts',
  ])
    assert.throws(() =>
      prepareSearch({
        schemaVersion: 1,
        entries: [entry('Unsafe', '', 'body', href)],
      })
    )
})

test('disabled search and unknown sources return 404 without indexing or touching nonexistent docs', () => {
  const project = {
    config: { search: false },
    rootDir: '/does-not-exist',
    sources: [{ id: 'current', routePrefix: '', docsDir: 'docs' }],
  }
  assert.deepEqual(getSearchSources(project), [])
  assert.equal(getSearchResponse(project, '_').status, 404)
  project.config.search = true
  assert.deepEqual(getSearchSources(project), [{ source: '_' }])
  for (const source of ['../docs', 'missing', 'current'])
    assert.equal(getSearchResponse(project, source).status, 404)
})
