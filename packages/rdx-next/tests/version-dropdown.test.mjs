import assert from 'node:assert/strict'
import test from 'node:test'

import { createJiti } from 'jiti'
import { Children, createElement, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, {
  moduleCache: true,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { VersionDropdown } = await jiti.import(
  '../../rdx-ui/src/components/version-dropdown.tsx'
)

function option(kind) {
  return { id: kind, kind, label: kind, href: `/docs/${kind}` }
}

// Run locale hooks through React, then inspect composition before portals mount.
function composition(props) {
  let tree
  function Inspect() {
    tree = VersionDropdown(props)
    return null
  }
  renderToStaticMarkup(createElement(Inspect))
  return tree
}

function countSeparators(node) {
  let count = 0
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return
    if (child.type.name === 'DropdownMenuSeparator') count++
    count += countSeparators(child.props.children)
  })
  return count
}

for (const [kinds, footer, expected] of [
  [['live'], undefined, 0],
  [['version'], undefined, 0],
  [['live', 'version'], undefined, 1],
  [['live', 'version', 'version'], undefined, 1],
  // Archived has its own label separator, plus a boundary when preceded.
  [['archived'], undefined, 1],
  [['live', 'archived'], undefined, 2],
  [['version', 'archived'], undefined, 2],
  [['live', 'version', 'archived'], undefined, 3],
  [['live'], createElement('span', null, 'Footer item'), 1],
  [['live'], false, 0],
]) {
  test(`version dropdown separators: ${kinds.join(', ')}${footer ? ' with footer' : ''}`, () => {
    const options = kinds.map((kind, index) => ({
      ...option(kind),
      id: `${kind}-${index}`,
    }))
    const tree = composition({ options, currentId: options[0].id, footer })
    assert.equal(countSeparators(tree), expected)
  })
}

test('an empty version list renders no dropdown', () => {
  assert.equal(composition({ options: [], currentId: 'current' }), null)
})

test('version trigger uses content width on mobile and preserves desktop spacing', () => {
  const tree = composition({ options: [option('live')], currentId: 'live' })
  const trigger = Children.toArray(tree.props.children)[0]
  const button = trigger.props.render
  assert.match(button.props.className, /(?:^| )min-w-0(?: |$)/)
  assert.match(button.props.className, /sm:min-w-\[134px\]/)
  const icon = Children.toArray(trigger.props.children)[1]
  assert.match(icon.props.className, /(?:^| )ml-0(?: |$)/)
  assert.match(icon.props.className, /sm:ml-auto/)
  assert.equal(button.props['aria-label'], 'Documentation version: live')
})
