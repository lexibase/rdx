import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import * as core from '@lexibase/rdx-core'
import * as config from '@lexibase/rdx-core/config'
import * as mdx from '@lexibase/rdx-core/mdx'
import * as search from '@lexibase/rdx-core/search'
import * as runtimeConfig from '../dist/index.js'

test('published server entry points preserve the documented public API without loading a Next server', () => {
  for (const name of [
    'getDocument',
    'getDocsIndex',
    'getDocsPaths',
    'createDocumentLinkResolver',
    'RdxDocumentLinkError',
    'createRdxProject',
    'defineConfig',
    'resolveConfig',
    'resolveProjectPath',
    'RdxConfigError',
    'getSourceOptions',
    'resolveDocsRoute',
    'getProjectDocsPaths',
  ])
    assert.equal(typeof core[name], 'function', name)
  for (const name of [
    'createRdxProject',
    'defineConfig',
    'resolveConfig',
    'resolveProjectPath',
    'RdxConfigError',
  ])
    assert.equal(config[name], core[name], name)
  assert.equal(runtimeConfig.defineConfig, config.defineConfig)
  for (const name of [
    'remarkDocumentLinks',
    'rehypeDocumentationHeadings',
    'rehypeDocumentationCode',
  ])
    assert.equal(typeof mdx[name], 'function', name)
  assert.equal(typeof search.buildSearchIndex, 'function')
})

test('configuration identity, aliases and opt-in defaults remain compatible', () => {
  const input = {
    metadata: { applicationName: 'Public contract' },
    plugins: [],
  }
  assert.equal(runtimeConfig.defineConfig(input), input)
  const resolved = config.resolveConfig(input)
  assert.equal('docsDir' in resolved, false)
  assert.equal(resolved.lang, 'en')
  assert.equal(resolved.TOC, false)
  assert.equal(resolved.search, false)
  assert.equal(resolved.homepage?.enabled ?? false, false)
  assert.equal(resolved.theme.defaultTheme, 'system')
  assert.deepEqual(resolved.plugins, [])
  assert.throws(
    () =>
      runtimeConfig.defineConfig({
        metadata: { applicationName: 'Docs' },
        search: 'true',
      }),
    /search must be a boolean/
  )
})

test('the built runtime leaves UI components external instead of embedding a UI copy', async () => {
  const runtime = await readFile(
    new URL('../dist/runtime/index.js', import.meta.url),
    'utf8'
  )
  for (const subpath of [
    'components/mdx-components',
    'components/navbar',
    'providers/theme-provider',
  ]) {
    assert.ok(runtime.includes(`@lexibase/rdx-ui/${subpath}`), subpath)
  }
})
