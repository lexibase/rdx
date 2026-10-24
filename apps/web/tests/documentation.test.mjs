/* global globalThis */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { renderToStaticMarkup } from 'react-dom/server'
import { createRdxProject } from '@lexibase/rdx-core'
import { versioning } from '@lexibase/rdx-versioning'

import { createDocumentation } from '../lib/documentation.ts'
import { compileDocument } from '../lib/compile-documentation.ts'
import config from '../rdx.config.ts'
import { runProjectCommand } from '../lib/project-command.ts'

const root = fileURLToPath(new URL('../', import.meta.url))

test('showcase commands use configured versioning, preserve snapshots and refuse invalid state', async () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rdx-showcase-commands-')
  )
  try {
    const input = {
      metadata: { applicationName: 'Test' },
      plugins: [versioning()],
    }
    fs.mkdirSync(path.join(temporary, 'docs/guides'), { recursive: true })
    const liveFile = path.join(temporary, 'docs/guides/intro.mdx')
    fs.writeFileSync(liveFile, 'Original')
    await runProjectCommand(temporary, input, 'prepare')
    await runProjectCommand(temporary, input, 'version', ['1.0.0'])
    const snapshot = path.join(
      temporary,
      'versioned_docs/version-1.0.0/guides/intro.mdx'
    )
    assert.equal(fs.readFileSync(snapshot, 'utf8'), 'Original')
    fs.writeFileSync(liveFile, 'Current changes')
    let docs = createDocumentation(
      await createRdxProject(input, { rootDir: temporary })
    )
    assert.equal(docs.document('canary', 'intro').content, 'Current changes')
    assert.equal(docs.document('1.0.0', 'intro').content, 'Original')
    await assert.rejects(
      () => runProjectCommand(temporary, input, 'version', ['1.0.0']),
      /already exists/
    )
    const manifest = path.join(temporary, 'versions.json')
    fs.writeFileSync(
      manifest,
      JSON.stringify({ active: [], archived: ['1.0.0'] })
    )
    docs = createDocumentation(
      await createRdxProject(input, { rootDir: temporary })
    )
    assert.equal(docs.editions[1].kind, 'archived')
    assert.equal(docs.document('1.0.0', 'intro').content, 'Original')
    await assert.rejects(
      () =>
        runProjectCommand(
          temporary,
          { metadata: { applicationName: 'No plugin' } },
          'version',
          ['2.0.0']
        ),
      /Unknown documentation command/
    )
    fs.writeFileSync(manifest, '{ invalid manifest')
    await assert.rejects(
      () => runProjectCommand(temporary, input, 'prepare'),
      /valid JSON/
    )
    assert.equal(fs.readFileSync(manifest, 'utf8'), '{ invalid manifest')
    assert.equal(fs.readFileSync(snapshot, 'utf8'), 'Original')
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})

test('showcase compilation preserves relative links, missing-document handling and MDX protections', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-showcase-mdx-'))
  try {
    for (const folder of ['docs', 'versioned_docs/version-1.0.0']) {
      const base = path.join(temporary, folder)
      fs.mkdirSync(path.join(base, 'guides'), { recursive: true })
      fs.mkdirSync(path.join(base, 'api'), { recursive: true })
      fs.writeFileSync(
        path.join(base, 'guides/source.mdx'),
        '[API](../api/target.mdx#configuration)'
      )
      fs.writeFileSync(path.join(base, 'api/target.mdx'), '## Configuration')
    }
    fs.writeFileSync(
      path.join(temporary, 'versions.json'),
      JSON.stringify({ active: ['1.0.0'], archived: [] })
    )
    const docs = createDocumentation(
      await createRdxProject(
        { metadata: { applicationName: 'Test' }, plugins: [versioning()] },
        { rootDir: temporary }
      )
    )
    for (const version of ['canary', '1.0.0']) {
      const result = await compileDocument(version, 'source', {}, docs)
      assert.match(
        renderToStaticMarkup(result.content),
        new RegExp(`href="/docs/${version}/target#configuration"`)
      )
    }
    assert.equal(await compileDocument('canary', 'unknown', {}, docs), null)
    const source = path.join(temporary, 'docs/guides/source.mdx')
    fs.writeFileSync(source, '[Broken](./missing.mdx)')
    await assert.rejects(
      () => compileDocument('canary', 'source', {}, docs),
      /Invalid document link.*missing\.mdx/
    )
    globalThis.__rdxShowcaseProbe = 'untouched'
    fs.writeFileSync(
      source,
      '{(globalThis.__rdxShowcaseProbe = "executed")}\n\n<span title={(globalThis.__rdxShowcaseProbe = "executed")}>Safe</span>'
    )
    const result = await compileDocument('canary', 'source', {}, docs)
    const html = renderToStaticMarkup(result.content)
    assert.equal(globalThis.__rdxShowcaseProbe, 'untouched')
    assert.match(html, /Safe/)
    assert.doesNotMatch(html, /title="executed"/)
  } finally {
    delete globalThis.__rdxShowcaseProbe
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})

test('the website exposes Canary and the 1.0.1 snapshot without demonstration releases', async () => {
  const docs = createDocumentation(
    await createRdxProject(config, { rootDir: root })
  )
  assert.deepEqual(
    docs.editions.map(({ id, kind }) => ({ id, kind })),
    [
      { id: 'canary', kind: 'live' },
      { id: '1.0.1', kind: 'version' },
    ]
  )
  for (const version of ['canary', '1.0.1']) {
    const pages = docs.pages(version)
    assert.ok(pages.length > 0, version)
    assert.ok(docs.document(version, 'intro'), version)
    const intro = pages.find((page) => page.slug === 'intro')
    assert.ok(intro, version)
    assert.equal(docs.document(version, 'intro').sourcePath, intro.sourcePath)
    assert.ok(
      docs
        .categories(version)
        .some((category) =>
          category.links.some((link) => link.href === `/docs/${version}/intro`)
        )
    )
    for (const page of pages) assert.ok(docs.document(version, page.slug))
  }
  assert.deepEqual(docs.index('../canary'), [])
  for (const retired of ['2.1.1', '2.1.0', '2.0.0']) {
    assert.equal(docs.document(retired, 'intro'), null)
  }
  assert.equal(docs.document('unknown', 'intro'), null)
  assert.equal(docs.document('canary', '../intro'), null)
  assert.equal(docs.document('canary', 'invented/path/intro'), null)
})

test('duplicate filenames use full paths and ambiguous short links never pick a random document', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-showcase-'))
  try {
    const base = path.join(temporary, 'docs')
    for (const name of ['guides', 'api']) {
      fs.mkdirSync(path.join(base, name), { recursive: true })
      fs.writeFileSync(
        path.join(base, name, 'intro.mdx'),
        `---\ntitle: ${name}\n---\n# ${name}`
      )
    }
    const docs = createDocumentation(
      await createRdxProject(
        { metadata: { applicationName: 'Test' } },
        { rootDir: temporary }
      )
    )
    assert.deepEqual(
      docs
        .pages('canary')
        .map((page) => page.slug)
        .sort(),
      ['api/intro', 'guides/intro']
    )
    assert.equal(docs.document('canary', 'intro'), null)
    assert.equal(docs.document('canary', 'api/intro').frontmatter.title, 'api')
    assert.deepEqual(
      docs
        .categories('canary')
        .flatMap((category) => category.links.map((link) => link.href))
        .sort(),
      ['/docs/canary/api/intro', '/docs/canary/guides/intro']
    )
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})
