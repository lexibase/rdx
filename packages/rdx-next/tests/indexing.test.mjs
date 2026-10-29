import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createJiti } from 'jiti'
import { resolveConfig } from '@lexibase/rdx-core'

const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false })
const { getSourceRobots, getRdxRobots, getRdxSitemap } = await jiti.import(
  '../src/runtime/indexing.ts'
)
const { getDocumentMetadata } = await jiti.import('../src/runtime/metadata.ts')
const { getSearchResponse } = await jiti.import('../src/runtime/search.ts')

function fixture(t, metadata = { metadataBase: 'https://docs.example.com' }) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-indexing-'))
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  for (const directory of ['docs', 'v2', 'v1']) {
    fs.mkdirSync(path.join(rootDir, directory, 'guides'), { recursive: true })
    fs.writeFileSync(
      path.join(rootDir, directory, 'guides/intro.mdx'),
      '---\ntitle: Introduction\n---\nHello'
    )
  }
  return {
    rootDir,
    config: resolveConfig({
      metadata: { applicationName: 'Docs', ...metadata },
      search: true,
    }),
    sources: [
      { id: 'current', label: 'Current', docsDir: 'docs', routePrefix: '' },
    ],
  }
}

test('plain sites index their documents, encode path segments and include only enabled homepages', (t) => {
  const project = fixture(t)
  fs.writeFileSync(
    path.join(project.rootDir, 'docs/guides/café & tips.mdx'),
    'Hello'
  )
  const urls = getRdxSitemap(project).map(({ url }) => url)
  assert.deepEqual(
    new Set(urls),
    new Set([
      'https://docs.example.com/docs/guides/intro',
      'https://docs.example.com/docs/guides/caf%C3%A9%20%26%20tips',
    ])
  )
  assert.deepEqual(
    getDocumentMetadata({ project, slug: ['guides', 'intro'] }).robots,
    { index: true, follow: true }
  )
  project.config.homepage = { enabled: true }
  assert.equal(getRdxSitemap(project)[0].url, 'https://docs.example.com/')
})

test('published and previous editions are indexed while live, archived and redirect sources stay out', (t) => {
  const project = fixture(t)
  project.sources.push(
    { id: 'v2', label: '2.1.0', docsDir: 'v2', routePrefix: '2.1.0' },
    { id: 'v1', label: '1.2.0', docsDir: 'v1', routePrefix: '1.2.0' },
    {
      id: 'archived',
      label: '0.9.0',
      docsDir: 'missing',
      routePrefix: '0.9.0',
      badge: 'Archived',
    },
    {
      id: 'alias',
      label: '2.0.0',
      docsDir: 'missing',
      routePrefix: '2.0.0',
      redirectTo: '2.1.0',
    }
  )
  assert.deepEqual(
    getRdxSitemap(project).map(({ url }) => url),
    [
      'https://docs.example.com/docs/2.1.0/guides/intro',
      'https://docs.example.com/docs/1.2.0/guides/intro',
    ]
  )
  assert.deepEqual(
    project.sources.map((source) => getSourceRobots(project, source).index),
    [false, true, true, false, false]
  )
  assert.deepEqual(
    getDocumentMetadata({ project, slug: ['guides', 'intro'] }).robots,
    { index: false, follow: true }
  )
  assert.deepEqual(
    getDocumentMetadata({ project, slug: ['2.1.0', 'guides', 'intro'] }).robots,
    { index: true, follow: true }
  )
  project.sources[1].badge = 'Archived'
  assert.equal(getSourceRobots(project, project.sources[1]).index, false)
  project.sources[2].badge = 'Archived'
  assert.equal(getSourceRobots(project, project.sources[0]).index, true)
})

test('robots allows reading noindex directives and advertises only the configured sitemap', (t) => {
  const project = fixture(t)
  assert.deepEqual(getRdxRobots(project.config), {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://docs.example.com/sitemap.xml',
  })
  const noDomain = fixture(t, {})
  noDomain.rootDir = '/missing'
  assert.deepEqual(getRdxSitemap(noDomain), [])
  assert.deepEqual(getRdxRobots(noDomain.config), {
    rules: { userAgent: '*', allow: '/' },
  })
})

test('search responses carry noindex headers without changing search availability', (t) => {
  const project = fixture(t)
  const response = getSearchResponse(project, '_')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow')
  project.config.search = false
  assert.equal(
    getSearchResponse(project, '_').headers.get('x-robots-tag'),
    'noindex, follow'
  )
})
