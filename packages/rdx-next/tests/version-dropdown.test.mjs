import assert from 'node:assert/strict'
import test from 'node:test'

import { createJiti } from 'jiti'
import { Children, createElement, isValidElement } from 'react'

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

// Inspect the composition before Base UI portals mount. No hooks or primitive
// behavior is mocked: this regression concerns which separators RDX provides.
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
    const tree = VersionDropdown({ options, currentId: options[0].id, footer })
    assert.equal(countSeparators(tree), expected)
  })
}

test('an empty version list renders no dropdown', () => {
  assert.equal(VersionDropdown({ options: [], currentId: 'current' }), null)
})
