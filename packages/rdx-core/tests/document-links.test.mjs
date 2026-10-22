import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import {
  createDocumentLinkResolver,
  RdxDocumentLinkError,
} from '../dist/index.js'

const root = path.resolve('fixtures/custom-docs')
const documents = [
  'guides/intro',
  'guides/install',
  'api/reference',
  'guides/with spaces',
  'guides/ação',
].map((slug) => ({ sourcePath: path.join(root, `${slug}.mdx`), slug }))
const options = {
  sourceRoot: root,
  sourcePath: documents[0].sourcePath,
  documents,
}

test('relative MDX links preserve nested slugs, URL suffixes and source versions', () => {
  for (const routePrefix of [undefined, '1.0.0', 'canary']) {
    const resolve = createDocumentLinkResolver({ ...options, routePrefix })
    const prefix = ['/docs', routePrefix].filter(Boolean).join('/')
    assert.equal(
      resolve('./install.mdx?lang=pt#setup'),
      `${prefix}/guides/install?lang=pt#setup`
    )
    assert.equal(resolve('install.mdx'), `${prefix}/guides/install`)
    assert.equal(
      resolve('../api/reference.mdx#api'),
      `${prefix}/api/reference#api`
    )
    assert.equal(
      resolve('./intro.mdx#same-page'),
      `${prefix}/guides/intro#same-page`
    )
    assert.equal(
      resolve('./with%20spaces.mdx'),
      `${prefix}/guides/with%20spaces`
    )
    assert.equal(
      resolve('./a%C3%A7%C3%A3o.mdx'),
      `${prefix}/guides/a%C3%A7%C3%A3o`
    )
  }
})

test('non-document URLs and root-relative URLs remain untouched', () => {
  const resolve = createDocumentLinkResolver(options)
  for (const href of [
    '#setup',
    '?lang=pt',
    'https://example.com/a.mdx',
    'mailto:docs@example.com',
    '//example.com/a.mdx',
    '/docs/live',
    '/guide.mdx',
    '/images/logo.svg',
    './manual.pdf',
    '../logo.png',
    'install',
    'https://example.com/%broken.mdx',
  ])
    assert.equal(resolve(href), href)
})

test('missing destinations, escaped roots and invalid encoding fail with actionable context', () => {
  const resolve = createDocumentLinkResolver({
    ...options,
    routePrefix: '1.0.0',
  })
  for (const href of [
    './missing.mdx',
    '../../outside.mdx',
    '../../custom-docs-other/guide.mdx',
    '%2e%2e/%2e%2e/outside.mdx',
    './bad%ZZ.mdx',
    './bad%00.mdx',
    '..%5Coutside.mdx',
  ]) {
    assert.throws(
      () => resolve(href),
      (error) =>
        error instanceof RdxDocumentLinkError &&
        error.message.includes(href) &&
        error.message.includes(options.sourcePath)
    )
  }
  assert.throws(() => resolve('./missing.mdx'), /1\.0\.0/)
})

test('legacy filename routes are mapped from source paths, with ambiguous routes rejected', () => {
  const resolve = createDocumentLinkResolver({
    ...options,
    documents: documents.map((page) => ({
      ...page,
      slug: path.basename(page.slug),
    })),
    routePrefix: 'canary',
  })
  assert.equal(resolve('../api/reference.mdx'), '/docs/canary/reference')
  const ambiguous = createDocumentLinkResolver({
    ...options,
    documents: [
      ...documents,
      {
        sourcePath: path.join(root, 'other/install.mdx'),
        slug: 'guides/install',
      },
    ],
  })
  assert.throws(() => ambiguous('./install.mdx'), /ambiguous/)
})
