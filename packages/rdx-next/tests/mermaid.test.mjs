import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, {
  moduleCache: true,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')
const { mdxComponents } = await jiti.import(
  '../../rdx-ui/src/components/mdx-components.tsx'
)

test('Mermaid fences retain literal definitions and optional metadata without a browser on the server', async () => {
  const source =
    'flowchart TD\n    A[Documentation] --> B{Ready?}\n    B -->|Yes| C[Publish]\n'
  const { content } = await compileDocumentation(
    '```mermaid title="Documentation flow" lineNumbers startLine=8\n' +
      source +
      '```',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /data-rdx-code-mode="mermaid"/)
  assert.match(html, /Documentation flow/)
  assert.match(html, /data-numbered="true"/)
  assert.match(html, /counter-reset:line 7/)
  assert.match(html, /A\[Documentation\] --&gt; B\{Ready\?\}/)
  assert.match(html, /data-slot="code-block-copy-button"/)
  assert.doesNotMatch(
    html,
    /<svg[^>]*id="rdx-mermaid-|data-rdx-mermaid-preview|--shiki-/
  )
})

test('diagram typos remain readable during server rendering instead of failing the page build', async () => {
  const { content } = await compileDocumentation(
    '```mermaid\ninvalid diagram syntax\n```',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /data-rdx-code-mode="mermaid"/)
  assert.match(html, /invalid diagram syntax/)
})

test('Mermaid definitions stay literal even with JavaScript-shaped labels and an uppercase fence', async () => {
  const { content } = await compileDocumentation(
    '```MERMAID\nflowchart LR\n    A["{globalThis.probe = true}"] --> B["<script>alert(1)</script>"]\n```',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /data-rdx-code-mode="mermaid"/)
  assert.match(html, /globalThis.probe = true/)
  assert.doesNotMatch(html, /<script>/)
})
