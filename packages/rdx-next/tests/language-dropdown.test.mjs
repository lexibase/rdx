import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
import { Children, createElement, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { pt, registerPortuguese } from './helpers/portuguese.mjs'

const jiti = createJiti(import.meta.url, {
  moduleCache: true,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
await registerPortuguese(jiti)
const { LanguageDropdown } = await jiti.import(
  '../../rdx-ui/src/components/language-dropdown.tsx'
)
const options = [
  { code: 'en', label: 'English', href: '/en/docs/intro' },
  { code: 'pt-BR', label: 'Português', href: '/pt-br/docs/intro' },
]

// Run the registration hooks through React, then inspect the composition.
function composition(props) {
  let tree
  function Inspect() {
    tree = LanguageDropdown(props)
    return null
  }
  renderToStaticMarkup(createElement(Inspect))
  return tree
}

function nodes(tree, predicate) {
  const result = []
  Children.forEach(tree, (child) => {
    if (!isValidElement(child)) return
    if (predicate(child)) result.push(child)
    result.push(...nodes(child.props.children, predicate))
  })
  return result
}

test('language menu keeps all configured languages and omits contribution controls without a URL', () => {
  const tree = composition({ options, current: 'en' })
  assert.equal(
    nodes(tree, (node) => node.type.name === 'DropdownMenuLinkItem').length,
    2
  )
  assert.equal(
    nodes(tree, (node) => node.type.name === 'DropdownMenuSeparator').length,
    0
  )
  assert.equal(
    nodes(tree, (node) => node.props['data-rdx-help-translate'] !== undefined)
      .length,
    0
  )
})

test('switching languages uses native links to load the new locale document', () => {
  const tree = composition({ options, current: 'en' })
  const items = nodes(tree, (node) => node.type.name === 'DropdownMenuLinkItem')
  assert.deepEqual(
    items.map(({ props }) => ({
      type: props.render.type,
      href: props.render.props.href,
      hrefLang: props.render.props.hrefLang,
    })),
    options.map(({ code, href }) => ({ type: 'a', href, hrefLang: code }))
  )
})

test('language menu adds a separated, localized external contribution link', () => {
  const url = 'https://github.com/example/project/tree/main/locale'
  for (const [lang, label, newTab] of [
    ['en', 'Help translate', 'opens in a new tab'],
    ['pt-BR', pt('Help translate'), pt('opens in a new tab')],
  ]) {
    const tree = composition({
      options,
      current: lang,
      lang,
      contributionUrl: url,
    })
    assert.equal(
      nodes(tree, (node) => node.type.name === 'DropdownMenuSeparator').length,
      1
    )
    const [item] = nodes(
      tree,
      (node) => node.props['data-rdx-help-translate'] !== undefined
    )
    assert.equal(item.props.render.props.href, url)
    assert.equal(item.props.render.props.target, '_blank')
    assert.equal(item.props.render.props.rel, 'noopener noreferrer')
    assert.equal(item.props.closeOnClick, true)
    const html = renderToStaticMarkup(
      createElement('a', item.props.render.props, item.props.children)
    )
    assert.ok(html.includes(label))
    assert.ok(html.includes(newTab))
  }
})
