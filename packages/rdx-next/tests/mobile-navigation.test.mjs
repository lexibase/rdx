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
const { Navbar } = await jiti.import('../../rdx-ui/src/components/navbar.tsx')
const { getMessages } = await jiti.import('../../rdx-ui/src/lib/i18n.ts')
const { LocaleProvider } = await jiti.import(
  '../../rdx-ui/src/providers/locale-provider.tsx'
)

function render(props = {}) {
  return renderToStaticMarkup(
    createElement(
      LocaleProvider,
      { lang: props.lang },
      createElement(Navbar, {
        siteTitle: 'Atlas',
        changelogHref: '/changelog',
        github: { visible: true, url: 'https://github.com/example/atlas' },
        showToggleMode: true,
        versionMenu: createElement('span', { 'data-version-menu': '' }),
        languageMenu: createElement('span', { 'data-language-menu': '' }),
        ...props,
      })
    )
  )
}

test('narrow screens get one menu trigger whose label follows the page type', () => {
  for (const lang of ['en', 'pt-BR']) {
    const messages = getMessages(lang)
    const html = render({ lang })
    const trigger = html.match(
      /<button[^>]*data-rdx-menu-trigger[^>]*>.*?<\/button>/s
    )
    assert.ok(trigger, 'The navbar renders the mobile menu trigger.')
    // Pages with a docs sidebar show its icon; other pages show the menu icon.
    assert.ok(trigger[0].includes(messages.openMenu))
    assert.ok(trigger[0].includes(messages.openSidebar))
    assert.match(
      trigger[0],
      /class="contents \[body:has\(\[data-rdx-sidebar\]\)_&amp;\]:hidden"/
    )
    assert.match(
      trigger[0],
      /class="hidden \[body:has\(\[data-rdx-sidebar\]\)_&amp;\]:contents"/
    )
  }
})

test('wide-screen menus stay mounted behind the md breakpoint for the drawer', () => {
  const html = render()
  const desktop = html.match(
    /<div class="hidden md:flex items-center gap-x-2 h-4">(.*?)<\/div><div class="md:hidden">/s
  )
  assert.ok(desktop, 'Version, language, links and actions share one wrapper.')
  for (const marker of [
    'data-version-menu',
    'data-language-menu',
    'href="/changelog"',
    'aria-label="GitHub"',
  ])
    assert.ok(desktop[1].includes(marker), marker)
  // The drawer content mounts only when opened, so nothing is duplicated now.
  assert.equal(html.match(/data-version-menu/g).length, 1)
})

test('a navbar without optional menus still offers the drawer for site links', () => {
  const html = renderToStaticMarkup(createElement(Navbar, {}))
  assert.match(html, /data-rdx-menu-trigger/)
  assert.doesNotMatch(html, /aria-label="GitHub"/)
})

test('the menu trigger closes the navbar row, after the logo and search', () => {
  const html = render({
    search: createElement('span', { 'data-search': '' }),
  })
  const logo = html.indexOf('aria-label="Atlas"')
  const search = html.indexOf('data-search')
  const trigger = html.indexOf('data-rdx-menu-trigger')
  assert.ok(logo >= 0 && search > logo && trigger > search)
})
