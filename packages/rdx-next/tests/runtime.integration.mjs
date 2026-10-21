import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  symlink,
  rm,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(path.join(packageRoot, 'package.json'))
const cli = path.join(packageRoot, 'bin/rdx.mjs')
const nextCli = require.resolve('next/dist/bin/next')

async function command(cwd, entry, args) {
  const child = spawn(process.execPath, [entry, ...args], { cwd })
  let output = ''
  child.stdout.on('data', (data) => {
    output += data
  })
  child.stderr.on('data', (data) => {
    output += data
  })
  const timer = setTimeout(() => stop(child), 180_000)
  try {
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject)
      child.on('exit', resolve)
    })
    assert.equal(code, 0, output)
  } finally {
    clearTimeout(timer)
  }
}

function stop(child) {
  if (child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'])
  } else child.kill('SIGTERM')
}

async function server(rootDir, mode) {
  const socket = createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  const child = spawn(
    process.execPath,
    [nextCli, mode, path.join(rootDir, '.rdx'), '--port', String(port)],
    { cwd: rootDir }
  )
  let output = ''
  child.stdout.on('data', (data) => {
    output += data
  })
  child.stderr.on('data', (data) => {
    output += data
  })
  const base = `http://localhost:${port}`
  try {
    const deadline = Date.now() + 120_000
    while (Date.now() < deadline) {
      assert.equal(child.exitCode, null, output)
      try {
        await fetch(`${base}/docs/init/intro`, {
          signal: AbortSignal.timeout(15_000),
        })
        return { base, close: () => stop(child), logs: () => output }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    throw new Error(`Server did not start: ${output}`)
  } catch (error) {
    stop(child)
    throw error
  }
}

test(
  'generated site: opt-in homepage, navbar version links, fallback, snapshots and production',
  { timeout: 360_000 },
  async (t) => {
    // Keep Next and the fixture on the same Windows volume: webpack's relative
    // entry paths cannot cross drive letters when using workspace junctions.
    const rootDir = await mkdtemp(path.join(packageRoot, '.runtime-test-'))
    let running
    t.after(async () => {
      running?.close()
      // Unlink junctions before removing the disposable fixture.
      for (const destination of links) await rm(destination, { force: true })
      await rm(rootDir, { recursive: true, force: true })
    })
    const links = []
    async function link(name, target) {
      const destination = path.join(rootDir, 'node_modules', name)
      await mkdir(path.dirname(destination), { recursive: true })
      await symlink(
        target,
        destination,
        process.platform === 'win32' ? 'junction' : 'dir'
      )
      links.push(destination)
    }
    for (const name of [
      'next',
      'react',
      'react-dom',
      'typescript',
      '@types/node',
      '@types/react',
      '@types/react-dom',
    ])
      await link(name, path.dirname(require.resolve(`${name}/package.json`)))
    for (const [name, folder] of [
      ['rdx-next', 'rdx-next'],
      ['rdx-core', 'rdx-core'],
      ['rdx-types', 'rdx-types'],
      ['rdx-ui', 'rdx-ui'],
      ['rdx-versioning', 'rdx-plugin-versioning'],
    ])
      await link(`@lexibase/${name}`, path.resolve(packageRoot, '..', folder))
    await writeFile(
      path.join(rootDir, 'package.json'),
      JSON.stringify({
        name: 'rdx-layout-fixture',
        private: true,
        type: 'module',
      })
    )
    await mkdir(path.join(rootDir, 'docs/init'), { recursive: true })
    await writeFile(
      path.join(rootDir, 'docs/init/intro.mdx'),
      '---\ntitle: Introduction\n---\nOriginal snapshot body'
    )
    const configPath = path.join(rootDir, 'rdx.config.ts')
    await writeFile(configPath, `export default { title: 'Fixture docs' }`)
    await command(rootDir, cli, ['prepare'])
    running = await server(rootDir, 'dev')
    const redirect = await fetch(running.base, { redirect: 'manual' })
    assert.equal(redirect.status, 307, running.logs())
    assert.equal(redirect.headers.get('location'), '/docs')
    const plain = await (await fetch(`${running.base}/docs/init/intro`)).text()
    assert.doesNotMatch(plain, /data-rdx-version-trigger/)
    assert.match(plain, /data-rdx-navbar/)
    assert.match(plain, />Docs</)
    assert.match(plain, /data-rdx-sidebar/)
    running.close()
    running = undefined

    await writeFile(
      configPath,
      `export default { title: 'Fixture docs', homepage: { enabled: true } }`
    )
    await command(rootDir, cli, ['prepare'])
    running = await server(rootDir, 'dev')
    const defaultHome = await (await fetch(running.base)).text()
    assert.match(defaultHome, /data-rdx-home/)
    assert.match(defaultHome, /viewBox="0 0 681 606"/)
    assert.doesNotMatch(defaultHome, /data-rdx-version-trigger/)
    running.close()
    running = undefined

    await writeFile(
      configPath,
      `import { versioning } from '@lexibase/rdx-versioning'
export default { title: 'RDX', homepage: { enabled: true }, navbar: { title: '', actions: { github: { visible: true, url: 'https://github.com/lexibase/rdx' } } }, plugins: [versioning()] }`
    )
    await command(rootDir, cli, ['prepare'])
    await command(rootDir, cli, ['version', '1.0.0'])
    await command(rootDir, cli, ['version', '1.1.0'])
    await writeFile(
      path.join(rootDir, 'docs/init/intro.mdx'),
      '---\ntitle: Introduction\n---\nChanged live body'
    )
    await writeFile(
      path.join(rootDir, 'docs/init/new.mdx'),
      '---\ntitle: New page\n---\nOnly in current'
    )
    await writeFile(
      path.join(rootDir, 'versions.json'),
      JSON.stringify({ active: ['1.1.0'], archived: ['1.0.0'] })
    )
    await command(rootDir, nextCli, ['build', path.join(rootDir, '.rdx')])
    running = await server(rootDir, 'start')
    const home = await fetch(running.base)
    assert.equal(home.status, 200)
    assert.match(await home.text(), /data-rdx-home/)
    const live = await (await fetch(`${running.base}/docs/init/intro`)).text()
    assert.match(live, /Changed live body/)
    assert.match(live, /data-rdx-version-trigger/)
    assert.match(live, /Version 1.0.0/)
    assert.doesNotMatch(
      live.match(/<aside[\s\S]*?<\/aside>/)?.[0] ?? '',
      /data-rdx-version-trigger/
    )
    const archived = await (
      await fetch(`${running.base}/docs/1.0.0/init/intro`)
    ).text()
    assert.match(archived, /Original snapshot body/)
    assert.doesNotMatch(archived, /Changed live body/)
    assert.match(archived, /Documentation version: Version 1.0.0/)
    assert.match(archived, />Archived</)
    const added = await (await fetch(`${running.base}/docs/init/new`)).text()
    assert.match(added, /Only in current/)
    assert.equal(
      (await fetch(`${running.base}/docs/9.9.9/init/intro`)).status,
      404
    )
    assert.equal(
      (await fetch(`${running.base}/docs/1.0.0/init/new`)).status,
      404
    )
    assert.equal(
      JSON.parse(await readFile(path.join(rootDir, 'versions.json')))
        .archived[0],
      '1.0.0'
    )

    // Optional browser QA uses an existing Playwright installation and browser,
    // without downloading browsers or adding a runtime dependency.
    if (process.env.RDX_PLAYWRIGHT_MODULE) {
      const { chromium } = require(process.env.RDX_PLAYWRIGHT_MODULE)
      const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.RDX_BROWSER_EXECUTABLE,
      })
      try {
        const page = await browser.newPage({
          viewport: { width: 1872, height: 955 },
          colorScheme: 'dark',
        })
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
        await page.goto(running.base)
        await page
          .getByRole('button', { name: 'Documentation version: Current' })
          .click()
        await page.getByRole('menuitem', { name: 'Version 1.0.0' }).waitFor()
        if (process.env.RDX_THEME_SCREENSHOTS) {
          await mkdir(process.env.RDX_THEME_SCREENSHOTS, { recursive: true })
          await page.screenshot({
            path: path.join(
              process.env.RDX_THEME_SCREENSHOTS,
              'homepage-dropdown.png'
            ),
          })
        }
        await page.keyboard.press('Escape')
        assert.equal(
          await page
            .getByRole('button', { name: 'Documentation version: Current' })
            .getAttribute('data-state'),
          'closed'
        )
        await page.goto(`${running.base}/docs/init/new`)
        await page
          .getByRole('button', { name: 'Documentation version: Current' })
          .click()
        await page.getByRole('menuitem', { name: 'Version 1.0.0' }).click()
        await page.waitForURL('**/docs/1.0.0/init/intro')
        assert.match(
          await page.locator('main').innerText(),
          /Original snapshot body/
        )
        await page.setViewportSize({ width: 390, height: 844 })
        await page.getByRole('button', { name: 'Open sidebar' }).click()
        await page
          .getByRole('dialog', { name: 'Documentation navigation' })
          .waitFor()
        await page.keyboard.press('Escape')
        await page
          .getByRole('dialog', { name: 'Documentation navigation' })
          .waitFor({ state: 'hidden' })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          ),
          true
        )
        if (process.env.RDX_THEME_SCREENSHOTS)
          await page.screenshot({
            path: path.join(
              process.env.RDX_THEME_SCREENSHOTS,
              'docs-mobile.png'
            ),
          })
        assert.deepEqual(errors, [])
      } finally {
        await browser.close()
      }
    }

    running.close()
    running = undefined
    await writeFile(
      path.join(rootDir, 'home.tsx'),
      `import { Home } from '@lexibase/rdx-ui/components/home'
export default function MyHome() { return <Home title="Project owned homepage" /> }`
    )
    await writeFile(
      configPath,
      `import MyHome from './home'
export default { title: 'Custom site', homepage: { enabled: true, component: MyHome } }`
    )
    await command(rootDir, cli, ['prepare'])
    running = await server(rootDir, 'dev')
    const custom = await (await fetch(running.base)).text()
    assert.match(custom, /Project owned homepage/)
  }
)
