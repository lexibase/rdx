import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  symlink,
  unlink,
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

async function assertPublicFile(base, url, expected, contentType) {
  const response = await fetch(`${base}${url}`)
  assert.equal(response.status, 200, `Expected public asset ${url}`)
  if (contentType)
    assert.match(response.headers.get('content-type') ?? '', contentType)
  assert.deepEqual(
    Buffer.from(await response.arrayBuffer()),
    Buffer.from(expected)
  )
}

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
    if (entry === cli && args[0] === 'prepare') {
      // Only this harness links packages outside the generated project. Turbopack
      // must see their common ancestor; installed projects keep their own root.
      const configPath = path.join(cwd, '.rdx/next.config.mjs')
      const config = await readFile(configPath, 'utf8')
      await writeFile(
        configPath,
        `${config}\nnextConfig.turbopack.root = ${JSON.stringify(path.resolve(packageRoot, '../..'))}\n`
      )
    }
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
    // Keep the linked packages and fixture inside the same Turbopack root.
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
    const publicRoot = path.join(rootDir, 'public')
    const asset =
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="green"/></svg>'
    const changedAsset = asset.replace('green', 'orange')
    await mkdir(path.join(publicRoot, 'images'), { recursive: true })
    await mkdir(path.join(publicRoot, 'downloads'), { recursive: true })
    await writeFile(path.join(publicRoot, 'images/public logo.svg'), asset)
    await writeFile(
      path.join(publicRoot, 'downloads/manual.txt'),
      'Original download'
    )
    const favicon = Buffer.from([0, 0, 1, 0])
    const downloadableCode =
      'const value: number = "download, not application code"\n'
    await writeFile(
      path.join(publicRoot, 'downloads/example.ts'),
      downloadableCode
    )
    await writeFile(path.join(publicRoot, 'favicon.ico'), favicon)
    await writeFile(
      path.join(rootDir, 'docs/init/intro.mdx'),
      '---\ntitle: Introduction\nlink_position: 1\n---\nOriginal snapshot body\n\n![Public asset](/images/public%20logo.svg)\n\n## Details\n\nSnapshot details.'
    )
    await writeFile(
      path.join(rootDir, 'docs/init/_category.json'),
      JSON.stringify({ title: 'Init', sidebar_position: 0 })
    )
    const configPath = path.join(rootDir, 'rdx.config.ts')
    await writeFile(
      path.join(rootDir, 'docs/init/toc.mdx'),
      '---\ntitle: Contents\n---\n## First section\n\n' +
        'A paragraph to make the documentation scroll.\n\n'.repeat(35) +
        '### Nested section\n\nNested text.\n\n## Last section\n\n' +
        'More text at the end of the documentation.\n\n'.repeat(35)
    )
    await writeFile(
      path.join(rootDir, 'docs/init/links.mdx'),
      '---\ntitle: Links\nlink_position: 20\n---\n## Links\n\n[Original page](./intro.mdx?from=links#details)\n\n[Cross category](../api/target.mdx#configuration)\n\n[External](https://example.com/guide.mdx)\n\n[Download](/downloads/manual.txt)\n'
    )
    await mkdir(path.join(rootDir, 'docs/api'), { recursive: true })
    await writeFile(
      path.join(rootDir, 'docs/api/target.mdx'),
      '---\ntitle: Target\n---\n## Configuration\n\nA linked page.\n\n## Configuration\n\nDuplicate heading.\n'
    )
    await writeFile(
      path.join(rootDir, 'docs/init/quotes.mdx'),
      (
        await readFile(
          new URL(
            '../../create-rdx/templates/default/docs/examples/markdown.mdx',
            import.meta.url
          ),
          'utf8'
        )
      ).replace('link_position: 1', 'link_position: 10')
    )
    await writeFile(
      path.join(rootDir, 'docs/init/tabs.mdx'),
      await readFile(
        new URL(
          '../../create-rdx/templates/default/docs/examples/tabs.mdx',
          import.meta.url
        ),
        'utf8'
      )
    )
    await writeFile(
      path.join(rootDir, 'docs/init/accordion.mdx'),
      await readFile(
        new URL(
          '../../create-rdx/templates/default/docs/examples/accordion.mdx',
          import.meta.url
        ),
        'utf8'
      )
    )
    const copySample =
      '  const message = \'<tag> & "RDX"\';\n\tconsole.log(message)\n'
    await writeFile(
      path.join(rootDir, 'docs/init/code.mdx'),
      '---\ntitle: Code\n---\nInline `example`.\n\n```ts\n' +
        copySample +
        '```\n\n```\nSecond block\n```\n'
    )
    await writeFile(
      path.join(rootDir, 'docs/init/components.mdx'),
      (await readFile(
        new URL(
          '../../create-rdx/templates/default/docs/examples/callouts.mdx',
          import.meta.url
        ),
        'utf8'
      )) +
        '\n\n| Wide column | Status |\n| --- | --- |\n| ' +
        'LongTableValue'.repeat(30) +
        ' | Ready |\n\n```text\n' +
        'long-code-value-'.repeat(30) +
        '\n```\n'
    )
    await writeFile(
      configPath,
      await readFile(
        new URL(
          '../../create-rdx/templates/default/rdx.config.ts',
          import.meta.url
        ),
        'utf8'
      )
    )
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
    assert.match(plain, /Mode Toggle/)
    const components = await (
      await fetch(`${running.base}/docs/init/components`)
    ).text()
    assert.match(components, /data-rdx-callout="warning"/)
    assert.match(components, /data-slot="mdx-table-scroll"/)
    const brokenPage = path.join(rootDir, 'docs/init/broken.mdx')
    await writeFile(brokenPage, '[Missing destination](./does-not-exist.mdx)')
    const brokenResponse = await fetch(`${running.base}/docs/init/broken`)
    assert.equal(brokenResponse.status, 500)
    assert.match(running.logs(), /Invalid document link/)
    await unlink(brokenPage)
    const githubPlaceholder = plain.match(
      /<a\b[^>]*aria-label="GitHub"[^>]*>/
    )?.[0]
    assert.ok(githubPlaceholder, 'The default GitHub action must be rendered')
    assert.match(githubPlaceholder, /href="#"/)
    assert.doesNotMatch(githubPlaceholder, /target="_blank"/)
    await assertPublicFile(
      running.base,
      '/downloads/example.ts',
      downloadableCode
    )
    assert.match(plain, /alt="Public asset"/)
    await assertPublicFile(
      running.base,
      '/images/public%20logo.svg',
      asset,
      /image\/svg\+xml/
    )
    await assertPublicFile(
      running.base,
      '/downloads/manual.txt',
      'Original download',
      /text\/plain/
    )
    await assertPublicFile(running.base, '/favicon.ico', favicon, /image\//)
    assert.equal(
      (await fetch(`${running.base}/public/images/public%20logo.svg`)).status,
      404
    )
    assert.equal((await fetch(`${running.base}/rdx.config.ts`)).status, 404)
    await writeFile(
      path.join(publicRoot, 'images/public logo.svg'),
      changedAsset
    )
    await assertPublicFile(
      running.base,
      '/images/public%20logo.svg',
      changedAsset
    )
    await writeFile(
      path.join(publicRoot, 'downloads/new file.txt'),
      'Added while dev is running'
    )
    await assertPublicFile(
      running.base,
      '/downloads/new%20file.txt',
      'Added while dev is running'
    )
    await unlink(path.join(publicRoot, 'downloads/manual.txt'))
    assert.equal(
      (await fetch(`${running.base}/downloads/manual.txt`)).status,
      404
    )
    await writeFile(
      path.join(publicRoot, 'downloads/manual.txt'),
      'Updated download'
    )
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
export default { title: 'RDX', TOC: true, homepage: { enabled: true }, navbar: { title: '', actions: { github: { visible: true, url: 'https://github.com/lexibase/rdx' } } }, plugins: [versioning()] }`
    )
    await command(rootDir, cli, ['prepare'])
    await command(rootDir, cli, ['version', '1.0.0'])
    await command(rootDir, cli, ['version', '1.1.0'])
    await writeFile(
      path.join(rootDir, 'docs/init/intro.mdx'),
      '---\ntitle: Introduction\nlink_position: 1\n---\nChanged live body\n\n## Details\n\nLive details.'
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
    await assertPublicFile(
      running.base,
      '/downloads/example.ts',
      downloadableCode
    )
    await assertPublicFile(
      running.base,
      '/images/public%20logo.svg',
      changedAsset,
      /image\/svg\+xml/
    )
    await assertPublicFile(
      running.base,
      '/downloads/manual.txt',
      'Updated download',
      /text\/plain/
    )
    await assertPublicFile(running.base, '/favicon.ico', favicon, /image\//)
    const live = await (await fetch(`${running.base}/docs/init/intro`)).text()
    const productionComponents = await (
      await fetch(`${running.base}/docs/init/components`)
    ).text()
    assert.match(productionComponents, /data-rdx-callout="danger"/)
    assert.match(productionComponents, /data-slot="mdx-table-scroll"/)
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
    for (const prefix of ['', '/1.1.0', '/1.0.0']) {
      const linked = await (
        await fetch(`${running.base}/docs${prefix}/init/links`)
      ).text()
      assert.match(
        linked,
        new RegExp(`href="/docs${prefix}/init/intro\\?from=links#details"`)
      )
      assert.match(
        linked,
        new RegExp(`href="/docs${prefix}/api/target#configuration"`)
      )
      assert.match(linked, /href="https:\/\/example.com\/guide.mdx"/)
      assert.match(linked, /href="\/downloads\/manual.txt"/)
    }
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
        await page.goto(`${running.base}/docs/init/toc`)
        const tocTrigger = page.getByRole('button', {
          name: 'On this page',
          exact: true,
        })
        await tocTrigger.waitFor()
        assert.equal(await tocTrigger.locator('span').count(), 3)
        await tocTrigger.hover()
        const tocNav = page.getByRole('navigation', {
          name: 'On this page',
          exact: true,
        })
        await tocNav.waitFor()
        assert.deepEqual(await tocNav.getByRole('link').allTextContents(), [
          'First section',
          'Nested section',
          'Last section',
        ])
        assert.equal(
          await tocNav.locator('[aria-current="location"]').textContent(),
          'First section'
        )
        const nested = tocNav.getByRole('link', {
          name: 'Nested section',
          exact: true,
        })
        assert.equal(
          await nested.evaluate(
            (element) => getComputedStyle(element).paddingLeft
          ),
          '20px'
        )
        await tocNav.hover()
        await page.waitForTimeout(250)
        assert.equal(
          await tocNav.isVisible(),
          true,
          'Moving from marks into the popup must keep it open'
        )
        await page.keyboard.press('Escape')
        await tocNav.waitFor({ state: 'hidden' })
        await tocTrigger.focus()
        await page.keyboard.press('Enter')
        await tocNav.waitFor()
        await page.keyboard.press('Escape')
        await tocNav.waitFor({ state: 'hidden' })
        await page.mouse.move(700, 100)
        await tocTrigger.hover()
        await tocNav.waitFor()
        const tocScroller = page.locator('.motion-safe\\:scroll-smooth').first()
        assert.equal(
          await tocScroller.evaluate(
            (element) => getComputedStyle(element).scrollBehavior
          ),
          'smooth'
        )
        await tocScroller.evaluate((element) => {
          window.__rdxTocScrollSamples = [element.scrollTop]
          window.__rdxTocSampling = true
          function sample() {
            if (!window.__rdxTocSampling) return
            window.__rdxTocScrollSamples.push(element.scrollTop)
            requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        })
        await tocNav
          .getByRole('link', { name: 'Last section', exact: true })
          .click()
        await page.waitForURL('**/docs/init/toc#last-section')
        await page.waitForTimeout(250)
        assert.equal(
          await tocNav.isVisible(),
          true,
          'Following a TOC link must keep the hovered popup open'
        )
        await page.waitForFunction(
          () =>
            Math.abs(
              document.getElementById('last-section').getBoundingClientRect()
                .top -
                document
                  .getElementById('rdx-main')
                  .parentElement.parentElement.parentElement.getBoundingClientRect()
                  .top
            ) < 120
        )
        await tocNav
          .locator('a[href="#last-section"][aria-current="location"]')
          .waitFor()
        assert.equal(
          await tocNav.locator('[aria-current="location"]').textContent(),
          'Last section'
        )
        const scrollSamples = await page.evaluate(() => {
          window.__rdxTocSampling = false
          return window.__rdxTocScrollSamples
        })
        const scrollStart = scrollSamples[0]
        const scrollEnd = scrollSamples.at(-1)
        assert.ok(
          new Set(
            scrollSamples.filter(
              (position) =>
                position > scrollStart + 2 && position < scrollEnd - 2
            )
          ).size > 3,
          'TOC navigation must animate through intermediate scroll positions'
        )
        await page.emulateMedia({ reducedMotion: 'reduce' })
        assert.equal(
          await tocScroller.evaluate(
            (element) => getComputedStyle(element).scrollBehavior
          ),
          'auto'
        )
        await tocNav
          .getByRole('link', { name: 'First section', exact: true })
          .click()
        await page.waitForURL('**/docs/init/toc#first-section')
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.waitForTimeout(250)
        assert.equal(
          await tocNav.isVisible(),
          true,
          'Multiple section jumps must keep the popup open'
        )
        await page.mouse.move(700, 100)
        await tocNav.waitFor({ state: 'hidden' })
        await tocTrigger.hover()
        await tocNav.waitFor()
        await page.keyboard.press('Escape')
        await page.setViewportSize({ width: 390, height: 844 })
        assert.equal(await tocTrigger.isVisible(), false)
        await page.setViewportSize({ width: 1872, height: 955 })
        await page.goto(`${running.base}/docs/init/intro`)
        await page
          .getByRole('heading', { name: 'Details', exact: true })
          .waitFor()
        assert.equal(
          await page.locator('[data-rdx-toc]').count(),
          0,
          'One heading does not need a TOC'
        )
        await page.goto(`${running.base}/docs/1.0.0/init/links`)
        const crossCategoryLink = page.getByRole('link', {
          name: 'Cross category',
          exact: true,
        })
        await crossCategoryLink.click()
        await page.waitForURL(
          `${running.base}/docs/1.0.0/api/target#configuration`
        )
        await page.locator('#configuration').waitFor()
        assert.equal(await page.locator('#configuration-1').count(), 1)
        await tocTrigger.hover()
        await tocNav.waitFor()
        assert.deepEqual(
          await tocNav
            .getByRole('link')
            .evaluateAll((links) =>
              links.map((link) => link.getAttribute('href'))
            ),
          ['#configuration', '#configuration-1']
        )
        await page.keyboard.press('Escape')
        await page.goto(`${running.base}/docs/init/quotes`)
        const quote = page.locator('blockquote').first()
        await quote.waitFor()
        assert.equal(
          await quote.evaluate((element) =>
            element.hasAttribute('data-rdx-blockquote')
          ),
          true
        )
        assert.equal(
          await quote.locator('strong').innerText(),
          'formatted text'
        )
        assert.equal(
          await quote.getByRole('link').getAttribute('href'),
          '/docs/init/intro'
        )
        const tableRegion = page
          .locator('[data-slot="mdx-table-scroll"]')
          .first()
        const wideTable = page.locator('[data-slot="mdx-table-scroll"]').nth(1)
        assert.equal(await wideTable.locator('th').count(), 5)
        assert.equal(await wideTable.locator('tbody > tr').count(), 4)
        for (const row of await wideTable.locator('tbody > tr').all())
          assert.equal(await row.locator('td').count(), 5)
        assert.equal(
          await wideTable
            .locator('th')
            .nth(2)
            .evaluate((element) => getComputedStyle(element).textAlign),
          'center'
        )
        assert.equal(
          await wideTable.locator('th').last().innerText(),
          'Example'
        )
        const tableColors = await tableRegion
          .locator('tbody > tr')
          .evaluateAll((rows) =>
            rows.map((row) => getComputedStyle(row).backgroundColor)
          )
        assert.equal(tableColors.length, 4)
        assert.notEqual(tableColors[0], tableColors[1])
        assert.equal(tableColors[0], tableColors[2])
        assert.equal(tableColors[1], tableColors[3])
        for (const selector of ['thead tr', 'tbody tr:first-child']) {
          const borders = await tableRegion
            .locator(`${selector} > *`)
            .evaluateAll((cells) =>
              cells.map((cell) =>
                parseFloat(getComputedStyle(cell).borderRightWidth)
              )
            )
          assert.ok(borders.slice(0, -1).every((width) => width > 0))
          assert.equal(borders.at(-1), 0)
        }
        assert.ok(
          await tableRegion.evaluate(
            (element) =>
              parseFloat(getComputedStyle(element).borderTopLeftRadius) > 0
          )
        )
        assert.equal(
          await tableRegion
            .locator('th')
            .last()
            .evaluate((element) => getComputedStyle(element).textAlign),
          'right'
        )
        if (process.env.RDX_THEME_SCREENSHOTS) {
          await mkdir(process.env.RDX_THEME_SCREENSHOTS, { recursive: true })
          for (const theme of ['dark', 'light']) {
            await page.evaluate(
              (theme) =>
                document.documentElement.classList.toggle(
                  'dark',
                  theme === 'dark'
                ),
              theme
            )
            await quote.screenshot({
              path: path.join(
                process.env.RDX_THEME_SCREENSHOTS,
                `blockquote-${theme}.png`
              ),
              animations: 'disabled',
            })
            await tableRegion.screenshot({
              path: path.join(
                process.env.RDX_THEME_SCREENSHOTS,
                `table-${theme}.png`
              ),
              animations: 'disabled',
            })
            await wideTable.screenshot({
              path: path.join(
                process.env.RDX_THEME_SCREENSHOTS,
                `five-columns-${theme}.png`
              ),
              animations: 'disabled',
            })
          }
          await page.evaluate(() =>
            document.documentElement.classList.add('dark')
          )
        }
        await page.setViewportSize({ width: 390, height: 844 })
        assert.ok(
          await wideTable.evaluate(
            (element) => element.scrollWidth > element.clientWidth
          )
        )
        assert.ok(
          await wideTable
            .locator('tbody tr:first-child td')
            .evaluateAll((cells) =>
              cells.every((cell) => cell.getBoundingClientRect().width >= 160)
            )
        )
        await wideTable.focus()
        await page.keyboard.press('ArrowRight')
        await page.waitForFunction(
          () =>
            document.querySelectorAll('[data-slot="mdx-table-scroll"]')[1]
              .scrollLeft > 0
        )
        if (process.env.RDX_THEME_SCREENSHOTS)
          await wideTable.screenshot({
            path: path.join(
              process.env.RDX_THEME_SCREENSHOTS,
              'five-columns-mobile.png'
            ),
            animations: 'disabled',
          })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          ),
          true
        )
        if (process.env.RDX_THEME_SCREENSHOTS)
          await quote.screenshot({
            path: path.join(
              process.env.RDX_THEME_SCREENSHOTS,
              'blockquote-mobile.png'
            ),
            animations: 'disabled',
          })
        await page.setViewportSize({ width: 1872, height: 955 })
        if (process.env.RDX_THEME_SCREENSHOTS) {
          await page.setViewportSize({ width: 390, height: 844 })
          await tableRegion.screenshot({
            path: path.join(
              process.env.RDX_THEME_SCREENSHOTS,
              'table-mobile.png'
            ),
            animations: 'disabled',
          })
          await page.setViewportSize({ width: 1872, height: 955 })
        }
        await page
          .context()
          .grantPermissions(['clipboard-read', 'clipboard-write'], {
            origin: running.base,
          })
        await page.goto(`${running.base}/docs/init/accordion`)
        await page.evaluate(() => {
          window.accordionAnimations = []
          document.addEventListener('animationstart', (event) => {
            if (!event.target.matches('[data-slot="accordion-content"]')) return
            const animation = event.target
              .getAnimations()
              .find((item) => item.animationName === event.animationName)
            window.accordionAnimations.push({
              name: event.animationName,
              heights:
                animation?.effect.getKeyframes().map((frame) => frame.height) ??
                [],
            })
          })
        })
        const accordion = page.locator('[data-slot="accordion"]').first()
        const question = accordion.getByRole('button', {
          name: 'Where do I write my documentation?',
        })
        const preview = accordion.getByRole('button', {
          name: 'How do I preview my changes?',
        })
        assert.equal(await question.getAttribute('aria-expanded'), 'false')
        await question.focus()
        await page.keyboard.press('Enter')
        const answer = accordion.getByRole('region', {
          name: 'Where do I write my documentation?',
        })
        await answer.waitFor()
        assert.equal(
          await question.getAttribute('aria-controls'),
          await answer.getAttribute('id')
        )
        assert.equal(
          await answer.getAttribute('aria-labelledby'),
          await question.getAttribute('id')
        )
        assert.equal(
          await question.evaluate((element) => element.parentElement.tagName),
          'H3'
        )
        assert.match(await answer.innerText(), /Each folder becomes a category/)
        await page.keyboard.press('Tab')
        assert.equal(
          await answer
            .getByRole('link', { name: 'introduction' })
            .evaluate((element) => element === document.activeElement),
          true
        )
        await page.keyboard.press('Tab')
        assert.equal(
          await preview.evaluate(
            (element) => element === document.activeElement
          ),
          true
        )
        await page.keyboard.press('Space')
        const previewPanel = accordion.getByRole('region', {
          name: 'How do I preview my changes?',
        })
        await previewPanel.waitFor()
        await answer.waitFor({ state: 'hidden' })
        const accordionAnimations = await page.evaluate(
          () => window.accordionAnimations
        )
        assert.ok(
          accordionAnimations.some(
            (animation) => animation.name === 'accordion-up'
          )
        )
        const opening = accordionAnimations.find(
          (animation) => animation.name === 'accordion-down'
        )
        assert.ok(opening)
        assert.equal(opening.heights[0], '0px')
        assert.ok(Number.parseFloat(opening.heights.at(-1)) > 0)
        assert.equal(await question.getAttribute('aria-expanded'), 'false')
        assert.equal(
          await accordion
            .getByRole('button', { name: 'More examples (soon)' })
            .isDisabled(),
          true
        )
        await previewPanel.getByRole('button', { name: 'Copy code' }).click()
        await page.waitForFunction(async () =>
          (await navigator.clipboard.readText()).includes('pnpm dev')
        )
        assert.equal(
          (await page.evaluate(() => navigator.clipboard.readText())).replace(
            /\r\n/g,
            '\n'
          ),
          'pnpm dev\n'
        )
        assert.equal(
          await previewPanel
            .getByRole('note', { name: 'Live updates' })
            .isVisible(),
          true
        )
        const multiple = page.locator('[data-slot="accordion"]').nth(1)
        await multiple
          .getByRole('button', { name: 'Build for production' })
          .click()
        await multiple
          .getByRole('button', { name: 'Check the production site' })
          .click()
        await multiple
          .getByRole('region', { name: 'Build for production' })
          .waitFor({ state: 'hidden' })
        await multiple
          .getByRole('region', { name: 'Check the production site' })
          .waitFor()
        await preview.focus()
        await page.keyboard.press('Enter')
        await previewPanel.waitFor({ state: 'hidden' })
        await preview.click()
        await previewPanel.waitFor()
        await page.emulateMedia({ reducedMotion: 'reduce' })
        assert.equal(
          await previewPanel.evaluate(
            (element) => getComputedStyle(element).animationName
          ),
          'none'
        )
        await preview.click()
        await previewPanel.waitFor({ state: 'hidden' })
        await preview.click()
        await previewPanel.waitFor()
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.setViewportSize({ width: 390, height: 844 })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          ),
          true
        )
        if (process.env.RDX_THEME_SCREENSHOTS) {
          await mkdir(process.env.RDX_THEME_SCREENSHOTS, { recursive: true })
          for (const theme of ['dark', 'light']) {
            await page.evaluate(
              (value) =>
                document.documentElement.classList.toggle(
                  'dark',
                  value === 'dark'
                ),
              theme
            )
            await accordion.screenshot({
              path: path.join(
                process.env.RDX_THEME_SCREENSHOTS,
                `accordion-${theme}-mobile.png`
              ),
              animations: 'disabled',
            })
          }
        }
        await page.setViewportSize({ width: 1872, height: 955 })
        await page.goto(`${running.base}/docs/init/tabs`)
        const managers = page.getByRole('tablist', { name: 'Package manager' })
        const environments = page.getByRole('tablist', { name: 'Environment' })
        const npmTab = managers.getByRole('tab', { name: 'npm', exact: true })
        const pnpmTab = managers.getByRole('tab', { name: 'pnpm', exact: true })
        const yarnTab = managers.getByRole('tab', { name: 'yarn', exact: true })
        const selectedValue = (tab) => tab.getAttribute('aria-selected')
        assert.equal(await selectedValue(pnpmTab), 'true')
        await page
          .getByRole('tabpanel', { name: 'pnpm', exact: true })
          .waitFor()
        await pnpmTab.focus()
        await page.keyboard.press('ArrowRight')
        assert.equal(
          await yarnTab.evaluate(
            (element) => element === document.activeElement
          ),
          true
        )
        assert.equal(await selectedValue(pnpmTab), 'true')
        await page.keyboard.press('Enter')
        await page
          .getByRole('tabpanel', { name: 'yarn', exact: true })
          .waitFor()
        await page.keyboard.press('Home')
        assert.equal(
          await npmTab.evaluate(
            (element) => element === document.activeElement
          ),
          true
        )
        await page.keyboard.press('Space')
        const npmPanel = page.getByRole('tabpanel', {
          name: 'npm',
          exact: true,
        })
        await npmPanel.waitFor()
        assert.ok(
          (await npmPanel.locator('[data-rdx-code-block]').boundingBox())
            .height <= 96,
          'Highlighting must not enlarge a single-line code block'
        )
        const panelId = await npmPanel.getAttribute('id')
        assert.equal(await npmTab.getAttribute('aria-controls'), panelId)
        assert.equal(
          await npmPanel.getAttribute('aria-labelledby'),
          await npmTab.getAttribute('id')
        )
        await page.keyboard.press('Tab')
        const copyTab = page
          .locator('[data-slot="tabs"]')
          .first()
          .getByRole('button', { name: 'Copy active tab' })
        assert.equal(
          await copyTab.evaluate(
            (element) => element === document.activeElement
          ),
          true
        )
        await page.keyboard.press('Enter')
        await page.waitForFunction(
          () =>
            document
              .querySelector('[aria-label="Copy active tab"]')
              ?.getAttribute('data-status') === 'copied'
        )
        assert.equal(
          (await page.evaluate(() => navigator.clipboard.readText())).replace(
            /\r\n/g,
            '\n'
          ),
          'Install dependencies with npm:\n\nnpm install'
        )
        assert.equal(await copyTab.innerText(), '')
        await page.keyboard.press('Tab')
        assert.equal(
          await npmPanel.evaluate(
            (element) => element === document.activeElement
          ),
          true
        )
        await npmPanel.getByRole('button', { name: 'Copy code' }).click()
        await npmPanel
          .locator('button[aria-label="Copy code"][data-status="copied"]')
          .waitFor()
        assert.equal(
          (await page.evaluate(() => navigator.clipboard.readText())).replace(
            /\r\n/g,
            '\n'
          ),
          'npm install\n'
        )
        assert.equal(
          await selectedValue(
            environments.getByRole('tab', { name: 'Development', exact: true })
          ),
          'true'
        )
        await environments
          .getByRole('tab', { name: 'Production', exact: true })
          .focus()
        await page.keyboard.press('End')
        assert.equal(
          await environments
            .getByRole('tab', { name: 'Preview (soon)', exact: true })
            .evaluate((element) => element === document.activeElement),
          true
        )
        assert.equal(
          await environments
            .getByRole('tab', { name: 'Preview (soon)', exact: true })
            .isDisabled(),
          true
        )
        await page.keyboard.press('Enter')
        assert.equal(
          await selectedValue(
            environments.getByRole('tab', { name: 'Development', exact: true })
          ),
          'true'
        )
        await page.keyboard.press('ArrowLeft')
        await page.keyboard.press('Space')
        await page
          .getByRole('tabpanel', { name: 'Production', exact: true })
          .waitFor()
        const environmentCopy = page
          .locator('[data-slot="tabs"]')
          .nth(1)
          .getByRole('button', { name: 'Copy active tab' })
        await environmentCopy.click()
        await page.waitForFunction(async () =>
          (await navigator.clipboard.readText()).includes('Run pnpm build.')
        )
        const environmentText = await page.evaluate(() =>
          navigator.clipboard.readText()
        )
        assert.match(environmentText, /Run pnpm start/)
        assert.doesNotMatch(
          environmentText,
          /install|Live updates|Development|Production/
        )
        assert.equal(await selectedValue(npmTab), 'true')
        if (process.env.RDX_THEME_SCREENSHOTS) {
          for (const theme of ['dark', 'light']) {
            await page.evaluate(
              (value) =>
                document.documentElement.classList.toggle(
                  'dark',
                  value === 'dark'
                ),
              theme
            )
            await page
              .locator('[data-slot="tabs"]')
              .first()
              .screenshot({
                path: path.join(
                  process.env.RDX_THEME_SCREENSHOTS,
                  `tabs-${theme}-desktop.png`
                ),
                animations: 'disabled',
              })
          }
        }
        await page.setViewportSize({ width: 390, height: 844 })
        await page.evaluate(() => {
          for (const tab of document.querySelectorAll(
            '[data-slot="tabs-trigger"]'
          )) {
            tab.textContent += ' — long label'
          }
        })
        assert.equal(
          await managers.evaluate(
            (element) => element.scrollWidth > element.clientWidth
          ),
          true
        )
        await managers.getByRole('tab').first().focus()
        await page.keyboard.press('End')
        await page.keyboard.press('Enter')
        await page.getByRole('tabpanel', { name: /yarn/ }).waitFor()
        await copyTab.click()
        await page.waitForFunction(async () =>
          (await navigator.clipboard.readText()).includes('yarn install')
        )
        const copiedTab = (
          await page.evaluate(() => navigator.clipboard.readText())
        ).replace(/\r\n/g, '\n')
        assert.equal(
          copiedTab,
          'Install dependencies with yarn:\n\nyarn install'
        )
        const copyBounds = await copyTab.boundingBox()
        assert.ok(copyBounds.x >= 0 && copyBounds.x + copyBounds.width <= 390)
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          ),
          true
        )
        if (process.env.RDX_THEME_SCREENSHOTS) {
          for (const theme of ['dark', 'light']) {
            await page.evaluate(
              (value) =>
                document.documentElement.classList.toggle(
                  'dark',
                  value === 'dark'
                ),
              theme
            )
            await page
              .locator('[data-slot="tabs"]')
              .first()
              .screenshot({
                path: path.join(
                  process.env.RDX_THEME_SCREENSHOTS,
                  `tabs-${theme}-mobile.png`
                ),
                animations: 'disabled',
              })
          }
        }
        await page.setViewportSize({ width: 1872, height: 955 })
        await page.goto(`${running.base}/docs/init/code`)
        const blocks = page.locator('[data-rdx-code-block]')
        assert.equal(await blocks.count(), 2)
        const tokens = blocks
          .first()
          .locator('pre.shiki code span[style*="--shiki-light"]')
        assert.ok((await tokens.count()) > 3)
        const colors = {}
        for (const theme of ['light', 'dark']) {
          await page.evaluate(
            (value) =>
              document.documentElement.classList.toggle(
                'dark',
                value === 'dark'
              ),
            theme
          )
          colors[theme] = await tokens.evaluateAll((elements) => [
            ...new Set(
              elements.map((element) => getComputedStyle(element).color)
            ),
          ])
          assert.ok(
            colors[theme].length >= 3,
            `${theme}: tokens should have distinct colors`
          )
        }
        assert.notDeepEqual(colors.light, colors.dark)
        assert.equal(
          await blocks
            .first()
            .locator('pre')
            .evaluate((element) => element.style.backgroundColor),
          ''
        )
        const codeMetrics = await blocks
          .nth(1)
          .locator('pre')
          .evaluate((element) => {
            const style = getComputedStyle(element)
            return {
              padding: style.padding,
              fontSize: style.fontSize,
              lineHeight: style.lineHeight,
            }
          })
        assert.deepEqual(codeMetrics, {
          padding: '12px',
          fontSize: '13px',
          lineHeight: '24px',
        })
        assert.ok(
          (await blocks.nth(1).boundingBox()).height <= 96,
          'A single-line code block should remain compact'
        )
        const copy = blocks.first().getByRole('button', { name: 'Copy code' })
        await copy.focus()
        await page.keyboard.press('Enter')
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-rdx-code-block] button')
              ?.getAttribute('data-status') === 'copied'
        )
        assert.equal(
          (await page.evaluate(() => navigator.clipboard.readText())).replace(
            /\r\n/g,
            '\n'
          ),
          copySample
        )
        await blocks.nth(1).getByRole('button', { name: 'Copy code' }).click()
        await blocks.nth(1).locator('button[data-status="copied"]').waitFor()
        assert.equal(await copy.innerText(), '')
        assert.equal(await copy.getAttribute('title'), 'Copied!')
        assert.equal(
          (await page.evaluate(() => navigator.clipboard.readText())).replace(
            /\r\n/g,
            '\n'
          ),
          'Second block\n'
        )
        assert.equal(
          await blocks.first().locator('pre').textContent(),
          copySample
        )
        assert.equal(await page.locator('p [data-rdx-code-block]').count(), 0)
        await blocks.first().locator('button[data-status="idle"]').waitFor()
        if (process.env.RDX_THEME_SCREENSHOTS) {
          await mkdir(process.env.RDX_THEME_SCREENSHOTS, { recursive: true })
          for (const theme of ['dark', 'light']) {
            await page.evaluate(
              (theme) =>
                document.documentElement.classList.toggle(
                  'dark',
                  theme === 'dark'
                ),
              theme
            )
            await page.screenshot({
              path: path.join(
                process.env.RDX_THEME_SCREENSHOTS,
                `code-${theme}.png`
              ),
              animations: 'disabled',
            })
          }
          await page.evaluate(() =>
            document.documentElement.classList.add('dark')
          )
          await page.setViewportSize({ width: 390, height: 844 })
          await page.screenshot({
            path: path.join(
              process.env.RDX_THEME_SCREENSHOTS,
              'code-mobile.png'
            ),
            animations: 'disabled',
          })
          await page.setViewportSize({ width: 1872, height: 955 })
        }
        assert.match(
          await blocks
            .first()
            .locator('pre')
            .evaluate((element) => getComputedStyle(element).fontFamily),
          /mono/i
        )
        const rejected = await browser.newPage()
        await rejected.setViewportSize({ width: 390, height: 844 })
        await rejected.addInitScript(() =>
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText: async () => {
                throw new DOMException('Permission denied', 'NotAllowedError')
              },
            },
          })
        )
        await rejected.goto(`${running.base}/docs/init/code`)
        const failed = rejected.locator('[data-rdx-code-block]').first()
        await failed.getByRole('button', { name: 'Copy code' }).click()
        await failed
          .getByRole('status')
          .filter({
            hasText: 'Could not copy. Select the code and copy it manually.',
          })
          .waitFor()
        assert.equal(await failed.getByRole('button').innerText(), '')
        assert.equal(
          await failed.getByRole('button').getAttribute('data-status'),
          'error'
        )
        const retryBounds = await failed.getByRole('button').boundingBox()
        assert.ok(
          retryBounds &&
            retryBounds.x >= 0 &&
            retryBounds.x + retryBounds.width <= 390
        )
        await rejected.goto(`${running.base}/docs/init/tabs`)
        const rejectedCopyTab = rejected
          .locator('[data-slot="tabs"]')
          .first()
          .getByRole('button', { name: 'Copy active tab' })
        await rejectedCopyTab.click()
        await rejected.waitForFunction(
          () =>
            document
              .querySelector('[aria-label="Copy active tab"]')
              ?.getAttribute('data-status') === 'error'
        )
        assert.match(
          await rejectedCopyTab.getAttribute('title'),
          /Could not copy/
        )
        assert.equal(await rejectedCopyTab.innerText(), '')
        await rejected.close()
        await page.goto(`${running.base}/docs/init/components`)
        await page.getByRole('note', { name: 'Before updating' }).waitFor()
        assert.equal(await page.locator('[data-rdx-callout]').count(), 6)
        if (process.env.RDX_THEME_SCREENSHOTS) {
          await mkdir(process.env.RDX_THEME_SCREENSHOTS, { recursive: true })
          for (const theme of ['dark', 'light']) {
            await page.evaluate(
              (theme) =>
                document.documentElement.classList.toggle(
                  'dark',
                  theme === 'dark'
                ),
              theme
            )
            await page.screenshot({
              path: path.join(
                process.env.RDX_THEME_SCREENSHOTS,
                `callouts-${theme}.png`
              ),
              animations: 'disabled',
            })
          }
          await page.evaluate(() =>
            document.documentElement.classList.add('dark')
          )
        }
        await page.setViewportSize({ width: 390, height: 844 })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          ),
          true
        )
        for (const selector of ['[data-slot="mdx-table-scroll"]', 'pre']) {
          const wide = page.locator(selector).last()
          assert.equal(
            await wide.evaluate(
              (element) => element.scrollWidth > element.clientWidth
            ),
            true,
            `Expected horizontal scrolling for ${selector}`
          )
          await wide.focus()
          await page.keyboard.press('ArrowRight')
          await page.waitForFunction(
            (selector) =>
              [...document.querySelectorAll(selector)].at(-1).scrollLeft > 0,
            selector
          )
        }
        await page.setViewportSize({ width: 1872, height: 955 })
        await page.goto(running.base)
        await page
          .getByRole('button', { name: 'Documentation version: Current' })
          .click()
        await page.getByRole('menuitem', { name: 'Version 1.0.0' }).waitFor()
        if (process.env.RDX_THEME_SCREENSHOTS) {
          await mkdir(process.env.RDX_THEME_SCREENSHOTS, { recursive: true })
          await page.screenshot({
            animations: 'disabled',
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
            .getAttribute('aria-expanded'),
          'false'
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
        assert.equal(
          await page
            .getByAltText('Public asset')
            .evaluate((image) => image.complete && image.naturalWidth > 0),
          true
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
        await page.goto(`${running.base}/docs/init/intro`)
        await page.getByRole('button', { name: 'Open sidebar' }).click()
        const navigation = page.getByRole('dialog', {
          name: 'Documentation navigation',
        })
        await navigation.getByRole('link', { name: 'New page' }).click()
        await page.waitForURL('**/docs/init/new')
        await navigation.waitFor({ state: 'hidden' })
        await page.getByRole('button', { name: 'Open sidebar' }).click()
        await navigation.waitFor()
        await page.goBack()
        await page.waitForURL('**/docs/init/intro')
        await navigation.waitFor({ state: 'hidden' })
        await page.getByRole('button', { name: 'Open sidebar' }).click()
        await navigation.waitFor()
        await page.keyboard.press('Escape')
        await navigation.waitFor({ state: 'hidden' })
        assert.deepEqual(errors, [])
      } finally {
        await browser.close()
      }
    }

    running.close()
    running = undefined
    await writeFile(
      path.join(rootDir, 'home.tsx'),
      await readFile(
        new URL('./fixtures/base-ui-home.tsx', import.meta.url),
        'utf8'
      )
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
    if (process.env.RDX_PLAYWRIGHT_MODULE) {
      const { chromium } = require(process.env.RDX_PLAYWRIGHT_MODULE)
      const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.RDX_BROWSER_EXECUTABLE,
      })
      try {
        const page = await browser.newPage()
        await page.goto(`${running.base}/docs/init/toc`)
        await page
          .getByRole('heading', { name: 'Last section', exact: true })
          .waitFor()
        assert.equal(
          await page.locator('[data-rdx-toc]').count(),
          0,
          'TOC must stay off when omitted from config'
        )
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text())
        })
        await page.goto(running.base)
        const link = page.getByRole('link', { name: 'Documentation link' })
        assert.equal(await link.getAttribute('href'), '/docs/init/intro')
        assert.equal(await link.getAttribute('role'), null)
        assert.equal(
          await page
            .getByRole('button', { name: 'Disabled button' })
            .isDisabled(),
          true
        )
        assert.equal(
          await page.getByRole('separator').getAttribute('aria-orientation'),
          'vertical'
        )
        const trigger = page.getByRole('button', {
          name: 'Primitive test menu',
        })
        assert.match(await trigger.getAttribute('class'), /fixture-trigger/)
        await trigger.focus()
        await page.keyboard.press('ArrowDown')
        const checkbox = page.getByRole('menuitemcheckbox', {
          name: 'Show details',
        })
        await checkbox.waitFor()
        assert.equal(
          await page
            .getByRole('menuitem', { name: 'Disabled item' })
            .getAttribute('aria-disabled'),
          'true'
        )
        await checkbox.focus()
        await page.keyboard.press('Space')
        await page.waitForFunction(
          () =>
            document.querySelector('output')?.textContent === 'true:one:none'
        )
        assert.equal(await checkbox.getAttribute('aria-checked'), 'true')
        const radio = page.getByRole('menuitemradio', { name: 'Second option' })
        await radio.focus()
        await page.keyboard.press('Space')
        await page.waitForFunction(
          () =>
            document.querySelector('output')?.textContent === 'true:two:none'
        )
        assert.equal(await radio.getAttribute('aria-checked'), 'true')
        const submenu = page.getByRole('menuitem', { name: 'More actions' })
        await submenu.focus()
        await page.keyboard.press('ArrowRight')
        const action = page.getByRole('menuitem', { name: 'Run action' })
        await action.waitFor()
        await action.focus()
        await page.keyboard.press('Enter')
        await page.waitForFunction(
          () =>
            document.querySelector('output')?.textContent === 'true:two:BUTTON'
        )
        await page
          .getByRole('menu', { name: 'Primitive test menu', exact: true })
          .waitFor({ state: 'hidden' })
        await trigger.focus()
        await page.keyboard.press('Enter')
        await checkbox.waitFor()
        await page.keyboard.press('Escape')
        await page.waitForFunction(
          () => document.activeElement?.textContent === 'Primitive test menu'
        )
        await trigger.click()
        await checkbox.waitFor()
        // A modal menu covers the page with an invisible dismissal backdrop.
        // Click real coordinates rather than asking Playwright to bypass it.
        const heading = await page
          .getByRole('heading', { name: 'Project owned homepage' })
          .boundingBox()
        assert.ok(heading)
        await page.mouse.click(heading.x + 5, heading.y + 5)
        await page
          .getByRole('menu', { name: 'Primitive test menu', exact: true })
          .waitFor({ state: 'hidden' })
        assert.deepEqual(errors, [])
      } finally {
        await browser.close()
      }
    }
  }
)
