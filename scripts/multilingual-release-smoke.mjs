import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { withProductionServer } from './production-server.mjs'

/** Exercise only packed packages, with no registry publication or workspace source links. */
// resume retries an installation that stopped before plugin activation in a retained fixture.
export async function verifyMultilingualArchives({
  temporary,
  releases,
  pnpm,
  resume = false,
}) {
  const generatorRoot = path.join(temporary, 'i18n-generator')
  await mkdir(generatorRoot, { recursive: resume })
  if (!resume) {
    execFileSync('tar', [
      '-xf',
      releases.get('@lexibase/create-rdx').archive,
      '-C',
      generatorRoot,
    ])
    const generator = path.join(generatorRoot, 'package')
    await writeFile(
      path.join(generator, 'pnpm-workspace.yaml'),
      "packages:\n  - '.'\n"
    )
    pnpm(generator, ['install', '--ignore-scripts', '--prefer-offline'])
  }
  const generator = path.join(generatorRoot, 'package')
  const archives = Object.fromEntries(
    [...releases]
      .filter(([name]) => name !== '@lexibase/create-rdx')
      .map(([name, release]) => [
        name,
        `file:${release.archive.replaceAll('\\', '/')}`,
      ])
  )
  // Scope the UI archive to the framework dependency, preserving the runtime's semver peer.
  const overrides = Object.fromEntries(
    Object.entries(archives).filter(
      ([name]) => !['@lexibase/rdx', '@lexibase/rdx-ui'].includes(name)
    )
  )
  overrides['@lexibase/rdx>@lexibase/rdx-ui'] = archives['@lexibase/rdx-ui']
  for (const monorepo of [false, true]) {
    const workspace = path.join(
      temporary,
      monorepo ? 'i18n-workspace' : 'i18n-standalone'
    )
    const parent = monorepo ? path.join(workspace, 'apps') : workspace
    await mkdir(parent, { recursive: true })
    if (monorepo) {
      await writeFile(
        path.join(workspace, 'package.json'),
        JSON.stringify(
          {
            name: 'i18n-test-workspace',
            private: true,
            pnpm: { overrides },
          },
          null,
          2
        )
      )
      await writeFile(
        path.join(workspace, 'pnpm-workspace.yaml'),
        "packages:\n  - 'apps/*'\n"
      )
      await mkdir(path.join(parent, 'other'))
      await writeFile(
        path.join(parent, 'other/package.json'),
        '{"name":"other","private":true}'
      )
    }
    const project = path.join(parent, 'docs')
    const exists = await access(path.join(project, 'package.json')).then(
      () => true,
      () => false
    )
    if (!resume || !exists)
      execFileSync(
        process.execPath,
        [path.join(generator, 'bin/index.js'), 'docs', '--skip-install'],
        { cwd: parent, stdio: 'pipe' }
      )
    const pkgPath = path.join(project, 'package.json')
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    pkg.packageManager = 'pnpm@9.0.0'
    // Install optional archives without activation first: package presence alone is inert.
    for (const name of [
      '@lexibase/rdx',
      '@lexibase/rdx-i18n',
      '@lexibase/rdx-versioning',
    ])
      pkg.dependencies[name] = archives[name]
    if (!monorepo) {
      pkg.pnpm = { overrides }
      await writeFile(
        path.join(project, 'pnpm-workspace.yaml'),
        "packages:\n  - '.'\n"
      )
    }
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    console.log(
      `Installing multilingual ${monorepo ? 'monorepo' : 'standalone'} fixture...`
    )
    pnpm(project, ['install', '--strict-peer-dependencies', '--prefer-offline'])
    const host = createRequire(pkgPath)
    const framework = path.dirname(host.resolve('@lexibase/rdx/package.json'))
    assert.ok(
      (await realpath(framework)).includes(
        `${path.sep}node_modules${path.sep}`
      ),
      'The framework must be installed from its archive'
    )
    const cli = (...args) => pnpm(project, ['exec', 'rdx', ...args], true)
    cli('prepare')
    await assert.rejects(access(path.join(project, 'versions.json')))
    await assert.rejects(access(path.join(project, 'locale')))
    const parentManifest = monorepo
      ? await readFile(path.join(workspace, 'package.json'), 'utf8')
      : undefined
    assert.match(cli('add', 'i18n', '--locales', 'pt-BR,es'), /i18n activated/)
    await access(path.join(project, 'locale/pt-br/docs/.gitkeep'))
    await access(path.join(project, 'locale/es/docs/.gitkeep'))
    const configPath = path.join(project, 'rdx.config.ts')
    let config = await readFile(configPath, 'utf8')
    config = config
      .replace('search: false', 'search: true')
      .replace(
        'metadata: {',
        "metadata: { metadataBase: 'https://docs.example.test',"
      )
      .replace(
        'i18n({',
        "i18n({ contributionUrl: 'https://github.com/example/project/tree/main/locale',"
      )
    await writeFile(configPath, config)
    assert.match(cli('add', 'i18n'), /already configured/)
    assert.equal(await readFile(configPath, 'utf8'), config)
    const originalPath = path.join(project, 'docs/init/intro.mdx')
    const original = await readFile(originalPath, 'utf8')
    await writeFile(originalPath, original + '\n\nOriginalEnglishMarker\n')
    await mkdir(path.join(project, 'locale/pt-br/docs/init'), {
      recursive: true,
    })
    const translatedPath = path.join(
      project,
      'locale/pt-br/docs/init/intro.mdx'
    )
    await writeFile(
      translatedPath,
      '---\ntitle: Introdução\n---\n\n## Olá\n\nPortuguesePublishedMarker\n'
    )
    cli('add', 'versioning')
    cli('version', '3.0.0')
    cli('version', '3.1.0')
    const snapshotPath = path.join(
      project,
      'locale/pt-br/versioned_docs/version-3.1.0/init/intro.mdx'
    )
    const frozen = await readFile(snapshotPath, 'utf8')
    cli('archive', '3.1.0')
    assert.deepEqual(
      JSON.parse(await readFile(path.join(project, 'versions.json'), 'utf8'))
        .archived,
      ['3.1.0']
    )
    cli('unarchive', '3.1.0')
    assert.equal(await readFile(snapshotPath, 'utf8'), frozen)
    await writeFile(translatedPath, frozen + '\nPortugueseLiveOnlyMarker\n')
    await writeFile(
      path.join(project, 'private-test-file.txt'),
      'Not a server asset'
    )
    const output = pnpm(project, ['build'], true)
    await writeFile(path.join(project, 'build.log'), output)
    assert.doesNotMatch(
      output,
      /Dynamic filesystem access causes tracing of the whole project/
    )
    const entry = monorepo
      ? host.resolve('next/dist/bin/next')
      : path.join(framework, 'bin/rdx.mjs')
    await withProductionServer(
      entry,
      monorepo ? path.join(project, '.rdx') : project,
      async (base) => {
        async function request(url, status = 200) {
          const response = await fetch(base + url, {
            redirect: 'manual',
            signal: AbortSignal.timeout(15_000),
          })
          assert.equal(response.status, status, url)
          return response
        }
        const published = await (
          await request('/pt-br/docs/3.1.0/init/intro')
        ).text()
        assert.match(published, /PortuguesePublishedMarker/)
        assert.doesNotMatch(published, /PortugueseLiveOnlyMarker/)
        assert.match(published, /<html[^>]*lang="pt-BR"/)
        assert.match(published, /data-rdx-language-trigger/)
        assert.match(published, /data-rdx-version-trigger/)
        const live = await (await request('/pt-br/docs/init/intro')).text()
        assert.match(live, /PortugueseLiveOnlyMarker/)
        const missing = await (
          await request('/es/docs/3.1.0/init/intro')
        ).text()
        assert.match(missing, /OriginalEnglishMarker/)
        assert.match(missing, /data-rdx-translation-fallback/)
        assert.match(missing, /data-rdx-translate-page/)
        assert.match(
          missing,
          /href="https:\/\/github.com\/example\/project\/tree\/main\/locale"/
        )
        const previous = await request(
          '/pt-br/docs/3.0.0/init/intro?from=old',
          308
        )
        assert.equal(
          previous.headers.get('location'),
          '/pt-br/docs/3.1.0/init/intro?from=old'
        )
        await previous.arrayBuffer()
        const index = await (await request('/pt-br/rdx-search/3.1.0')).text()
        assert.match(index, /PortuguesePublishedMarker/)
        assert.doesNotMatch(
          index,
          /PortugueseLiveOnlyMarker|OriginalEnglishMarker/
        )
        await (await request('/pt-br/docs/missing', 404)).arrayBuffer()
        await (await request('/images/rdx.svg')).arrayBuffer()
      },
      { readyPath: '/pt-br/docs/3.1.0/init/intro' }
    )
    const tracePath = path.join(
      project,
      '.rdx/.next/server/app/(rdx-locales)/[locale]/docs/[[...slug]]/page.js.nft.json'
    )
    const files = new Set(
      JSON.parse(await readFile(tracePath, 'utf8')).files.map((file) =>
        path.resolve(path.dirname(tracePath), file)
      )
    )
    assert.ok(
      files.has(snapshotPath),
      'Deployment must retain translated snapshots'
    )
    assert.equal(files.has(path.join(project, 'private-test-file.txt')), false)
    if (monorepo) {
      assert.equal(
        await readFile(path.join(workspace, 'package.json'), 'utf8'),
        parentManifest
      )
      assert.equal(
        await readFile(path.join(parent, 'other/package.json'), 'utf8'),
        '{"name":"other","private":true}'
      )
    }
    console.log(
      `OK multilingual archives: ${monorepo ? 'monorepo apps/docs, runtime cwd .rdx' : 'standalone docs'}, activation, contribution, fallback, editions, redirects, search and deployment trace`
    )
  }
}
