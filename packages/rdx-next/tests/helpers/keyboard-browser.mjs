import assert from 'node:assert/strict'

/** Inspect the browser accessibility tree; this does not simulate spoken output. */
export async function verifyKeyboardShortcuts(
  page,
  base,
  { lang = 'en', route = '/docs/init/keyboard' } = {}
) {
  await page.goto(`${base}${route}`)
  const expected = lang === 'pt-BR' ? 'Control mais K' : 'Control plus K'
  const paragraph = page
    .locator('p')
    .filter({ hasText: 'Open search with' })
    .first()
  const snapshot = await paragraph.ariaSnapshot()
  assert.equal(
    snapshot.split(expected).length - 1,
    1,
    'One accessible text alternative for the complete shortcut'
  )
  assert.doesNotMatch(snapshot, /Ctrl|\+/)
  assert.equal(
    await paragraph.locator('[aria-hidden="true"] [data-slot="kbd"]').count(),
    2,
    'Visual keys remain the shared shadcn components'
  )
  assert.equal(
    await paragraph.locator('button, a, [tabindex]').count(),
    0,
    'Static shortcuts never enter the tab order'
  )
  const context = page.context()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(base).origin,
  })
  const guide = page.getByRole('tab', { name: 'Guide', exact: true })
  await guide.focus()
  await page.keyboard.press('Tab')
  const copy = page.getByRole('button', {
    name: lang === 'pt-BR' ? 'Copiar aba ativa' : 'Copy active tab',
    exact: true,
  })
  assert.equal(
    await copy.evaluate((node) => node === document.activeElement),
    true,
    'Keyboard navigation reaches the copy control'
  )
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    async () => (await navigator.clipboard.readText()) === 'Press Ctrl + K now.'
  )
}
