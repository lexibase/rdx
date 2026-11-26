import { createRequire } from 'node:module'
import process from 'node:process'

const require = createRequire(import.meta.url)

/**
 * Launch Chromium for browser QA. RDX_PLAYWRIGHT_MODULE and
 * RDX_BROWSER_EXECUTABLE override the bundled Playwright and browser (for
 * example, an installed Edge). With RDX_REQUIRE_BROWSER set, as in CI, a
 * missing browser fails the test instead of silently skipping its checks.
 */
export async function launchBrowser(options = {}) {
  try {
    const { chromium } = require(
      process.env.RDX_PLAYWRIGHT_MODULE ?? 'playwright'
    )
    return await chromium.launch({
      headless: true,
      ...options,
      executablePath: process.env.RDX_BROWSER_EXECUTABLE,
    })
  } catch (error) {
    if (process.env.RDX_REQUIRE_BROWSER) throw error
    console.warn(
      `[RDX] Browser checks skipped: ${error.message.split('\n')[0]}\n` +
        'Run "pnpm exec playwright install chromium" or set RDX_BROWSER_EXECUTABLE.'
    )
    return null
  }
}
