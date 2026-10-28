import assert from 'node:assert/strict'

export async function verifyMobilePageTransitions(page, base) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`${base}/docs/init/intro`)
  const next = page.locator('footer a[href^="/docs/"]').last()
  const nextHref = await next.getAttribute('href')

  async function trace(action, href) {
    await page.evaluate(() => {
      window.__rdxPageTrace = []
      window.__rdxPageTracing = true
      function sample() {
        for (const animation of document.getAnimations()) {
          if (animation.animationName?.startsWith('rdx-page-')) {
            window.__rdxPageTrace.push({
              name: animation.animationName,
              pseudo: animation.effect.pseudoElement,
              frames: animation.effect.getKeyframes(),
              time: animation.currentTime,
            })
          }
        }
        if (window.__rdxPageTracing) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await action()
    await page.waitForURL(`${base}${href}`)
    await page.waitForTimeout(400)
    return page.evaluate(() => {
      window.__rdxPageTracing = false
      return window.__rdxPageTrace
    })
  }

  function assertDirection(samples, offset) {
    const entering = samples.find((sample) => sample.name === 'rdx-page-enter')
    const exiting = samples.find((sample) => sample.name === 'rdx-page-exit')
    assert.ok(entering && exiting, 'Both document snapshots should animate')
    assert.equal(entering.frames[0].transform, `translateX(${offset}px)`)
    assert.equal(exiting.frames.at(-1).transform, `translateX(${-offset}px)`)
    assert.ok(samples.every((sample) => sample.pseudo.includes('rdx-document')))
    assert.ok(samples.some((sample) => sample.time > 0 && sample.time < 220))
  }

  // Keyboard activation uses the same Next Link transition as pointer activation.
  assertDirection(
    await trace(async () => {
      await next.focus()
      await page.keyboard.press('Enter')
    }, nextHref),
    48
  )
  const previous = page.locator('footer a[href="/docs/init/intro"]')
  assertDirection(await trace(() => previous.click(), '/docs/init/intro'), -48)

  await page.getByRole('button', { name: 'Open sidebar', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Documentation navigation' })
  await panel.waitFor()
  assertDirection(
    await trace(() => panel.locator(`a[href="${nextHref}"]`).click(), nextHref),
    48
  )
  await panel.waitFor({ state: 'hidden' })

  // Browser history remains native and does not invent a direction or a gesture.
  await trace(() => page.goBack(), '/docs/init/intro')
  await trace(() => page.goForward(), nextHref)
  const hash = await page.evaluate(
    () => document.querySelector('#rdx-main [id]')?.id
  )
  if (hash) {
    const samples = await trace(
      () =>
        page.evaluate((id) => {
          location.hash = id
        }, hash),
      `${nextHref}#${encodeURIComponent(hash)}`
    )
    assert.equal(
      samples.length,
      0,
      'Section navigation must not slide the page'
    )
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(
    (await trace(() => previous.click(), '/docs/init/intro')).length,
    0
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 1280, height: 900 })
  assert.equal((await trace(() => next.click(), nextHref)).length, 0)
}
