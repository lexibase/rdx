import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { withProductionServer } from './production-server.mjs'

// Test the publishable archives, not workspace source links. Nothing publishes.
const root = fileURLToPath(new URL('../', import.meta.url))
const pnpmEntry = process.env.npm_execpath
assert.ok(
  pnpmEntry && /\.[cm]?js$/i.test(pnpmEntry),
  'Run this check with pnpm test:release [--install].'
)
const base = path.join(root, '.rdx-package-smoke')
await mkdir(base, { recursive: true })
assert.equal(
  path.relative(await realpath(root), await realpath(base)),
  '.rdx-package-smoke',
  'The smoke-test directory must stay inside this workspace.'
)
const timestamp = new Date()
  .toISOString()
  .replaceAll(':', '-')
  .replace('T', '_')
  .replace('Z', 'UTC')
const temporary = await mkdtemp(path.join(base, `release-${timestamp}-`))
const directories = [
  'rdx-types',
  'rdx-core',
  'rdx-ui',
  'rdx-next',
  'rdx-plugin-versioning',
  'create-rdx',
]
const required = {
  'rdx-types': ['dist/index.d.ts', 'dist/config.d.ts', 'dist/search.d.ts'],
  'rdx-core': [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/config/index.js',
    'dist/mdx/index.js',
    'dist/search/index.js',
    'dist/search/index.d.ts',
  ],
  'rdx-ui': [
    'src/styles/globals.css',
    'src/styles/globals.d.css.ts',
    'src/components/mdx-components.tsx',
    'src/components/docs-toc.tsx',
    'src/components/docs-search.tsx',
    'src/components/docs-search-dialog.tsx',
    'src/components/command.tsx',
    'src/components/dialog.tsx',
    'src/lib/docs-search.ts',
  ],
  'rdx-next': [
    'config.mjs',
    'config.d.mts',
    'bin/rdx.mjs',
    'bin/add-plugin.mjs',
    'bin/public-assets.mjs',
    'dist/runtime/index.js',
    'dist/runtime/index.d.ts',
    'templates/runtime/app/rdx-search/[source]/route.ts',
    'templates/runtime/app/docs/[[...slug]]/page.tsx',
    'templates/runtime/rdx-project.ts',
    'src/runtime/styles.css',
    'src/runtime/styles.d.css.ts',
  ],
  'rdx-plugin-versioning': ['dist/index.js', 'dist/index.d.ts'],
  'create-rdx': [
    'bin/index.js',
    'bin/options.mjs',
    'templates/default/package.json',
    'templates/default/rdx.config.ts',
    'templates/default/gitignore.template',
    'templates/default/public/images/rdx.svg',
  ],
}
function pnpm(cwd, args, capture = false) {
  return execFileSync(process.execPath, [pnpmEntry, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  })
}

function buildProject(project) {
  const output = pnpm(project, ['build'], true)
  process.stdout.write(output)
  assert.doesNotMatch(
    output,
    /Dynamic filesystem access causes tracing of the whole project/,
    'An installed RDX build must not trace the whole project'
  )
}

async function verifyDeploymentTrace(project, versioned) {
  const tracePath = path.join(
    project,
    '.rdx/.next/server/app/docs/[[...slug]]/page.js.nft.json'
  )
  const trace = JSON.parse(await readFile(tracePath, 'utf8'))
  const files = new Set(
    trace.files.map((file) => path.resolve(path.dirname(tracePath), file))
  )
  for (const file of [
    'docs/init/intro.mdx',
    'docs/init/_category.json',
    ...(versioned
      ? ['versions.json', 'versioned_docs/version-1.0.0/init/intro.mdx']
      : []),
  ])
    assert.ok(
      files.has(path.resolve(project, file)),
      `Deployment is missing ${file}`
    )
  for (const file of [
    'rdx.config.ts',
    'README.md',
    '.env.local',
    'public/images/rdx.svg',
  ])
    assert.equal(
      files.has(path.resolve(project, file)),
      false,
      `Unexpected server asset: ${file}`
    )
  console.log(
    'OK deployment trace: configured content retained, unrelated project files excluded'
  )
}

