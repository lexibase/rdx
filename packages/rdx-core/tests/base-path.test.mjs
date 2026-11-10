import assert from 'node:assert/strict'
import test from 'node:test'

import { defineConfig, withBasePath } from '../dist/index.js'

test('the deployment prefix applies once to app-relative paths, including root links', () => {
  assert.equal(withBasePath('/', '/tool'), '/tool')
  assert.equal(withBasePath('/?q=1#top', '/tool'), '/tool?q=1#top')
  assert.equal(
    withBasePath('/docs?lang=pt#top', '/tool'),
    '/tool/docs?lang=pt#top'
  )
  assert.equal(withBasePath('/docs', '/docs'), '/docs/docs')
  for (const href of [
    '//example.com/image.png',
    'https://example.com/docs',
    'mailto:help@example.com',
    '#heading',
    '?q=1',
    './next.md',
  ])
    assert.equal(withBasePath(href, '/tool'), href)
  assert.equal(withBasePath('/docs'), '/docs')
})

test('basePath accepts URL-safe path segments and rejects unsafe prefixes', () => {
  const config = { metadata: { applicationName: 'Docs' } }
  assert.equal(defineConfig(config).basePath, undefined)
  assert.equal(
    defineConfig({ ...config, basePath: '/tools/my-tool' }).basePath,
    '/tools/my-tool'
  )
  for (const basePath of [
    '',
    'tool',
    '/',
    '/tool/',
    '//tool',
    '/tool/../docs',
    '/.',
    '/tool?x=1',
    '/tool#top',
    '/tool\\docs',
    '/bad path',
    1,
  ])
    assert.throws(
      () => defineConfig({ ...config, basePath }),
      /basePath must start with/
    )
})
