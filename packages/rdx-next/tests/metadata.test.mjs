import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false })
const { getRdxMetadata } = await jiti.import('../src/runtime/metadata.ts')

test('native metadata keeps existing title defaults and never invents canonical or localhost URLs', () => {
  assert.deepEqual(getRdxMetadata({ title: 'Docs', description: 'Learn' }), {
    title: { default: 'Docs', template: '%s | Docs' },
    description: 'Learn',
  })
  assert.equal(
    getRdxMetadata({ title: 'Docs', metadata: {} }).metadataBase,
    undefined
  )
})

test('configured metadata reaches Next with social defaults, explicit overrides, and no config mutation', () => {
  const config = {
    title: 'Docs',
    description: 'Learn',
    metadata: {
      metadataBase: 'https://docs.example.com',
      authors: [{ name: 'Team' }],
      keywords: ['docs'],
      icons: { icon: '/favicon.ico' },
      manifest: '/site.webmanifest',
      robots: { index: false, follow: false },
      openGraph: { title: 'Shared Docs', images: [{ url: '/og.png' }] },
      twitter: { card: 'summary_large_image', images: ['/twitter.png'] },
    },
  }
  const before = structuredClone(config)
  const metadata = getRdxMetadata(config)
  assert.equal(metadata.metadataBase.href, 'https://docs.example.com/')
  assert.equal(metadata.openGraph.title, 'Shared Docs')
  assert.equal(metadata.openGraph.description, 'Learn')
  assert.equal(metadata.twitter.title, 'Docs')
  assert.deepEqual(metadata.robots, { index: false, follow: false })
  assert.deepEqual(metadata.icons, config.metadata.icons)
  assert.deepEqual(metadata.authors, config.metadata.authors)
  assert.equal(metadata.alternates, undefined)
  assert.equal(metadata.openGraph.url, undefined)
  assert.deepEqual(config, before)
})

test('generated and development layouts both consume the shared metadata adapter', async () => {
  for (const filename of [
    '../templates/runtime/app/layout.tsx',
    '../../../apps/web/app/layout.tsx',
  ]) {
    const source = await readFile(new URL(filename, import.meta.url), 'utf8')
    assert.match(source, /getRdxMetadata\(config\)/)
    assert.doesNotMatch(source, /siteMetadata/)
  }
})
