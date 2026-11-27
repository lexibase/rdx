import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  portugueseLabels,
  pt,
  registerPortuguese,
} from './helpers/portuguese.mjs'

const jiti = createJiti(import.meta.url, {
  moduleCache: true,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { getMessages, formatMessage, interfaceTexts, registerInterfaceLabels } =
  await jiti.import('../../rdx-ui/src/lib/i18n.ts')
const { LocaleProvider } = await jiti.import(
  '../../rdx-ui/src/providers/locale-provider.tsx'
)
const { CopyCodeButton } = await jiti.import(
  '../../rdx-ui/src/components/copy-code-button.tsx'
)
const { Tabs, TabsList, TabsTrigger, TabsContent } = await jiti.import(
  '../../rdx-ui/src/components/tabs.tsx'
)
const { FooterCredit } = await jiti.import(
  '../../rdx-ui/src/components/footer-credit.tsx'
)
const { VersionNotice } = await jiti.import(
  '../../rdx-ui/src/components/version-notice.tsx'
)
const { Navbar } = await jiti.import('../../rdx-ui/src/components/navbar.tsx')
const { NotFound } = await jiti.import(
  '../../rdx-ui/src/components/not-found.tsx'
)
const { getMdxComponents } = await jiti.import(
  '../../rdx-ui/src/components/mdx-components.tsx'
)
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')
await registerPortuguese(jiti)

test('RDX ships English only: a language without a catalog uses English text', () => {
  for (const lang of [undefined, '', 'en', 'en-GB', 'pt', 'pt-PT', 'fr-FR']) {
    assert.equal(getMessages(lang).onThisPage, 'On this page')
  }
  // The test catalog is registered for pt-BR exactly, not for every pt tag.
  assert.equal(getMessages('pt-BR').onThisPage, pt('On this page'))
  assert.equal(getMessages('pt_br').onThisPage, pt('On this page'))
  const english = getMessages('en')
  const portuguese = getMessages('pt-BR')
  for (const key of Object.keys(english)) assert.ok(portuguese[key].trim(), key)
  assert.equal(
    formatMessage(portuguese.version, { version: '1.0.0' }),
    pt('Version 1.0.0')
  )
  assert.equal(
    formatMessage(portuguese.documentationVersion, { version: '<Custom>' }),
    pt('Documentation version: <Custom>')
  )
})

test('the test catalog covers every interface text', () => {
  assert.deepEqual(
    Object.keys(portugueseLabels).sort(),
    [...interfaceTexts].sort()
  )
})

function localized(lang, content) {
  return renderToStaticMarkup(createElement(LocaleProvider, { lang }, content))
}

test('shared 404 preserves the development layout, translated guidance and native return links', () => {
  for (const lang of ['en', 'pt-BR']) {
    const messages = getMessages(lang)
    const html = localized(
      lang,
      createElement(NotFound, { href: '/docs/1.0.0', lang })
    )
    assert.match(html, /data-rdx-not-found/)
    assert.match(html, /id="rdx-main"/)
    assert.match(html, /<h1\b[^>]*>404<\/h1>/)
    assert.match(html, /text-9xl/)
    assert.ok(html.includes(messages.notFound))
    assert.ok(html.includes(messages.brokenLink))
    assert.ok(html.includes(messages.backToDocs))
    assert.match(html, /<a\b[^>]*href="\/docs\/1.0.0"/)
    assert.doesNotMatch(html, /role="button"/)
  }
})

test('server-rendered client labels use the configured language with no cross-render locale leakage', () => {
  const tab = createElement(
    Tabs,
    { defaultValue: 'example' },
    createElement(
      TabsList,
      { 'aria-label': 'Author label' },
      createElement(TabsTrigger, { value: 'example' }, 'My example')
    ),
    createElement(TabsContent, { value: 'example' }, 'Author content')
  )
  const content = createElement('div', null, createElement(CopyCodeButton), tab)
  for (const lang of ['pt-BR', 'en', 'pt', 'fr']) {
    const html = localized(lang, content)
    assert.ok(html.includes(`aria-label="${getMessages(lang).copyCode}"`))
    assert.ok(html.includes(`aria-label="${getMessages(lang).copyTab}"`))
    assert.match(html, /Author content/)
    assert.match(html, /aria-label="Author label"/)
  }
})

test('shared server UI translates credits and version notices without changing brands, names or links', () => {
  for (const lang of ['pt-BR', 'en']) {
    const messages = getMessages(lang)
    const footer = renderToStaticMarkup(
      createElement(FooterCredit, { lang, name: 'Author brand', since: 2020 })
    )
    assert.ok(footer.includes(messages.poweredBy))
    assert.match(footer, /Author brand/)
    assert.match(footer, /href="https:\/\/github.com\/lexibase\/rdx"/)
    assert.match(footer, />RDX<\/a>/)
    for (const kind of ['canary', 'outdated']) {
      const notice = renderToStaticMarkup(
        createElement(VersionNotice, { lang, kind, currentHref: '/docs/1.0.0' })
      )
      assert.ok(
        notice.includes(
          kind === 'canary'
            ? messages.preReleaseMessage
            : messages.outdatedMessage
        )
      )
      assert.ok(notice.includes(messages.backToCurrent))
      assert.match(notice, /href="\/docs\/1.0.0"/)
    }
    const navbar = renderToStaticMarkup(
      createElement(Navbar, {
        lang,
        siteTitle: 'Author brand',
        title: 'Custom navbar',
      })
    )
    assert.ok(navbar.includes(`aria-label="${messages.mainNavigation}"`))
    assert.match(navbar, /Custom navbar/)
    // A visible title names the home link, so the label cannot contradict it.
    assert.doesNotMatch(navbar, /aria-label="Author brand"/)
    const logoOnlyNavbar = renderToStaticMarkup(
      createElement(Navbar, { lang, siteTitle: 'Author brand' })
    )
    assert.match(logoOnlyNavbar, /aria-label="Author brand"/)
  }
})

test('localized MDX keeps author text and code intact while translating generated labels', async () => {
  const source =
    '# Author heading\n\nAuthor paragraph.\n\n| Author column | Value |\n| --- | --- |\n| Author row | Data |\n\n```\nconsole.log("Author code")\n```\n'
  const { content } = await compileDocumentation(
    source,
    getMdxComponents('pt-BR')
  )
  const html = localized('pt-BR', content)
  assert.ok(html.includes(`aria-label="${pt('Table')}"`))
  assert.ok(html.includes(`${pt('Code')}</div>`))
  assert.ok(html.includes(`aria-label="${pt('Copy code')}"`))
  assert.ok(html.includes(`aria-label="${pt('Wrap lines')}"`))
  assert.match(html, /Author heading/)
  assert.match(html, /Author paragraph/)
  assert.match(html, /Author row/)
  assert.match(html, /Author code/)
})

test('every English interface text is unique, so _labels.json keys are unambiguous', () => {
  assert.equal(new Set(interfaceTexts).size, interfaceTexts.length)
})

test('project catalogs translate the interface, keep placeholders and fall back in order', (t) => {
  t.after(() => {
    registerInterfaceLabels('es-ES', undefined)
    registerInterfaceLabels('pt-BR', portugueseLabels)
  })
  registerInterfaceLabels('es-ES', {
    'On this page': 'En esta página',
    'Version {version}': 'Versión',
    'Copy code': '   ',
  })
  const spanish = getMessages('es-ES')
  assert.equal(spanish.onThisPage, 'En esta página')
  // A translation that drops {version} would hide the number: keep English.
  assert.equal(spanish.version, 'Version {version}')
  assert.equal(spanish.copyCode, 'Copy code')
  assert.equal(getMessages('es').onThisPage, 'On this page')
  registerInterfaceLabels('pt-BR', { 'On this page': 'Neste documento' })
  assert.equal(getMessages('pt-BR').onThisPage, 'Neste documento')
  // Entries the catalog leaves out use English: nothing else is built in.
  assert.equal(getMessages('pt-BR').copyCode, 'Copy code')
  const html = renderToStaticMarkup(
    createElement(
      LocaleProvider,
      { lang: 'es-ES', labels: { 'Copy code': 'Copiar código (es)' } },
      createElement(CopyCodeButton)
    )
  )
  assert.ok(html.includes('aria-label="Copiar código (es)"'))
})
