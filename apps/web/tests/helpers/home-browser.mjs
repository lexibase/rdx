import assert from 'node:assert/strict'

export async function verifyHomePreview(page, base) {
  await page.goto(base)
  const preview = page.locator('#highlight-preview')
  const link = preview.locator('a.text-rdx-highlighting')
  const color = () => link.evaluate((node) => getComputedStyle(node).color)
  const siteColor = () =>
    page
      .locator('body')
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--accent-foreground')
      )
  const baseline = await siteColor()
  const cssHeight = () =>
    page
      .locator('.rdx-home-css')
      .evaluate((node) => node.getBoundingClientRect().height)
  const originalHeight = await cssHeight()

  for (const dark of [false, true]) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle('dark', dark),
      dark
    )
    await page.getByRole('button', { name: 'Default', exact: true }).click()
    const defaultColor = await color()
    await page.getByRole('button', { name: 'Violet', exact: true }).click()
    assert.ok(
      Math.abs((await cssHeight()) - originalHeight) <= 1,
      'Changing a palette does not resize the CSS panel'
    )
    await page.waitForFunction((dark) => {
      const link = document.querySelector(
        '#highlight-preview a.text-rdx-highlighting'
      )
      return (
        getComputedStyle(link).color ===
        (dark ? 'rgb(167, 139, 250)' : 'rgb(124, 58, 237)')
      )
    }, dark)
    const active = preview.getByRole('button', {
      name: 'Introduction',
      exact: true,
    })
    await page.waitForFunction(
      ({ dark }) => {
        const node = document.querySelector('#highlight-preview aside button')
        return (
          getComputedStyle(node).color ===
          (dark ? 'rgb(167, 139, 250)' : 'rgb(124, 58, 237)')
        )
      },
      { dark }
    )
    assert.ok(await active.isVisible())
    await preview.getByRole('tab', { name: 'npm', exact: true }).click()
    assert.match(await preview.getByRole('tabpanel').innerText(), /npm create/)
    await page.getByRole('button', { name: 'Default', exact: true }).click()
    assert.equal(await color(), defaultColor, 'Default restores the preview')
  }
  // Restore the original theme before comparing tokens outside the preview.
  await page.reload()
  await page.getByRole('button', { name: 'Green', exact: true }).click()
  assert.equal(
    await siteColor(),
    baseline,
    'Palette selection cannot recolor the site'
  )
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false,
      `No page overflow at ${width}px`
    )
    assert.ok(await preview.isVisible())
    if (width < 1024) {
      assert.equal(
        await preview.evaluate((node) => node.parentElement.inert),
        true,
        'Decorative mobile preview cannot receive keyboard focus'
      )
      const position = await preview.evaluate((node) => {
        const shell = node.parentElement
        const bounds = shell.getBoundingClientRect()
        const stage = shell.closest('section').getBoundingClientRect()
        const css = document
          .querySelector('.rdx-home-css')
          .getBoundingClientRect()
        return {
          end: bounds.bottom - stage.top,
          css: css.top - stage.top,
          viewport: innerHeight,
        }
      })
      assert.ok(
        position.end <= position.css,
        'Mobile preview stays behind the hero, above the CSS section'
      )
      assert.ok(
        position.end < position.viewport,
        'Mobile preview stays within the first screen'
      )
    }
  }
  for (const [width, height] of [
    [320, 667],
    [360, 740],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height })
    await page.locator('[data-rdx-home]').evaluate((node) => {
      node.scrollTop = 0
    })
    const bounds = await preview
      .locator('aside button')
      .first()
      .evaluate((node) => {
        const rect = node.getBoundingClientRect()
        const title = document
          .querySelector('#home-title')
          .getBoundingClientRect()
        const copy = document
          .querySelector('.rdx-home-copy')
          .getBoundingClientRect()
        const css = document
          .querySelector('.rdx-home-css')
          .getBoundingClientRect()
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          title: title.bottom,
          gap: css.top - copy.bottom,
        }
      })
    assert.ok(
      bounds.left >= 0 && bounds.right <= width,
      `Selected sidebar item stays visible at ${width}px`
    )
    assert.ok(
      bounds.top < bounds.title + 64 && bounds.bottom < height,
      `Sidebar sits beside the hero title at ${width}x${height}`
    )
    assert.ok(
      bounds.gap <= 24,
      'CSS panel follows the hero controls without an empty section'
    )
    assert.equal(
      await page.locator('.rdx-home-copy > p').first().isVisible(),
      false,
      'Compact hero hides the technology signature'
    )
    await page.getByRole('button', { name: 'Violet', exact: true }).click()
    assert.match(
      await color(),
      /rgb\((124, 58, 237|167, 139, 250)\)/,
      'Mobile selector updates the visible preview highlight'
    )
  }
  await page.setViewportSize({ width: 1440, height: 900 })
}
