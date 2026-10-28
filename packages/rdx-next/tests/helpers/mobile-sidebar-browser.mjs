import assert from 'node:assert/strict'

/** Exercise the shared sidebar in a real page, including its exit lifecycle. */
export async function verifyMobileSidebarMotion(page, base) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`${base}/docs/init/intro`)
  const trigger = page.getByRole('button', {
    name: 'Open sidebar',
    exact: true,
  })
  const panel = page.getByRole('dialog', {
    name: 'Documentation navigation',
    exact: true,
  })
  const close = panel.getByRole('button', {
    name: 'Close sidebar',
    exact: true,
  })

  async function startTrace() {
    await page.evaluate(() => {
      window.__rdxSidebarTrace = []
      window.__rdxSidebarTracing = true
      function sample() {
        const element = document.querySelector('[data-rdx-mobile-sidebar]')
        if (element) {
          const { x, width } = element.getBoundingClientRect()
          window.__rdxSidebarTrace.push({
            x,
            width,
            links: element.querySelectorAll('nav a').length,
          })
        }
        if (window.__rdxSidebarTracing) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
  }
  async function stopTrace() {
    return page.evaluate(() => {
      window.__rdxSidebarTracing = false
      return window.__rdxSidebarTrace
    })
  }
  async function settled() {
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-rdx-mobile-sidebar]')
      return element && Math.abs(element.getBoundingClientRect().x) < 0.5
    })
  }
  async function removed() {
    await page.waitForFunction(
      () => !document.querySelector('[data-rdx-mobile-sidebar]')
    )
    assert.equal(await page.locator('[data-slot="sheet-overlay"]').count(), 0)
  }

  await startTrace()
  await trigger.click()
  await settled()
  const entrance = await stopTrace()
  assert.ok(
    entrance.some((frame) => frame.x < -1 && frame.x > -frame.width),
    'The menu must slide in from the left.'
  )
  assert.ok(Math.abs((await panel.boundingBox()).width - 390) < 1)
  await page.keyboard.press('Tab')
  assert.ok(
    await panel.evaluate((element) => element.contains(document.activeElement)),
    'Focus must stay inside the mobile menu.'
  )
  await startTrace()
  await close.click()
  await removed()
  const exit = await stopTrace()
  assert.ok(
    exit.some((frame) => frame.x < -1 && frame.x > -frame.width),
    'Closing must animate toward the left.'
  )
  assert.ok(
    exit.filter((frame) => frame.x < -1).every((frame) => frame.links > 0),
    'Navigation must remain rendered throughout exit.'
  )
  assert.ok(
    await trigger.evaluate((element) => document.activeElement === element)
  )

  await trigger.click()
  await settled()
  await page.keyboard.press('Escape')
  await removed()
  assert.ok(
    await trigger.evaluate((element) => document.activeElement === element)
  )
  // Closing before the entry spring settles must still complete cleanup.
  for (let attempt = 0; attempt < 2; attempt++) {
    await trigger.click()
    await close.evaluate((element) => element.click())
    await removed()
    assert.ok(
      await trigger.evaluate((element) => document.activeElement === element)
    )
  }
  await trigger.click()
  await settled()
  await panel
    .getByRole('link', { name: 'Getting started', exact: true })
    .click()
  await page.waitForURL('**/docs/init/getting-started')
  await removed()
  await trigger.click()
  await settled()
  await page.goBack()
  await page.waitForURL('**/docs/init/intro')
  await removed()

  await trigger.click()
  await settled()
  await page.setViewportSize({ width: 1024, height: 844 })
  await removed()
  assert.ok(await page.locator('[data-rdx-sidebar]').isVisible())
  assert.equal(await trigger.isVisible(), false)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Reload also verifies the preference is honored on initial hydration.
  await page.reload()
  await trigger.click()
  await settled()
  await close.click()
  await removed()
  assert.ok(
    await trigger.evaluate((element) => document.activeElement === element)
  )
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}
