import assert from 'node:assert/strict'
import test from 'node:test'

import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false })
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')

test('MDX keeps Markdown, links, images, fenced code and registered JSX components usable', async () => {
  const { content } = await compileDocumentation(
    '# Documentation\n\n[Guide](/docs/init/intro)\n\n![Logo](/images/rdx.svg)\n\n<Notice title="Note">Custom component</Notice>\n\n```js\nconst value = { example: true }\n```',
    {
      Notice: () =>
        createElement('aside', { title: 'Note' }, 'Custom component'),
    }
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /<h1>Documentation<\/h1>/)
  assert.match(html, /href="\/docs\/init\/intro"/)
  assert.match(html, /src="\/images\/rdx.svg"/)
  assert.match(html, /<aside title="Note">Custom component<\/aside>/)
  assert.match(html, /const value = \{ example: true \}/)
})

test('MDX expressions and JSX expression attributes cannot execute project-server JavaScript', async () => {
  globalThis.__rdxMdxSecurityProbe = 'untouched'
  try {
    const { content } = await compileDocumentation(
      '# Safe\n\n{(() => { globalThis.__rdxMdxSecurityProbe = "executed"; return "MDX_EXECUTED" })()}\n\n<span title={(globalThis.__rdxMdxSecurityProbe = "executed")}>Static content</span>',
      {}
    )
    const html = renderToStaticMarkup(content)
    assert.equal(globalThis.__rdxMdxSecurityProbe, 'untouched')
    assert.match(html, /Static content/)
    assert.doesNotMatch(html, /MDX_EXECUTED|title="executed"/)
  } finally {
    delete globalThis.__rdxMdxSecurityProbe
  }
})
