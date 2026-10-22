import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false })
const uiRequire = createRequire(
  new URL('../../rdx-ui/package.json', import.meta.url)
)

test('shared class merging preserves theme, dimensions and dropdown animation variants', async () => {
  const { cn } = await jiti.import('../../rdx-ui/src/lib/utils.ts')
  assert.equal(cn('flex', false, { hidden: true }), 'hidden')
  assert.equal(cn('text-sm', 'text-primary'), 'text-sm text-primary')
  assert.equal(cn('bg-primary', 'bg-secondary'), 'bg-secondary')
  assert.equal(cn('size-4', 'h-6'), 'size-4 h-6')
  assert.equal(cn('max-h-(--rdx-height)', 'max-h-96'), 'max-h-96')
  assert.equal(
    cn('data-open:animate-in', 'data-closed:animate-out'),
    'data-open:animate-in data-closed:animate-out'
  )
})

test('Base UI state class callbacks preserve the shared theme and consumer overrides', async () => {
  const { mergeStateClassName } = await jiti.import(
    '../../rdx-ui/src/lib/utils.ts'
  )
  assert.equal(mergeStateClassName('h-8 bg-primary', 'h-10'), 'bg-primary h-10')
  const classes = mergeStateClassName('h-8 bg-primary', (state) =>
    state.disabled ? 'bg-secondary' : undefined
  )
  assert.equal(classes({ disabled: true }), 'h-8 bg-secondary')
  assert.equal(classes({ disabled: false }), 'h-8 bg-primary')
})

test('icons used by the RDX navbar, versions, theme and sidebar remain renderable', () => {
  const icons = uiRequire('lucide-react')
  for (const name of [
    'Github',
    'Archive',
    'Bird',
    'PackageOpen',
    'SidebarOpen',
    'SidebarClose',
    'SunMoon',
  ]) {
    assert.ok(icons[name], `Missing RDX icon: ${name}`)
    const html = renderToStaticMarkup(
      createElement(icons[name], { className: 'size-5' })
    )
    assert.match(html, /^<svg\b/)
    assert.match(html, /size-5/)
    assert.match(html, /<(path|circle|rect|line|polyline|polygon|ellipse)\b/)
  }
})
