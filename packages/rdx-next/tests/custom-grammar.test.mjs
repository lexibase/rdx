import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createRdxProject } from '@lexibase/rdx-core'
import { createJiti } from 'jiti'
import { renderToStaticMarkup } from 'react-dom/server'

import { getRdxTracingConfig } from '../config.mjs'

const { compileDocumentation } = await createJiti(import.meta.url).import(
  '../src/runtime/mdx.ts'
)

test('project TextMate grammars highlight Markdown fences and are traced for deployment', async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-grammar-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  const config = {
    metadata: { applicationName: 'Custom grammar' },
    syntaxHighlighting: { languages: { 'test-grammar': './grammar.json' } },
  }
  const configPath = path.join(rootDir, 'rdx.config.ts')
  const grammarPath = path.join(rootDir, 'grammar.json')
  const load = () => createRdxProject(config, { rootDir })
  await assert.rejects(
    load,
    /syntaxHighlighting.languages.test-grammar.*could not read/
  )
  await writeFile(grammarPath, '{}')
  await assert.rejects(load, /TextMate grammar with scopeName and patterns/)
  await writeFile(configPath, `export default ${JSON.stringify(config)}`)
  const writeGrammar = (match) =>
    writeFile(
      grammarPath,
      JSON.stringify({
        name: 'Human readable name',
        scopeName: 'source.test-grammar',
        patterns: [{ match, name: 'keyword.control.test-grammar' }],
      })
    )
  await writeGrammar('activate')
  const tracing = await getRdxTracingConfig({ rootDir })
  assert.deepEqual(tracing.outputFileTracingIncludes['/*'], ['grammar.json'])

  const source =
    '```test-grammar title="Example" lineNumbers\nactivate other\n```'
  const render = async (grammars) => {
    const { content } = await compileDocumentation(
      source,
      {},
      undefined,
      grammars
    )
    return renderToStaticMarkup(content)
  }
  const html = await render((await load()).syntaxGrammars)
  assert.match(html, /data-rdx-code-title="Example"/)
  assert.match(html, /data-rdx-code-line-numbers="true"/)
  assert.match(html, /<span style="[^"]*--shiki-light:[^"]*">activate<\/span>/)
  assert.doesNotMatch(await render(), /<span style="[^"]*">activate<\/span>/)
  await writeGrammar('other')
  const updated = await render((await load()).syntaxGrammars)
  assert.match(updated, /<span style="[^"]*--shiki-light:[^"]*">other<\/span>/)
})
