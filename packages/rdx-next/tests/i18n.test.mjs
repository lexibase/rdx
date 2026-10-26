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
const { getMessages, resolveInterfaceLocale, formatMessage } =
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
const { getMdxComponents } = await jiti.import(
  '../../rdx-ui/src/components/mdx-components.tsx'
)
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')

test('interface locales have complete catalogs and predictable base-language and English fallbacks', () => {
  for (const lang of ['pt-BR', 'pt-br', 'PT_br', 'pt', 'pt-PT']) {
    assert.equal(resolveInterfaceLocale(lang), 'pt-BR')
    assert.equal(getMessages(lang).onThisPage, 'Nesta página')
  }
  for (const lang of [undefined, '', 'en', 'en-GB', 'fr-FR', 'x-unsupported']) {
    assert.equal(resolveInterfaceLocale(lang), 'en')
    assert.equal(getMessages(lang).onThisPage, 'On this page')
  }
  const english = getMessages('en')
  const portuguese = getMessages('pt-BR')
  assert.deepEqual(Object.keys(portuguese).sort(), Object.keys(english).sort())
  for (const key of Object.keys(english)) {
    assert.ok(portuguese[key].trim(), key)
    assert.deepEqual(
      portuguese[key].match(/\{\w+\}/g),
      english[key].match(/\{\w+\}/g),
      key
    )
  }
  assert.equal(
    formatMessage(portuguese.version, { version: '1.0.0' }),
    'Versão 1.0.0'
  )
  assert.equal(
    formatMessage(portuguese.documentationVersion, { version: '<Custom>' }),
    'Versão da documentação: <Custom>'
  )
})

function localized(lang, content) {
  return renderToStaticMarkup(createElement(LocaleProvider, { lang }, content))
}

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
  assert.match(html, /aria-label="Tabela"/)
  assert.match(html, />Código<\/span>/)
  assert.match(html, /aria-label="Copiar código"/)
  assert.match(html, /Author heading/)
  assert.match(html, /Author paragraph/)
  assert.match(html, /Author row/)
  assert.match(html, /Author code/)
})
