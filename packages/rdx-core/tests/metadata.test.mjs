import assert from 'node:assert/strict'
import test from 'node:test'

import { defineConfig, resolveConfig } from '../dist/index.js'

test('metadata is optional and preserves the portable contract without inventing deployment URLs', () => {
  assert.equal(resolveConfig({ title: 'Docs' }).metadata, undefined)
  assert.deepEqual(resolveConfig({ title: 'Docs', metadata: {} }).metadata, {})
  const metadata = {
    metadataBase: 'https://docs.example.com',
    applicationName: 'Docs',
    authors: [{ name: 'Team', url: 'https://example.com' }],
    keywords: ['documentation'],
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      shortcut: '/favicon.ico',
      apple: '/apple.png',
    },
    manifest: '/site.webmanifest',
    robots: { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Docs',
      locale: 'pt_BR',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Docs' }],
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@team',
      site: '@docs',
      images: ['/og.png'],
    },
  }
  const config = { title: 'Docs', metadata }
  assert.equal(defineConfig(config), config)
  assert.deepEqual(resolveConfig(config).metadata, metadata)
})

test('invalid metadata reports the exact field before runtime', () => {
  for (const [metadata, field] of [
    [null, 'metadata'],
    [[], 'metadata'],
    [{ typo: true }, 'metadata.typo'],
    [{ metadataBase: '/docs' }, 'metadata.metadataBase'],
    [{ metadataBase: 'javascript:alert(1)' }, 'metadata.metadataBase'],
    [
      { metadataBase: 'https://user:password@example.com' },
      'metadata.metadataBase',
    ],
    [{ authors: [{ name: '' }] }, 'metadata.authors[0].name'],
    [{ authors: [{ name: 'Team', url: '#' }] }, 'metadata.authors[0].url'],
    [{ keywords: 'docs' }, 'metadata.keywords'],
    [{ keywords: [1] }, 'metadata.keywords[0]'],
    [{ icons: { icon: 'data:image/svg+xml,bad' } }, 'metadata.icons.icon'],
    [{ manifest: '//example.com/manifest' }, 'metadata.manifest'],
    [{ robots: { index: 'no' } }, 'metadata.robots.index'],
    [{ openGraph: { url: 'https://example.com' } }, 'metadata.openGraph.url'],
    [{ openGraph: { type: 'article' } }, 'metadata.openGraph.type'],
    [
      { openGraph: { images: [{ url: '/og.png', width: -1 }] } },
      'metadata.openGraph.images[0].width',
    ],
    [{ twitter: { card: 'invalid' } }, 'metadata.twitter.card'],
    [
      { twitter: { images: ['javascript:alert(1)'] } },
      'metadata.twitter.images[0]',
    ],
  ]) {
    assert.throws(
      () => resolveConfig({ title: 'Docs', metadata }),
      (error) => {
        assert.equal(error.name, 'RdxConfigError')
        assert.ok(error.message.includes(field), error.message)
        return true
      }
    )
  }
})
