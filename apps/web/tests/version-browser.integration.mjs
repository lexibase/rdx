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
          return { base, close }
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
  'showcase keeps hydration, stored versions, URL priority and history consistent',
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
        const running = await server(mode)
        try {
          const example = await fetch(
            `${running.base}/docs/canary/mdx-components`
          )
          assert.equal(example.status, 200, `${mode}: showcase MDX example`)
          const exampleHtml = await example.text()
          assert.match(exampleHtml, /data-rdx-callout="warning"/)
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
          await page
            .getByRole('button', { name: 'On this page', exact: true })
            .hover()
          const toc = page.getByRole('navigation', {
            name: 'On this page',
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
            .getByRole('button', { name: 'Documentation version: Canary' })
            .waitFor()
          await page.goto(`${running.base}/docs/2.1.1/intro`)
          await page
            .getByRole('button', {
              name: 'Documentation version: Version 2.1.1',
            })
            .waitFor()
          await page.waitForFunction(
            () => localStorage.getItem('rdx-version') === '2.1.1'
          )
          assert.equal(
            await page.locator('[data-rdx-version-notice]').count(),
            0
          )
          await page
            .getByRole('button', {
              name: 'Documentation version: Version 2.1.1',
            })
            .click()
          await page
            .getByRole('menuitem', { name: 'Version 2.1.0', exact: true })
            .click()
          await page.waitForURL('**/docs/2.1.0/intro')
          await page
            .getByRole('button', {
              name: 'Documentation version: Version 2.1.0',
            })
            .waitFor()
          await page.waitForFunction(
            () => localStorage.getItem('rdx-version') === '2.1.0'
          )
          const notice = page.locator('[data-rdx-version-notice="outdated"]')
          await notice.waitFor()
          assert.match(
            await notice.innerText(),
            /This is an outdated version of the documentation\./
          )
          assert.equal(
            await notice.getByRole('link').getAttribute('href'),
            '/docs/2.1.1'
          )
          await page.goBack()
          await page.waitForURL('**/docs/2.1.1/intro')
          await page
            .getByRole('button', {
              name: 'Documentation version: Version 2.1.1',
            })
            .waitFor()
          await page.waitForFunction(
            () => localStorage.getItem('rdx-version') === '2.1.1'
          )
          await page.goto(running.base)
          await page
            .getByRole('button', {
              name: 'Documentation version: Version 2.1.1',
            })
            .waitFor()
          assert.deepEqual(errors, [], `${mode}: hydration and navigation`)
          await page.goto(`${running.base}/docs/canary/mdx-components`)
          await page.getByRole('note', { name: 'Before updating' }).waitFor()
          assert.equal(await page.locator('main [data-rdx-callout]').count(), 6)
          await page
            .getByRole('note', { name: 'Pre-release documentation' })
            .waitFor()
          await page.getByRole('table').waitFor()
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
          await code.getByRole('button', { name: 'Copy code' }).click()
          await code.locator('button[data-status="copied"]').waitFor()
          assert.equal(
            await code.getByRole('button', { name: 'Copy code' }).innerText(),
            ''
          )
          assert.equal(
            (await page.evaluate(() => navigator.clipboard.readText())).replace(
              /\r\n/g,
              '\n'
            ),
            expectedCode
          )
          assert.deepEqual(errors, [], `${mode}: shared Callout and Markdown`)
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
          await blockedPage.goto(`${running.base}/docs/2.1.1/intro`)
          await blockedPage
            .getByRole('button', {
              name: 'Documentation version: Version 2.1.1',
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
