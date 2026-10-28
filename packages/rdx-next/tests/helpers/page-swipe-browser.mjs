import assert from 'node:assert/strict'

export async function verifyMobilePageSwipe(page, base) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`${base}/docs/init/intro`)
  await page.waitForFunction(() =>
    document
      .querySelector('[data-rdx-docs-scroll]')
      ?.classList.contains('xl:motion-safe:scroll-smooth')
  )
  const nextHref = await page
    .locator('footer a[href^="/docs/"]')
    .last()
    .getAttribute('href')
  const cdp = await page.context().newCDPSession(page)
  async function swipe(dx, dy = 0, startY) {
    const title = await page
      .locator('[data-rdx-docs-scroll] h1')
      .first()
      .boundingBox()
    const x = dx < 0 ? 270 : 100
    const y = startY ?? title.y + title.height / 2
    const url = page.url()
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    })
    for (let step = 1; step <= 5; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + (dx * step) / 5, y: y + (dy * step) / 5 }],
      })
    }
    assert.equal(page.url(), url, 'Navigate only after the finger is released')
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
  }
  try {
    await swipe(-150)
    await page.waitForURL(`${base}${nextHref}`)
    await page.waitForTimeout(350)
    await swipe(150)
    await page.waitForURL(`${base}/docs/init/intro`)
    await page.waitForTimeout(350)

    // Controlled event sequences cover cancellation paths without browser gesture heuristics.
    async function ignored(options) {
      const url = page.url()
      await page.evaluate((options) => {
        const root = document.querySelector('[data-rdx-docs-scroll]')
        const host = document.createElement('div')
        host.innerHTML = options.html ?? '<p>Gesture test text</p>'
        root.append(host)
        const target = host.querySelector(options.target ?? 'p')
        const point = (x, y, id = 1) =>
          new Touch({ identifier: id, target, clientX: x, clientY: y })
        const x = options.x ?? 250
        const start = point(x, 250)
        const finish = point(x + (options.dx ?? -150), 250 + (options.dy ?? 0))
        const fire = (type, touches, changedTouches) =>
          target.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches,
              changedTouches,
            })
          )
        if (options.selection === 'before') {
          const range = document.createRange()
          range.selectNodeContents(target)
          getSelection().addRange(range)
        }
        fire('touchstart', [start], [start])
        if (options.selection === 'after') {
          const range = document.createRange()
          range.selectNodeContents(target)
          getSelection().addRange(range)
        }
        if (options.multiple)
          fire('touchmove', [finish, point(180, 300, 2)], [finish])
        else fire('touchmove', [finish], [finish])
        if (options.cancel) fire('touchcancel', [], [finish])
        fire('touchend', [], [finish])
        getSelection().removeAllRanges()
        host.remove()
      }, options)
      await page.waitForTimeout(80)
      assert.equal(page.url(), url, JSON.stringify(options))
    }
    for (const options of [
      { dx: 150 }, // No previous page at the beginning.
      { dx: -30 },
      { dx: -100, dy: 120 },
      { x: 10 },
      { x: 380, dx: -150 },
      { cancel: true },
      { multiple: true },
      { selection: 'before' },
      { selection: 'after' },
      { html: '<pre>code</pre>', target: 'pre' },
      {
        html: '<table><tbody><tr><td>cell</td></tr></tbody></table>',
        target: 'td',
      },
      { html: '<button>Button</button>', target: 'button' },
      { html: '<a href="#">Link</a>', target: 'a' },
      { html: '<input>', target: 'input' },
      {
        html: '<div contenteditable="true">Edit</div>',
        target: '[contenteditable]',
      },
      { html: '<div data-slot="tabs"><p>Tab content</p></div>' },
      { html: '<div data-rdx-code-block><p>Diagram</p></div>' },
      {
        html: '<div style="width:80px;overflow:auto"><p style="width:500px">Wide</p></div>',
      },
    ])
      await ignored(options)
    const introUrl = page.url()
    await page.locator('#rdx-main').evaluate((element) => {
      const filler = document.createElement('div')
      filler.id = 'swipe-scroll-test'
      filler.style.height = '2000px'
      element.append(filler)
    })
    await swipe(0, -180, 600)
    await page.waitForFunction(
      () => document.querySelector('[data-rdx-docs-scroll]').scrollTop > 20
    )
    assert.equal(
      page.url(),
      introUrl,
      'A vertical touch gesture must scroll without navigating'
    )
    await page.evaluate(() => {
      document.getElementById('swipe-scroll-test').remove()
      document
        .querySelector('[data-rdx-docs-scroll]')
        .scrollTo({ top: 0, behavior: 'instant' })
    })
    const lastHref = await page
      .locator('[data-rdx-sidebar] nav a')
      .last()
      .getAttribute('href')
    await page.goto(`${base}${lastHref}`)
    await page.waitForFunction(() =>
      document
        .querySelector('[data-rdx-docs-scroll]')
        ?.classList.contains('xl:motion-safe:scroll-smooth')
    )
    await swipe(-150)
    await page.waitForTimeout(100)
    assert.equal(
      page.url(),
      `${base}${lastHref}`,
      'The last page must not wrap to another document'
    )
    await page.goto(`${base}/docs/init/intro`)
    await page.waitForFunction(() =>
      document
        .querySelector('[data-rdx-docs-scroll]')
        ?.classList.contains('xl:motion-safe:scroll-smooth')
    )
    await page.setViewportSize({ width: 1280, height: 900 })
    await ignored({})
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await swipe(-150)
    await page.waitForURL(`${base}${nextHref}`)
    await page.goBack()
    await page.waitForURL(`${base}/docs/init/intro`)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  } finally {
    await cdp.detach()
  }
}
