import assert from 'node:assert/strict'

/** Exercise native fragment focus and subsequent keyboard navigation. */
export async function verifySkipLink(page, base, route = '/docs/init/intro') {
  await page.goto(`${base}${route}`)
  const skip = page.locator('a.rdx-skip-link')
  await skip.waitFor({ state: 'attached' })
  assert.equal(await skip.count(), 1)
  assert.equal(await page.locator('main').count(), 1)
  assert.equal(await page.locator('#rdx-main h1').count(), 1)
  assert.equal(await page.locator('#rdx-main').getAttribute('tabindex'), '-1')
  assert.ok((await skip.boundingBox()).y < 0, 'Hidden until keyboard focus')
  await page.keyboard.press('Tab')
  assert.equal(
    await skip.evaluate((node) => node === document.activeElement),
    true
  )
  assert.ok((await skip.boundingBox()).y >= 0, 'Focused link is on screen')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement?.id === 'rdx-main')
  await page.keyboard.press('Tab')
  assert.equal(
    await page.evaluate(() => {
      const main = document.getElementById('rdx-main')
      const active = document.activeElement
      // Continue inside the article or after it, never back in the navigation.
      return (
        main.contains(active) ||
        Boolean(
          main.compareDocumentPosition(active) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      )
    }),
    true,
    'Tab continues from the content rather than the navbar or sidebar'
  )
  assert.equal(
    await skip.evaluate((node) => node === document.activeElement),
    false
  )
}
