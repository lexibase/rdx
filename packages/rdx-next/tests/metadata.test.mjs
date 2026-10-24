import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false })
const { getDocumentMetadata, getRdxMetadata } = await jiti.import(
  '../src/runtime/metadata.ts'
)
const { createRdxProject } = await jiti.import('@lexibase/rdx-core')

test('applicationName supplies browser titles without inventing canonical or localhost URLs', () => {
  assert.deepEqual(
    getRdxMetadata({
      metadata: { applicationName: 'Docs' },
      description: 'Learn',
    }),
    {
      title: { default: 'Docs', template: '%s | Docs' },
      applicationName: 'Docs',
      description: 'Learn',
    }
  )
  assert.equal(
    getRdxMetadata({ metadata: { applicationName: 'Docs' } }).metadataBase,
    undefined
  )
})

test('configured metadata reaches Next with social defaults, explicit overrides, and no config mutation', () => {
  const config = {
    description: 'Learn',
    metadata: {
      applicationName: 'Docs',
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

test('renaming applicationName updates browser and social defaults together', () => {
  for (const name of ['Docs', 'Renamed project']) {
    const metadata = getRdxMetadata({
      metadata: { applicationName: name, openGraph: {}, twitter: {} },
    })
    assert.deepEqual(metadata.title, {
      default: name,
      template: `%s | ${name}`,
    })
    assert.equal(metadata.applicationName, name)
    assert.equal(metadata.openGraph.title, name)
    assert.equal(metadata.twitter.title, name)
  }
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

test('document metadata follows live and plugin sources, frontmatter and filename fallbacks', async (t) => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rdx-document-metadata-')
  )
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  fs.mkdirSync(path.join(rootDir, 'docs/guides'), { recursive: true })
  fs.mkdirSync(path.join(rootDir, 'snapshot/guides'), { recursive: true })
  fs.writeFileSync(
    path.join(rootDir, 'docs/guides/intro.mdx'),
    '---\ntitle: Live introduction\ndescription: Live description\nlink_position: 0\n---\n# Hello'
  )
  fs.writeFileSync(
    path.join(rootDir, 'snapshot/guides/intro.mdx'),
    '---\ntitle: Snapshot introduction\ndescription: Snapshot description\n---\n# Hello'
  )
  fs.writeFileSync(
    path.join(rootDir, 'docs/guides/getting-started.mdx'),
    '# Getting started'
  )
  fs.writeFileSync(
    path.join(rootDir, 'docs/guides/blank.mdx'),
    '---\ntitle: " "\ndescription: " "\n---\nBody'
  )
  const project = await createRdxProject(
    {
      metadata: { applicationName: 'My docs' },
      description: 'Site description',
      plugins: [
        {
          name: 'snapshot-fixture',
          apiVersion: 1,
          setup: () => ({
            sources: [
              {
                id: 'snapshot',
                label: '1.0.1',
                docsDir: 'snapshot',
                routePrefix: '1.0.1',
                badge: 'Archived',
              },
            ],
          }),
        },
      ],
    },
    { rootDir }
  )
  const live = { title: 'Live introduction', description: 'Live description' }
  assert.deepEqual(
    getDocumentMetadata({ project, slug: ['guides', 'intro'] }),
    live
  )
  assert.deepEqual(getDocumentMetadata({ project }), live)
  const snapshot = {
    title: 'Snapshot introduction',
    description: 'Snapshot description',
  }
  assert.deepEqual(
    getDocumentMetadata({ project, slug: ['1.0.1', 'guides', 'intro'] }),
    snapshot
  )
  assert.deepEqual(getDocumentMetadata({ project, slug: ['1.0.1'] }), snapshot)
  assert.deepEqual(
    getDocumentMetadata({ project, slug: ['guides', 'getting-started'] }),
    { title: 'Getting Started', description: 'Site description' }
  )
  assert.deepEqual(
    getDocumentMetadata({ project, slug: ['guides', 'blank'] }),
    { title: 'Blank', description: 'Site description' }
  )
  for (const slug of [['missing'], ['1.0.1', 'missing'], ['..', 'private']]) {
    assert.throws(
      () => getDocumentMetadata({ project, slug }),
      /NEXT_HTTP_ERROR_FALLBACK;404/
    )
  }
})

test('empty documentation inherits site metadata and generated routes export generateMetadata', async (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-empty-metadata-'))
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  const project = await createRdxProject(
    { metadata: { applicationName: 'Empty' } },
    { rootDir }
  )
  assert.deepEqual(getDocumentMetadata({ project }), {})
  const source = await readFile(
    new URL(
      '../templates/runtime/app/docs/[[...slug]]/page.tsx',
      import.meta.url
    ),
    'utf8'
  )
  assert.match(source, /export async function generateMetadata/)
  assert.match(
    source,
    /getDocumentMetadata\(\{ project: await getProject\(\), slug \}\)/
  )
})
