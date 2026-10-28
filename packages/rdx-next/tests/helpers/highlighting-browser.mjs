import assert from 'node:assert/strict'

export async function verifyHighlighting(page, base, setStyles) {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${base}/docs/init/highlighting`)
  await page.getByRole('tab', { name: 'First', exact: true }).waitFor()
  setStyles ??= (css) =>
    page.evaluate((css) => {
      document.getElementById('rdx-theme-test')?.remove()
      if (css !== null) {
        const style = document.createElement('style')
        style.id = 'rdx-theme-test'
        style.textContent = css
        document.head.append(style)
      }
    }, css)
  const read = () =>
    page.evaluate(() => {
      const color = (selector, property = 'color') =>
        getComputedStyle(document.querySelector(selector))[property]
      return {
        link: color('#rdx-main a'),
        selected: color('[data-rdx-sidebar] [aria-current="page"]'),
        tab: color('[role="tab"][aria-selected="true"]'),
        ring: getComputedStyle(document.documentElement)
          .getPropertyValue('--ring')
          .trim(),
        accent: getComputedStyle(document.documentElement)
          .getPropertyValue('--accent')
          .trim(),
        warning: color('[data-rdx-callout="warning"]', 'backgroundColor'),
        tokens: [...document.querySelectorAll('pre.shiki span[style]')].map(
          (span) => getComputedStyle(span).color
        ),
      }
    })
  async function theme(dark) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (
        (await page.evaluate(() =>
          document.documentElement.classList.contains('dark')
        )) === dark
      )
        return
      await page
        .getByRole('button', { name: 'Mode Toggle', exact: true })
        .click()
      await page.waitForTimeout(50)
    }
    assert.fail('Theme toggle should apply the requested theme')
  }
  const baseline = {}
  await setStyles(null)
  for (const dark of [false, true]) {
    await theme(dark)
    baseline[String(dark)] = await read()
  }
  await setStyles(
    ':root { --rdx-highlighting: #7c3aed; } .dark { --rdx-highlighting: #a78bfa; }'
  )
  for (const dark of [false, true]) {
    await theme(dark)
    const expected = dark ? 'rgb(167, 139, 250)' : 'rgb(124, 58, 237)'
    await page.waitForFunction(
      (expected) =>
        [
          '#rdx-main a',
          '[data-rdx-sidebar] [aria-current="page"]',
          '[role="tab"][aria-selected="true"]',
        ].every(
          (selector) =>
            getComputedStyle(document.querySelector(selector)).color ===
            expected
        ),
      expected
    )
    const actual = await read()
    assert.equal(actual.selected, expected)
    assert.equal(actual.tab, expected)
    assert.equal(actual.ring, dark ? '#a78bfa' : '#7c3aed')
    assert.notEqual(actual.accent, baseline[String(dark)].accent)
    assert.equal(actual.warning, baseline[String(dark)].warning)
    assert.deepEqual(actual.tokens, baseline[String(dark)].tokens)
  }
  await setStyles(':root { --rdx-highlighting: #0891b2; }')
  for (const dark of [false, true]) {
    await theme(dark)
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector('#rdx-main a')).color ===
        'rgb(8, 145, 178)'
    )
  }
  await setStyles(null)
  for (const dark of [false, true]) {
    await theme(dark)
    await page.waitForFunction(
      () =>
        !getComputedStyle(document.documentElement)
          .getPropertyValue('--rdx-highlighting')
          .trim()
    )
    assert.deepEqual(
      await read(),
      baseline[String(dark)],
      'Removing the override restores the approved theme'
    )
  }
}
