import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createJiti } from 'jiti'
import { createRdxProject, getLocalizedProject } from '@lexibase/rdx-core'
import { prepareLocaleRoutes } from '../bin/locale-routes.mjs'

const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false })
const { getDocumentMetadata } = await jiti.import('../src/runtime/metadata.ts')
const { getSearchResponse } = await jiti.import('../src/runtime/search.ts')
const { getRdxSitemap } = await jiti.import('../src/runtime/indexing.ts')

async function fixture(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-locale-runtime-'))
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }))
  const write = (name, value) => {
    fs.mkdirSync(path.dirname(path.join(rootDir, name)), { recursive: true })
    fs.writeFileSync(path.join(rootDir, name), value)
  }
  write('docs/intro.mdx', '---\ntitle: Introduction\n---\nOriginalIntroMarker')
  write(
    'docs/install.mdx',
    '---\ntitle: Installation\n---\nOriginalInstallMarker'
  )
  write(
    'locale/ptbr/docs/intro.mdx',
    '---\ntitle: Introdução\n---\nTranslatedIntroMarker'
  )
  const project = await createRdxProject(
    {
      metadata: {
        applicationName: 'Docs',
        metadataBase: 'https://docs.example.test',
      },
      search: true,
      lang: 'en',
      plugins: [
        {
          name: 'localization-fixture',
          apiVersion: 1,
          setup() {
            return {
              localization: {
                locales: [
                  { code: 'en', label: 'English' },
                  { code: 'pt-BR', label: 'Português', folder: 'ptbr' },
                ],
              },
            }
          },
        },
      ],
    },
    { rootDir }
  )
  return { project, write }
}

test('search indexes only authored content for the selected locale', async (t) => {
  const { project } = await fixture(t)
  const pt = getLocalizedProject(project, 'pt-br')
  const response = getSearchResponse(pt, '_')
  const text = await response.text()
  assert.match(text, /TranslatedIntroMarker/)
  assert.match(text, /\/pt-br\/docs\/intro/)
  assert.doesNotMatch(text, /OriginalInstallMarker|OriginalIntroMarker/)
})

test('fallback metadata is noindex and canonical to the original; alternates and sitemap describe actual translations', async (t) => {
  const { project } = await fixture(t)
  const pt = getLocalizedProject(project, 'pt-br')
  const fallback = getDocumentMetadata({ project: pt, slug: ['install'] })
  assert.equal(fallback.title, 'Installation')
  assert.deepEqual(fallback.robots, { index: false, follow: true })
  assert.equal(
    fallback.alternates.canonical,
    'https://docs.example.test/en/docs/install'
  )
  assert.equal(fallback.alternates.languages, undefined)
  const translated = getDocumentMetadata({ project: pt, slug: ['intro'] })
  assert.equal(translated.title, 'Introdução')
  assert.equal(
    translated.alternates.languages['pt-BR'],
    'https://docs.example.test/pt-br/docs/intro'
  )
  assert.deepEqual(
    new Set(getRdxSitemap(project).map((entry) => entry.url)),
    new Set([
      'https://docs.example.test/en/docs/intro',
      'https://docs.example.test/en/docs/install',
      'https://docs.example.test/pt-br/docs/intro',
    ])
  )
})

test('localized root layouts are repeatable, use server-side language and are removed when the plugin is disabled', async (t) => {
  const { project, write } = await fixture(t)
  const runtime = path.join(project.rootDir, '.rdx')
  const template = new URL('../templates/runtime', import.meta.url)
  const { fileURLToPath } = await import('node:url')
  const appTemplate = fileURLToPath(template)
  for (let attempt = 0; attempt < 2; attempt++) {
    fs.cpSync(appTemplate, runtime, { recursive: true })
    await prepareLocaleRoutes(project, runtime, appTemplate)
    assert.equal(fs.existsSync(path.join(runtime, 'app/layout.tsx')), false)
    const layout = fs.readFileSync(
      path.join(runtime, 'app/(rdx-locales)/[locale]/layout.tsx'),
      'utf8'
    )
    assert.match(layout, /getLocalizedProject/)
    assert.match(layout, /RdxLayout/)
    assert.match(
      fs.readFileSync(
        path.join(runtime, 'app/(rdx-default)/layout.tsx'),
        'utf8'
      ),
      /from '..\/..\/rdx-project'/
    )
  }
  write('rdx.css', '/* user owned */')
  fs.cpSync(appTemplate, runtime, { recursive: true })
  await prepareLocaleRoutes(
    { ...project, localization: undefined },
    runtime,
    appTemplate
  )
  assert.equal(fs.existsSync(path.join(runtime, 'app/layout.tsx')), true)
  assert.equal(
    fs.existsSync(path.join(runtime, 'app/(rdx-locales)/[locale]/layout.tsx')),
    false
  )
  assert.equal(
    fs.readFileSync(path.join(project.rootDir, 'rdx.css'), 'utf8'),
    '/* user owned */'
  )
})
