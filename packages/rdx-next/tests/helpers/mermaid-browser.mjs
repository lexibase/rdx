import assert from 'node:assert/strict'

/** Shared by the runtime browser suite and focused diagram QA. */
export async function verifyMermaid(page, base) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(`${base}/docs/init/mermaid`)
  const block = (title) =>
    page.locator('[data-rdx-code-mode="mermaid"]').filter({
      has: page.locator(`[data-slot="code-block-title"][title="${title}"]`),
    })
  async function preview(title) {
    const element = block(title)
    await element.scrollIntoViewIfNeeded()
    const image = element.locator('[data-rdx-mermaid-preview] img')
    await image.waitFor({ timeout: 90_000 })
    await image.evaluate((element) => element.decode())
    assert.ok(
      await image.evaluate(
        (element) => element.naturalWidth > 30 && element.naturalHeight > 30
      )
    )
    return image
  }
  const first = await preview('Request flow')
  assert.match(
    await first.getAttribute('alt'),
    /A document is written, previewed, and published/
  )
  const flow = block('Request flow')
  await flow
    .getByRole('button', { name: 'Show diagram source', exact: true })
    .click()
  assert.equal(await flow.locator('pre').getAttribute('data-numbered'), 'true')
  assert.match(await flow.locator('pre').getAttribute('style'), /line 7/)
  const source = await flow.getAttribute('data-rdx-code-value')
  await flow.getByRole('button', { name: 'Copy code', exact: true }).click()
  await flow
    .locator('[data-slot="code-block-copy-button"][data-copied]')
    .waitFor()
  assert.equal(
    (await page.evaluate(() => navigator.clipboard.readText())).replaceAll(
      '\r\n',
      '\n'
    ),
    source.replaceAll('\r\n', '\n')
  )
  await flow.getByRole('button', { name: 'Show diagram', exact: true }).click()
  const expand = flow.getByRole('button', {
    name: 'Enlarge diagram',
    exact: true,
  })
  await expand.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Request flow', exact: true })
  await dialog.waitFor()
  await dialog.locator('img').evaluate((image) => image.decode())
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  assert.ok(
    await expand.evaluate((element) => document.activeElement === element)
  )
  await preview('Request sequence')
  const invalid = block('Invalid definition')
  await invalid.scrollIntoViewIfNeeded()
  await invalid
    .getByRole('status')
    .filter({ hasText: 'Could not render this diagram' })
    .waitFor()
  assert.match(
    await invalid.locator('pre').innerText(),
    /not a Mermaid diagram/
  )
  await preview('After invalid definition')
  const secure = await preview('Strict diagram')
  const svg = decodeURIComponent(
    (await secure.getAttribute('src')).split(',').slice(1).join(',')
  )
  assert.ok(
    !/<a[^>]+(?:href|xlink:href)=|<script[\s>]|<foreignObject[\s>]|body\s*\{\s*display:\s*none/.test(
      svg
    ),
    'Strict rendering must reject unsafe links, HTML labels and configuration overrides.'
  )
  assert.equal(await block('Tab diagram').locator('img').count(), 0)
  await page.getByRole('tab', { name: 'Diagram example', exact: true }).click()
  await preview('Tab diagram')
  await page
    .getByRole('button', { name: 'Copy active tab', exact: true })
    .click()
  await page
    .locator('[data-slot="tabs-header"] button[data-status="copied"]')
    .waitFor()
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /flowchart LR\r?\n {4}A\[Inside\] --> B\[A tab\]/
  )
  const toggle = page.getByRole('button', { name: 'Mode Toggle', exact: true })
  if (await toggle.count()) {
    const before = await flow
      .locator('[data-rdx-mermaid-preview] img')
      .getAttribute('src')
    const dark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )
    await toggle.click()
    // The first click selects dark when the initial theme is system.
    if (
      (await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      )) === dark
    )
      await toggle.click()
    await page.waitForFunction((before) => {
      const image = document.querySelector(
        '[data-rdx-code-mode="mermaid"] [data-rdx-mermaid-preview] img'
      )
      return image && image.getAttribute('src') !== before
    }, before)
    const updated = decodeURIComponent(
      (await flow.locator('[data-rdx-mermaid-preview] img').getAttribute('src'))
        .split(',')
        .slice(1)
        .join(',')
    )
    assert.ok(
      updated.includes(dark ? 'fill:#18181b' : 'fill:#fafafa'),
      'Changing the site theme must recolor existing diagrams.'
    )
  }
  assert.equal(await page.locator('body > [id^="drdx-mermaid-"]').count(), 0)
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  )
}
