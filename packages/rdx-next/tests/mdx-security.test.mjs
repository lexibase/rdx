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
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')
const { mdxComponents } = await jiti.import(
  '../../rdx-ui/src/components/mdx-components.tsx'
)
const { Callout } = await jiti.import('../../rdx-ui/src/components/callout.tsx')

test('shared MDX renders GFM, headings, code, images and Callout without imports', async () => {
  const { content } = await compileDocumentation(
    `#### Details

##### More details

###### Small heading

| Feature | Status |
| :------ | -----: |
| Callout | Ready |

- [x] Done
- [ ] Pending

~~Removed~~

---

![Example](/images/example.svg)

<Callout variant="warning" title="Before updating">

Read **release notes** and [the guide](/docs/init/intro).

- Keep your files.
- Test first.

</Callout>

\`\`\`ts
const framework = 'RDX'
\`\`\`
`,
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /<h4\b[^>]*>Details<\/h4>/)
  assert.match(html, /<h5\b/)
  assert.match(html, /<h6\b/)
  assert.match(html, /data-slot="mdx-table-scroll"/)
  assert.match(html, /<th\b[^>]*scope="col"/)
  assert.match(html, /text-align:right/)
  assert.match(html, /<td\b[^>]*>Ready<\/td>/)
  assert.match(html, /type="checkbox"[^>]*disabled=""[^>]*checked=""/)
  assert.match(html, /<del>Removed<\/del>/)
  assert.match(html, /<hr\b/)
  assert.match(html, /<img\b[^>]*alt="Example"[^>]*max-w-full/)
  assert.match(
    html,
    /role="note"[^>]*aria-label="Before updating"[^>]*data-rdx-callout="warning"/
  )
  assert.match(html, /<strong>release notes<\/strong>/)
  assert.match(html, /href="\/docs\/init\/intro"/)
  assert.match(html, /<pre\b[^>]*tabindex="0"/)
  assert.match(html, /class="[^"]*language-ts/)
  assert.doesNotMatch(html, /role="alert"|aria-live=/)
})

test('Callout supports all variants, optional titles, safe defaults and class overrides', () => {
  for (const variant of ['note', 'tip', 'success', 'warning', 'danger']) {
    const html = renderToStaticMarkup(
      createElement(
        Callout,
        { variant, title: 'Title', className: 'my-2', id: variant },
        'Body'
      )
    )
    assert.match(html, new RegExp(`data-rdx-callout="${variant}"`))
    assert.match(html, /aria-hidden="true"/)
    assert.match(html, /my-2/)
    assert.doesNotMatch(html, /my-6/)
    assert.match(html, /Body/)
  }
  const html = renderToStaticMarkup(createElement(Callout, {}, 'Body'))
  assert.match(html, /aria-label="Note"/)
  assert.doesNotMatch(html, /data-slot="callout-title"/)
  for (const variant of ['unknown', '__proto__']) {
    assert.throws(
      () => renderToStaticMarkup(createElement(Callout, { variant }, 'Body')),
      /Invalid Callout variant/
    )
  }
  const heading = renderToStaticMarkup(
    createElement(
      mdxComponents.h2,
      { className: 'my-2', id: 'custom' },
      'Custom'
    )
  )
  assert.match(heading, /text-2xl font-bold my-2/)
  assert.doesNotMatch(heading, /my-6/)
})

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
