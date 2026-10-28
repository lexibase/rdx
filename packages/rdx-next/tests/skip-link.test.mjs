import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, {
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { SkipLink } = await jiti.import(
  '../../rdx-ui/src/components/skip-link.tsx'
)

test('skip links expose a native localized content destination', () => {
  for (const [lang, label] of [
    ['en', 'Skip to content'],
    ['pt-BR', 'Ir para o conteúdo'],
  ]) {
    const html = renderToStaticMarkup(createElement(SkipLink, { lang }))
    assert.match(html, /href="#rdx-main"/)
    assert.ok(html.includes(label))
    assert.doesNotMatch(html, /tabindex|role=/)
  }
})
