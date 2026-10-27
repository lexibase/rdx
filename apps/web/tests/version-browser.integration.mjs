import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(path.join(root, 'package.json'))
const { getMessages, formatMessage } = require('@lexibase/rdx-ui/lib/i18n')

async function server(mode) {
  const socket = createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  const child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), mode, '--port', String(port)],
    { cwd: root }
  )
  let logs = ''
  child.stdout.on('data', (data) => {
    logs += data
  })
  child.stderr.on('data', (data) => {
    logs += data
  })
  const close = () => {
    if (child.exitCode !== null) return
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'])
    } else child.kill('SIGTERM')
  }
  const base = `http://localhost:${port}`
  try {
    const deadline = Date.now() + 90_000
    while (Date.now() < deadline) {
      assert.equal(child.exitCode, null, logs)
      try {
        if (
          (await fetch(base, { signal: AbortSignal.timeout(10_000) }))
            .status === 200
        ) {
          return { base, close, logs: () => logs.slice(-12_000) }
        }
      } catch {
        /* The server may still be starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error(`Showcase did not start: ${logs}`)
  } catch (error) {
    close()
    throw error
  }
}

test(
  'website keeps hydration, edition navigation, search and shared components consistent',
  {
    skip:
      !process.env.RDX_PLAYWRIGHT_MODULE &&
      'Set RDX_PLAYWRIGHT_MODULE to enable browser checks',
    timeout: 180_000,
  },
  async () => {
    const { chromium } = require(process.env.RDX_PLAYWRIGHT_MODULE)
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.RDX_BROWSER_EXECUTABLE,
    })
    try {
      for (const mode of ['dev', 'start']) {
        // Reuse an explicitly supplied local dev server without owning its lifecycle.
        const running =
          mode === 'dev' && process.env.RDX_EXISTING_DEV_URL
            ? {
                base: process.env.RDX_EXISTING_DEV_URL,
                close() {},
                logs: () => 'Existing development server',
              }
            : await server(mode)
        try {
          const example = await fetch(
            `${running.base}/docs/canary/mdx-components`
          )
          assert.equal(example.status, 200, `${mode}: showcase MDX example`)
          const exampleHtml = await example.text()
          const messages = getMessages(
            exampleHtml.match(/<html[^>]*lang="([^"]+)"/)?.[1]
          )
          const versionLabel = (version) =>
            formatMessage(messages.version, { version })
          const triggerLabel = (version) =>
            formatMessage(messages.documentationVersion, { version })
          assert.match(exampleHtml, /Markdown \| RDX/)
          assert.doesNotMatch(exampleHtml, /data-rdx-callout="warning"/)
          assert.match(exampleHtml, /data-slot="mdx-table-scroll"/)
          const context = await browser.newContext()
          await context.addInitScript(() => {
            if (!localStorage.getItem('rdx-version'))
              localStorage.setItem('rdx-version', 'canary')
          })
          const page = await context.newPage()
          const errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          await page.setViewportSize({ width: 1872, height: 955 })
          await page.goto(`${running.base}/docs/canary/docs`)
          const versionTrigger = page.locator('[data-rdx-version-trigger]')
          for (const width of [360, 390, 640, 1280]) {
            await page.setViewportSize({ width, height: 844 })
            // The shared Button transitions min-width across the breakpoint.
            await page.waitForFunction((compact) => {
              const trigger = document.querySelector(
                '[data-rdx-version-trigger]'
              )
              const width = trigger.getBoundingClientRect().width
              return compact ? width < 110 : width >= 134
            }, width < 640)
            const metrics = await versionTrigger.evaluate((trigger) => {
              const icon = trigger.querySelector(
                '[data-slot="dropdown-menu-shortcut"]'
              )
              return {
                width: trigger.getBoundingClientRect().width,
                iconMargin: Number.parseFloat(
                  getComputedStyle(icon).marginLeft
                ),
                actionGap: Number.parseFloat(
                  getComputedStyle(trigger.parentElement).columnGap
                ),
                overflow:
                  document.documentElement.scrollWidth > window.innerWidth,
              }
            })
            if (width < 640) {
              assert.ok(
                metrics.width < 110,
                `${mode}: compact version trigger at ${width}px`
              )
              assert.equal(
                metrics.iconMargin,
                0,
                `${mode}: no stretched icon gap on mobile`
              )
            } else {
              assert.ok(
                metrics.width >= 134,
                `${mode}: desktop trigger width is preserved`
              )
            }
            assert.equal(
              metrics.actionGap,
              width < 768 ? 4 : 8,
              `${mode}: navbar actions retain a visible gap at ${width}px`
            )
            assert.equal(
              metrics.overflow,
              false,
              `${mode}: no page overflow at ${width}px`
            )
          }
          await page.setViewportSize({ width: 1872, height: 955 })
          await page
            .getByRole('button', { name: messages.onThisPage, exact: true })
            .hover()
          const toc = page.getByRole('navigation', {
            name: messages.onThisPage,
            exact: true,
          })
          await toc
            .getByRole('link', { name: 'Versioned', exact: true })
            .click()
          await page.waitForFunction(() => {
            const root = document.querySelector('[data-rdx-docs-scroll]')
            return root.scrollHeight - root.clientHeight - root.scrollTop < 2
          })
          await toc
            .locator('a[href="#versioned"][aria-current="location"]')
            .waitFor()
          assert.equal(
            await page.locator('[data-rdx-docs-scroll]').evaluate((root) => {
              for (
                let ancestor = root.parentElement;
                ancestor;
                ancestor = ancestor.parentElement
              )
                if (ancestor.scrollTop !== 0) return false
              return root.getBoundingClientRect().top >= 0
            }),
            true,
            `${mode}: short final section keeps the documentation viewport in place`
          )
          await page.goto(running.base)
          await page
            .getByRole('button', { name: triggerLabel('Canary') })
            .waitFor()
          // A retired browser preference must not resurrect removed demo editions.
          await page.evaluate(() =>
            localStorage.setItem('rdx-version', '2.1.1')
          )
          await page.reload()
          await page
            .getByRole('button', {
              name: triggerLabel(versionLabel('3.0.0')),
            })
            .click()
          await page.getByRole('menu').waitFor()
          assert.equal(
            await page.locator('[data-slot="dropdown-menu-separator"]').count(),
            1,
            `${mode}: live and released editions have one divider`
          )
          assert.equal(
            await page
              .getByRole('menuitem', {
                name: new RegExp('^' + messages.version.split('{version}')[0]),
              })
              .count(),
            3
          )
          await page.keyboard.press('Escape')
          await page.goto(`${running.base}/docs/canary/intro`)
          const liveIndex = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname === '/rdx-search/canary'
          )
          await page
            .getByRole('button', {
              name: messages.searchDocumentation,
              exact: true,
            })
            .click()
          assert.equal((await liveIndex).status(), 200, running.logs())
          await page
            .getByRole('dialog', { name: messages.searchDocumentation })
            .waitFor()
          await page.keyboard.press('Escape')
          await page.goto(`${running.base}/docs/canary/mdx-components`)
          await page.getByRole('heading', { name: /^Markdown$/i }).waitFor()
          assert.equal(await page.locator('main [data-rdx-callout]').count(), 0)
          assert.equal(
            await page.locator('[data-rdx-version-notice]').count(),
            1
          )
          assert.equal(
            await page
              .locator('[data-rdx-version-notice]')
              .getAttribute('data-rdx-version-notice'),
            'canary'
          )
          await page.getByRole('table').first().waitFor()
          await context.grantPermissions(
            ['clipboard-read', 'clipboard-write'],
            { origin: running.base }
          )
          const code = page.locator('[data-rdx-code-block]').first()
          assert.ok(
            (await code
              .locator('pre.shiki code span[style*="--shiki-light"]')
              .count()) > 0
          )
          const expectedCode = await code.locator('pre').textContent()
          await code.getByRole('button', { name: messages.copyCode }).click()
          await code.locator('button[data-status="copied"]').waitFor()
          assert.equal(
            await code
              .getByRole('button', { name: messages.copyCode })
              .innerText(),
            ''
          )
          assert.equal(
            (await page.evaluate(() => navigator.clipboard.readText())).replace(
              /\r\n/g,
              '\n'
            ),
            expectedCode
          )
          assert.deepEqual(errors, [], `${mode}: shared Markdown components`)
          await page
            .getByRole('button', { name: triggerLabel('Canary') })
            .click()
          await page
            .getByRole('menuitem', { name: versionLabel('1.0.1'), exact: true })
            .click()
          await page.waitForURL('**/docs/1.0.1/mdx-components')
          await page.waitForFunction(
            () => document.title === 'Markdown and Callouts | RDX'
          )
          const releasedIndex = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname === '/rdx-search/1.0.1'
          )
          await page
            .getByRole('button', {
              name: messages.searchDocumentation,
              exact: true,
            })
            .click()
          assert.equal(
            (await releasedIndex).status(),
            200,
            `${mode}: released search index`
          )
          await page.keyboard.press('Escape')
          assert.deepEqual(
            errors,
            [],
            `${mode}: switching to the released snapshot`
          )
          await page
            .getByRole('button', {
              name: triggerLabel(versionLabel('1.0.1')),
            })
            .click()
          await page
            .getByRole('menuitem', { name: versionLabel('2.0.0'), exact: true })
            .click()
          await page.waitForURL('**/docs/2.0.0/mdx-components')
          await page.waitForFunction(() => document.title === 'Markdown | RDX')
          const latestIndex = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname === '/rdx-search/2.0.0'
          )
          await page
            .getByRole('button', {
              name: messages.searchDocumentation,
              exact: true,
            })
            .click()
          assert.equal(
            (await latestIndex).status(),
            200,
            mode + ': 2.0 search index'
          )
          await page.keyboard.press('Escape')
          assert.deepEqual(
            errors,
            [],
            mode + ': switching between released snapshots'
          )
          await context.close()

          const restricted = await browser.newContext()
          await restricted.addInitScript(() => {
            Object.defineProperty(Storage.prototype, 'getItem', {
              value() {
                throw new DOMException('Blocked', 'SecurityError')
              },
            })
            Object.defineProperty(Storage.prototype, 'setItem', {
              value() {
                throw new DOMException('Blocked', 'SecurityError')
              },
            })
          })
          const blockedPage = await restricted.newPage()
          const blockedErrors = []
          blockedPage.on('pageerror', (error) =>
            blockedErrors.push(error.message)
          )
          await blockedPage.goto(`${running.base}/docs/canary/intro`)
          await blockedPage
            .getByRole('button', {
              name: triggerLabel('Canary'),
            })
            .waitFor()
          assert.deepEqual(blockedErrors, [], `${mode}: blocked storage`)
          await restricted.close()
        } finally {
          running.close()
        }
      }
    } finally {
      await browser.close()
    }
  }
)
