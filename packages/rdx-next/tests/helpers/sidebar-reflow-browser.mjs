import assert from 'node:assert/strict'

/** Narrow CSS viewports exercise reflow; they do not simulate native browser zoom. */
export async function verifySidebarReflow(
  page,
  base,
  route = '/docs/init/intro'
) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [940, 768, 470, 320]) {
    await page.setViewportSize({ width, height: 600 })
    await page.goto(`${base}${route}`)
    const sidebar = page.locator(
      width >= 768 ? '[data-rdx-sidebar]' : '[data-rdx-mobile-sidebar]'
    )
    if (width < 768) {
      await page
        .getByRole('button', { name: 'Open sidebar', exact: true })
        .click()
    }
    await sidebar.waitFor({ state: 'visible' })
    await sidebar.locator('nav a').first().focus()
    // Stress the real component with long translated labels and unbroken names.
    const metrics = await sidebar.evaluate((element) => {
      const link = element.querySelector('nav a')
      const category = element.querySelector('nav p')
      const originalLabel = link.textContent
      const originalCategory = category.textContent
      const longName = 'DocumentationConfigurationReference'.repeat(3)
      link.textContent = `License and contribution ${longName}`
      category.textContent = longName
      const style = getComputedStyle(link)
      const result = {
        viewport: element.clientWidth,
        content: element.scrollWidth,
        linkWidth: link.clientWidth,
        linkContentWidth: link.scrollWidth,
        linkHeight: link.clientHeight,
        linkContentHeight: link.scrollHeight,
        wrapped: link.clientHeight > parseFloat(style.lineHeight) * 2,
        focused: document.activeElement === link,
      }
      link.textContent = originalLabel
      category.textContent = originalCategory
      return result
    })
    assert.ok(
      metrics.content <= metrics.viewport + 1,
      `${width}px: no sidebar horizontal overflow`
    )
    assert.ok(
      metrics.linkContentWidth <= metrics.linkWidth + 1,
      `${width}px: full label fits its width`
    )
    assert.ok(
      metrics.linkContentHeight <= metrics.linkHeight + 1,
      `${width}px: full label fits its height`
    )
    assert.ok(
      metrics.wrapped,
      `${width}px: long labels wrap rather than truncate`
    )
    assert.ok(metrics.focused, `${width}px: links remain keyboard focusable`)
    if (width < 768) {
      await page.keyboard.press('Escape')
      await sidebar.waitFor({ state: 'hidden' })
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}
