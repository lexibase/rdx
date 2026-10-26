import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
import { createElement } from 'react'
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
const { MdxImage } = await jiti.import(
  '../../rdx-ui/src/components/mdx-image.tsx'
)
const { LocaleProvider } = await jiti.import(
  '../../rdx-ui/src/providers/locale-provider.tsx'
)

test('Markdown images expose an accessible dialog trigger without changing the image attributes', async () => {
  const { content } = await compileDocumentation(
    '![Architecture diagram](/images/diagram.svg "Diagram title")',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /data-rdx-image-trigger/)
  assert.match(html, /aria-label="Enlarge image: Architecture diagram"/)
  assert.match(html, /aria-haspopup="dialog"/)
  assert.match(html, /src="\/images\/diagram.svg"/)
  assert.match(html, /alt="Architecture diagram"/)
  assert.match(html, /title="Diagram title"/)
  assert.doesNotMatch(html, /<p[^>]*><div/)
})

test('linked and decorative images retain native semantics, including nested link content', async () => {
  const { content } = await compileDocumentation(
    '[![Linked logo](/images/logo.svg)](https://example.com)\n\n[**![Nested linked image](/images/diagram.svg)**](https://example.com/docs)\n\n![](/images/decorative.svg)',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.doesNotMatch(html, /data-rdx-image-trigger|<button/)
  assert.equal((html.match(/<img\b/g) ?? []).length, 3)
  assert.match(html, /href="https:\/\/example.com"/)
  assert.match(html, /href="https:\/\/example.com\/docs"/)
  assert.match(html, /alt=""/)
})

test('image triggers are localized while author text and responsive image attributes are preserved', () => {
  const html = renderToStaticMarkup(
    createElement(
      LocaleProvider,
      { lang: 'pt-BR' },
      createElement(MdxImage, {
        src: '/images/small.png',
        srcSet: '/images/small.png 320w, /images/large.png 1280w',
        sizes: '320px',
        width: 320,
        height: 200,
        alt: 'Author diagram <safe>',
        className: 'w-32',
      })
    )
  )
  assert.match(html, /Ampliar imagem: Author diagram &lt;safe&gt;/)
  assert.match(html, /alt="Author diagram &lt;safe&gt;"/)
  assert.match(
    html,
    /srcSet="\/images\/small.png 320w, \/images\/large.png 1280w"/i
  )
  assert.match(html, /sizes="320px"/)
  assert.match(html, /width="320"/)
  assert.match(html, /height="200"/)
  assert.match(html, /w-32/)
  const plain = renderToStaticMarkup(
    createElement(MdxImage, { src: '/logo.svg', alt: 'Logo', zoom: false })
  )
  assert.doesNotMatch(plain, /<button/)
})
