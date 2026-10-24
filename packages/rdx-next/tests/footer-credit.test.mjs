import assert from 'node:assert/strict'
import test from 'node:test'

import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, {
  moduleCache: false,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { FooterCredit } = await jiti.import(
  '../../rdx-ui/src/components/footer-credit.tsx'
)

test('the footer shows equal or omitted starting years once and earlier years as a range', () => {
  const currentYear = new Date().getFullYear()
  for (const since of [undefined, currentYear]) {
    const html = renderToStaticMarkup(
      createElement(FooterCredit, { name: 'My docs', since })
    )
    assert.ok(html.includes(`© ${currentYear} <strong>My docs</strong>`))
    assert.equal(html.includes(`${currentYear}–${currentYear}`), false)
  }
  const html = renderToStaticMarkup(
    createElement(FooterCredit, { name: 'My docs', since: currentYear - 2 })
  )
  assert.ok(html.includes(`© ${currentYear - 2}–${currentYear}`))
  assert.match(html, /Powered by /)
  assert.match(html, /href="https:\/\/github\.com\/lexibase\/rdx"/)
  assert.match(html, />RDX<\/a>/)
  assert.match(html, /rel="noopener noreferrer"/)
})

test('the shared footer preserves development-site author credits and escapes site names', () => {
  const html = renderToStaticMarkup(
    createElement(FooterCredit, { name: '<Docs>' }, '. Developed by Team')
  )
  assert.match(html, /&lt;Docs&gt;/)
  assert.match(html, /Developed by Team/)
  assert.match(html, /Powered by /)
})