async function request(base, route, expectedStatus = 200) {
  const response = await fetch(`${base}${route}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  assert.equal(
    response.status,
    expectedStatus,
    `${route}: unexpected HTTP status`
  )
  return response
}

async function verifySite(
  project,
  { original, current, versioned = false, search = true, runtimeCwd = false }
) {
  const entry = runtimeCwd
    ? createRequire(path.join(project, 'package.json')).resolve(
        'next/dist/bin/next'
      )
    : path.join(project, 'node_modules/@lexibase/rdx-next/bin/rdx.mjs')
  await withProductionServer(
    entry,
    runtimeCwd ? path.join(project, '.rdx') : project,
    async (base) => {
      const redirect = await request(base, '/', 307)
      assert.equal(redirect.headers.get('location'), '/docs')
      await redirect.arrayBuffer()
      const docsRoot = await (await request(base, '/docs')).text()
      assert.ok(
        docsRoot.includes(current),
        'Dynamic /docs must read live project content'
      )
      const html = await (await request(base, '/docs/init/intro')).text()
      assert.match(html, /<title>Introduction \| My documentation<\/title>/)
      assert.match(docsRoot, /<title>Introduction \| My documentation<\/title>/)
      assert.match(
        html,
        /<meta name="description" content="Start building your documentation with RDX\."/
      )
      const secondPage = await (
        await request(base, '/docs/init/getting-started')
      ).text()
      assert.match(
        secondPage,
        /<title>Getting started \| My documentation<\/title>/
      )
      assert.match(
        html,
        /<meta name="application-name" content="My documentation"/
      )
      assert.match(html, /aria-label="My documentation"/)
      assert.match(html, /<strong>My documentation<\/strong>/)
      assert.match(html, /<meta name="author" content="RDX Metadata Fixture"/)
      assert.match(html, /<meta name="robots" content="noindex, nofollow"/)
      assert.match(
        html,
        /<meta property="og:image" content="https:\/\/docs\.example\.test\/images\/rdx\.svg"/
      )
      assert.match(
        html,
        /<meta name="twitter:card" content="summary_large_image"/
      )
      assert.match(html, /<link rel="icon" href="\/images\/rdx\.svg"/)
      assert.doesNotMatch(html, /<link rel="canonical"/)
      assert.ok(
        html.includes(current),
        'Current page must contain the current documentation'
      )
      if (versioned)
        assert.ok(
          !html.includes(original),
          'Current page must not contain snapshot-only text'
        )
      await (await request(base, '/docs/rdx-missing-page', 404)).arrayBuffer()
      await (
        await request(base, '/rdx-search/rdx-missing-source', 404)
      ).arrayBuffer()
      for (const route of ['/images/rdx.svg', '/downloads/example.txt']) {
        const response = await request(base, route)
        assert.deepEqual(
          new Uint8Array(await response.arrayBuffer()),
          new Uint8Array(
            await readFile(path.join(project, 'public', route.slice(1)))
          )
        )
      }
      const stylesheet = [...html.matchAll(/<link\b[^>]*>/g)]
        .map(([tag]) =>
          /\brel="stylesheet"/.test(tag)
            ? /\bhref="([^"]+)"/.exec(tag)?.[1]
            : undefined
        )
        .find((href) => href?.startsWith('/_next/'))
      const script = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
        .map(([, src]) => src)
        .find((src) => src.startsWith('/_next/'))
      assert.ok(stylesheet, 'The page must reference its generated CSS')
      assert.ok(script, 'The page must reference its generated JavaScript')
      const css = await request(base, stylesheet)
      assert.match(css.headers.get('content-type'), /text\/css/)
      assert.ok((await css.text()).length)
      const js = await request(base, script)
      assert.match(js.headers.get('content-type'), /javascript/)
      assert.ok((await js.text()).length)
      if (search) {
        const response = await request(base, '/rdx-search/_')
        assert.match(response.headers.get('content-type'), /application\/json/)
        const index = await response.json()
        assert.equal(index.schemaVersion, 1)
        assert.ok(index.entries.some((entry) => entry.text.includes(current)))
        assert.ok(
          index.entries.every(
            (entry) =>
              entry.href.startsWith('/docs/') &&
              !entry.href.startsWith('/docs/1.0.0/')
          )
        )
        if (versioned) assert.ok(!JSON.stringify(index).includes(original))
      } else await (await request(base, '/rdx-search/_', 404)).arrayBuffer()
      if (versioned) {
        assert.ok(
          (await (await request(base, '/docs/1.0.0')).text()).includes(
            original
          ),
          'Dynamic version root must read its snapshot'
        )
        const snapshot = await (
          await request(base, '/docs/1.0.0/init/intro')
        ).text()
        assert.ok(snapshot.includes(original))
        assert.match(
          snapshot,
          /<title>Snapshot introduction \| My documentation<\/title>/
        )
        assert.match(
          snapshot,
          /<meta name="description" content="Snapshot description"/
        )
        assert.ok(!snapshot.includes(current))
        if (search) {
          const index = await (await request(base, '/rdx-search/1.0.0')).json()
          assert.equal(index.schemaVersion, 1)
          assert.ok(
            index.entries.some((entry) => entry.text.includes(original))
          )
          assert.ok(!JSON.stringify(index).includes(current))
          assert.ok(
            index.entries.every((entry) =>
              entry.href.startsWith('/docs/1.0.0/')
            )
          )
        } else
          await (await request(base, '/rdx-search/1.0.0', 404)).arrayBuffer()
      } else {
        await (await request(base, '/docs/1.0.0/init/intro', 404)).arrayBuffer()
        await (await request(base, '/rdx-search/1.0.0', 404)).arrayBuffer()
      }
    }
  )
  console.log(
    `OK production HTTP: ${versioned ? 'versioned' : 'plain'} project, search ${search ? 'enabled' : 'disabled'}, cwd ${runtimeCwd ? '.rdx' : 'project root'}, pages, assets, bundles and 404s`
  )
}
const releases = new Map()
for (const directory of directories) {
  const manifest = JSON.parse(
    await readFile(
      path.join(root, 'packages', directory, 'package.json'),
      'utf8'
    )
  )
  releases.set(manifest.name, { manifest, directory })
}
for (const [name, release] of releases) {
  const { manifest, directory } = release
  pnpm(
    path.join(root, 'packages', directory),
    ['pack', '--pack-destination', temporary],
    true
  )
  const archive = path.join(
    temporary,
    `${name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
  )
  const packed = JSON.parse(
    execFileSync('tar', ['-xOf', archive, 'package/package.json'], {
      encoding: 'utf8',
    })
  )
  assert.equal(packed.version, manifest.version)
  assert.doesNotMatch(
    JSON.stringify(packed),
    /workspace:/,
    `${name} retains workspace dependencies`
  )
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    for (const [dependency, version] of Object.entries(packed[field] ?? {})) {
      if (releases.has(dependency))
        assert.equal(
          version,
          releases.get(dependency).manifest.version,
          `${name} must use this release's ${dependency}`
        )
    }
  }
  const files = new Set(
    execFileSync('tar', ['-tf', archive], { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
  )
  for (const file of ['LICENSE', 'package.json', ...required[directory]])
    assert.ok(files.has(`package/${file}`), `${name} is missing ${file}`)
  release.archive = archive
  console.log(
    `OK ${name}@${manifest.version}: archive, exports and dependency versions`
  )
}

const generator = releases.get('@lexibase/create-rdx')
const template = JSON.parse(
  execFileSync(
    'tar',
    ['-xOf', generator.archive, 'package/templates/default/package.json'],
    { encoding: 'utf8' }
  )
)
for (const name of ['@lexibase/rdx-next', '@lexibase/rdx-ui'])
  assert.equal(template.dependencies[name], releases.get(name).manifest.version)

if (process.argv.includes('--install')) {
  const generatorRoot = path.join(temporary, 'generator')
  await mkdir(generatorRoot)
  execFileSync('tar', ['-xf', generator.archive, '-C', generatorRoot])
  const generatorPackage = path.join(generatorRoot, 'package')
  await writeFile(
    path.join(generatorPackage, 'pnpm-workspace.yaml'),
    "packages:\n  - '.'\n"
  )
  pnpm(generatorPackage, ['install', '--ignore-scripts'])
  execFileSync(
    process.execPath,
    [path.join(generatorPackage, 'bin/index.js'), 'project', '--skip-install'],
    { cwd: temporary, stdio: 'inherit' }
  )
  const project = path.join(temporary, 'project')
  const pkgPath = path.join(project, 'package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  assert.equal(pkg.scripts.start, 'rdx start')
  const overrides = Object.fromEntries(
    [...releases]
      .filter(([name]) => name !== '@lexibase/create-rdx')
      .map(([name, release]) => [
        name,
        `file:${release.archive.replaceAll('\\', '/')}`,
      ])
  )
  for (const name of ['@lexibase/rdx-next', '@lexibase/rdx-ui'])
    pkg.dependencies[name] = overrides[name]
  pkg.pnpm = { overrides }
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  // Isolate this fixture from the enclosing monorepo workspace.
  await writeFile(
    path.join(project, 'pnpm-workspace.yaml'),
    "packages:\n  - '.'\n"
  )
  pnpm(project, ['install'])
  const configPath = path.join(project, 'rdx.config.ts')
  const config = await readFile(configPath, 'utf8')
  await writeFile(
    configPath,
    config
      .replace(
        'metadata: {',
        `metadata: {
        metadataBase: 'https://docs.example.test',
        authors: [{ name: 'RDX Metadata Fixture' }],
        keywords: ['rdx-metadata-fixture'],
        icons: { icon: '/images/rdx.svg' },
        robots: { index: false, follow: false },
        openGraph: { type: 'website', images: [{ url: '/images/rdx.svg' }] },
        twitter: { card: 'summary_large_image' },`
      )
      .replace('TOC: false', 'TOC: true')
      .replace('search: false', 'search: true')
  )
  const original = `SnapshotSentinel${randomUUID().replaceAll('-', '')}`
  const current = `CurrentSentinel${randomUUID().replaceAll('-', '')}`
  const introPath = path.join(project, 'docs/init/intro.mdx')
  const intro = `${await readFile(introPath, 'utf8')}\n\n${original}\n`
  await writeFile(introPath, intro)
  buildProject(project)
  await verifyDeploymentTrace(project, false)
  await verifySite(project, { original, current: original })
  await verifySite(project, { original, current: original, runtimeCwd: true })
  // This fixture's isolated workspace contains only the generated project.
  pnpm(project, [
    'add',
    '--workspace-root',
    overrides['@lexibase/rdx-versioning'],
  ])
  pnpm(project, [
    'exec',
    'rdx',
    'add',
    'versioning',
    '--package-manager',
    'pnpm',
  ])
  pnpm(project, ['exec', 'rdx', 'version', '1.0.0'])
  await writeFile(
    path.join(project, 'versioned_docs/version-1.0.0/init/intro.mdx'),
    intro
      .replace('title: Introduction', 'title: Snapshot introduction')
      .replace(
        'description: Start building your documentation with RDX.',
        'description: Snapshot description'
      )
  )
  await writeFile(introPath, intro.replace(original, current))
  buildProject(project)
  await verifyDeploymentTrace(project, true)
  await verifySite(project, { original, current, versioned: true })
  await verifySite(project, {
    original,
    current,
    versioned: true,
    runtimeCwd: true,
  })
  await writeFile(
    configPath,
    (await readFile(configPath, 'utf8')).replace(
      'search: true',
      'search: false'
    )
  )
  buildProject(project)
  await verifyDeploymentTrace(project, true)
  await verifySite(project, {
    original,
    current,
    versioned: true,
    search: false,
  })
  await verifySite(project, {
    original,
    current,
    versioned: true,
    search: false,
    runtimeCwd: true,
  })
  console.log(
    'OK installed archives: standalone project, optional plugin, snapshot, production builds and HTTP servers'
  )
}
console.log(`Release artifacts retained for inspection: ${temporary}`)
