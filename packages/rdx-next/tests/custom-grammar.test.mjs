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
  const render = async (grammars, themes) => {
    const { content } = await compileDocumentation(
      source,
      {},
      undefined,
      grammars,
      themes
    )
    return renderToStaticMarkup(content)
  }
  const html = await render((await load()).syntaxGrammars)
  assert.match(html, /data-rdx-code-title="Example"/)
  assert.match(html, /data-rdx-code-line-numbers="true"/)
  assert.match(html, /<span style="[^"]*--shiki-light:[^"]*">activate<\/span>/)
  const themed = await render((await load()).syntaxGrammars, {
    dark: 'catppuccin-mocha',
  })
  assert.match(
    themed,
    /<span style="[^"]*--shiki-dark:#cba6f7[^"]*">activate<\/span>/i
  )
  assert.doesNotMatch(await render(), /<span style="[^"]*">activate<\/span>/)
  await writeGrammar('other')
  const updated = await render((await load()).syntaxGrammars)
  assert.match(updated, /<span style="[^"]*--shiki-light:[^"]*">other<\/span>/)
})

test('bundled syntax themes work without custom grammars and keep the other mode default', async () => {
  const input = {
    metadata: { applicationName: 'Syntax themes' },
    syntaxHighlighting: { themes: { dark: 'catppuccin-mocha' } },
  }
  const { config } = await createRdxProject(input)
  const render = async (themes) => {
    const { content } = await compileDocumentation(
      '```js\nconst example = "hello"\n```',
      {},
      undefined,
      undefined,
      themes
    )
    return renderToStaticMarkup(content)
  }
  const lightColor = (html) =>
    html.match(/--shiki-light:([^;"]+)[^"]*">const<\/span>/i)?.[1]
  const defaults = await render()
  const themed = await render(config.syntaxHighlighting.themes)
  assert.ok(lightColor(defaults))
  assert.equal(lightColor(themed), lightColor(defaults))
  assert.match(themed, /--shiki-dark:#cba6f7[^"]*">const<\/span>/i)
  assert.notEqual(themed, defaults)
  await assert.rejects(
    createRdxProject({
      ...input,
      syntaxHighlighting: { themes: { dark: 'missing-theme' } },
    }),
    /syntaxHighlighting.themes.dark.*Unknown theme "missing-theme"/
  )
})
