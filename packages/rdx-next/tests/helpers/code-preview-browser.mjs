import assert from 'node:assert/strict'

/** Check actual intermediate heights, rather than only the expanded state. */
export async function verifyCodePreviewMotion(page, block) {
  const sample = () =>
    block.evaluate(async (element) => {
      const pre = element.querySelector('[data-slot="code-block-content"]')
      const toggle = element.querySelector('button[aria-expanded]')
      const heights = [pre.getBoundingClientRect().height]
      toggle.click()
      const start = performance.now()
      await new Promise((resolve) => {
        function frame(now) {
          heights.push(pre.getBoundingClientRect().height)
          if (now - start < 450) requestAnimationFrame(frame)
          else resolve()
        }
        requestAnimationFrame(frame)
      })
      return heights
    })
  for (const direction of [1, -1]) {
    const heights = await sample()
    const first = heights[0]
    const last = heights.at(-1)
    assert.ok((last - first) * direction > 10)
    assert.ok(
      heights.some(
        (height) =>
          (height - first) * direction > 1 && (last - height) * direction > 1
      ),
      'Code preview should pass through intermediate heights'
    )
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const heights = await sample()
  const last = heights.at(-1)
  assert.ok(last > heights[0] + 10)
  assert.ok(
    heights.slice(2).every((height) => Math.abs(height - last) < 1),
    'Reduced motion should expand without a height transition'
  )
  await sample()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}
