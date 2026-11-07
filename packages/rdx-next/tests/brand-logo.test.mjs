import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRdxProject } from '@lexibase/rdx-core'

const jiti = createJiti(import.meta.url, {
  moduleCache: true,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { BrandLogo } = await jiti.import(
  '../../rdx-ui/src/components/brand-logo.tsx'
)
const { HomePage, NotFoundPage } = await jiti.import('../src/runtime/index.tsx')

test('image logos retain their source, proportions and decorative semantics without interpreting SVG as JSX', () => {
  for (const source of ['/images/logo.png', '/images/logo.svg', '/logo.webp']) {
    const html = renderToStaticMarkup(
      createElement(BrandLogo, { source, className: 'size-5' })
    )
    assert.ok(html.includes(`src="${source}"`))
    assert.match(html, /alt=""/)
    assert.match(html, /aria-hidden="true"/)
    assert.match(html, /object-contain/)
    assert.match(html, /size-5/)
    assert.doesNotMatch(html, /<svg/)
  }
})

test('SVG components receive the existing sizing classes and the default vector remains available', () => {
  const Custom = (props) =>
    createElement('svg', { ...props, 'data-custom-logo': true })
  const html = renderToStaticMarkup(
    createElement(BrandLogo, { source: Custom, className: 'size-52' })
  )
  assert.match(html, /data-custom-logo="true"/)
  assert.match(html, /class="size-52"/)
  assert.match(
    renderToStaticMarkup(createElement(BrandLogo, { className: 'size-5' })),
    /<svg/
  )
})

test('runtime homepage and plain 404 share image branding while the navbar keeps its accessible name', async () => {
  const project = await createRdxProject(
    {
      metadata: { applicationName: 'Example Docs' },
      homepage: { enabled: true },
      navbar: { logo: '/images/logo.png' },
    },
    {
      rootDir: fileURLToPath(
        new URL('../../create-rdx/templates/default/', import.meta.url)
      ),
    }
  )
  const home = renderToStaticMarkup(createElement(HomePage, { project }))
  assert.equal((home.match(/<img/g) ?? []).length, 2)
  assert.match(home, /aria-label="Example Docs"/)
  assert.match(home, /data-rdx-home/)
  assert.match(home, /object-contain[^"]*size-5/)
  assert.match(home, /<h1[^>]*>Example Docs<\/h1>/)
  assert.match(home, /rdx-home-preview-shell/)
  assert.match(home, /href="\/docs\/getting-started\/intro"/)
  const missing = renderToStaticMarkup(createElement(NotFoundPage, { project }))
  assert.equal((missing.match(/<img/g) ?? []).length, 1)
  assert.match(missing, /src="\/images\/logo.png"/)
  assert.match(missing, /aria-label="Example Docs"/)
})
