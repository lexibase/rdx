import assert from 'node:assert/strict'

/**
 * Narrow phones must never scroll sideways, and the navbar must stay on one
 * row. Wide tables and code scroll inside their own containers instead.
 */
export async function verifyPageWidth(page, base, routes) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 700 })
    for (const route of routes) {
      await page.goto(`${base}${route}`)
      const metrics = await page.evaluate(() => {
        const navbar = document.querySelector('[data-rdx-navbar]')
        // Both halves are vertically centered, so one row shares one center.
        const centers = [...navbar.children].map((child) => {
          const { top, height } = child.getBoundingClientRect()
          return top + height / 2
        })
        return {
          page: document.documentElement.scrollWidth,
          viewport: innerWidth,
          navbarRows: Math.max(...centers) - Math.min(...centers) < 2 ? 1 : 2,
          trigger:
            document
              .querySelector('[data-rdx-menu-trigger]')
              ?.getBoundingClientRect().right ?? 0,
        }
      })
      assert.ok(
        metrics.page <= metrics.viewport,
        `${width}px ${route}: page is ${metrics.page}px wide`
      )
      assert.equal(metrics.navbarRows, 1, `${width}px ${route}: navbar wraps`)
      assert.ok(
        metrics.trigger > 0 && metrics.trigger <= metrics.viewport,
        `${width}px ${route}: menu button stays on screen`
      )
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}
