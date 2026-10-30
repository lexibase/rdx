import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises'
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
  'rdx',
  'rdx-plugin-versioning',
  'rdx-plugin-i18n',
  'create-rdx',
]
const required = {
  rdx: [
    'bin/rdx.mjs',
    'dist/index.js',
    'dist/index.d.ts',
    'dist/runtime.js',
    'dist/runtime.d.ts',
    'dist/ui/components/home.js',
    'dist/ui/components/home.d.ts',
    'dist/ui/components/code-block.js',
    'dist/ui/components/code-block.d.ts',
    'dist/ui/components/mdx-folder-tree.js',
    'dist/ui/components/mdx-folder-tree.d.ts',
    'dist/ui/hooks/use-highlighted-code.js',
    'dist/ui/lib/highlighter.js',
    'dist/ui/components/table.js',
    'dist/ui/components/table.d.ts',
    'dist/ui/components/kbd.js',
    'dist/ui/components/kbd.d.ts',
    'dist/ui/components/mdx-keyboard-shortcut.js',
    'dist/ui/components/skip-link.js',
    'dist/ui/components/not-found.js',
    'dist/ui/components/not-found.d.ts',
    'dist/ui/components/language-dropdown.js',
    'dist/ui/components/localized-not-found.js',
    'dist/ui/lib/i18n.js',
    'dist/ui/providers/locale-provider.js',
    'dist/styles.css',
    'dist/styles.d.css.ts',
    'dist/templates/app/docs/[[...slug]]/page.tsx',
    'dist/templates/app/sitemap.ts',
    'dist/templates/app/robots.ts',
  ],
  'rdx-types': ['dist/index.d.ts', 'dist/config.d.ts', 'dist/search.d.ts'],
  'rdx-core': [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/config/index.js',
    'dist/mdx/index.js',
    'dist/search/index.js',
    'dist/search/index.d.ts',
    'dist/check/index.js',
    'dist/check/index.d.ts',
  ],
  'rdx-ui': [
    'THIRD_PARTY_NOTICES.md',
    'src/components/table.tsx',
    'src/components/code-block.tsx',
    'src/components/mdx-code-block.tsx',
    'src/components/mdx-code-block-view.tsx',
    'src/components/mdx-folder-tree.tsx',
    'src/components/mdx-mermaid.tsx',
    'src/lib/mermaid.ts',
    'src/hooks/use-highlighted-code.ts',
    'src/lib/highlighter.tsx',
    'src/components/kbd.tsx',
    'src/components/mdx-keyboard-shortcut.tsx',
    'src/components/skip-link.tsx',
    'src/components/not-found.tsx',
    'src/components/language-dropdown.tsx',
    'src/components/localized-not-found.tsx',
    'src/styles/globals.css',
    'src/styles/shadcn.css',
    'src/styles/globals.d.css.ts',
    'src/components/mdx-components.tsx',
    'src/components/docs-toc.tsx',
    'src/components/docs-search.tsx',
    'src/components/docs-search-dialog.tsx',
    'src/components/command.tsx',
    'src/components/dialog.tsx',
    'src/components/sheet.tsx',
    'src/components/docs-page-transition.tsx',
    'src/components/mdx-image.tsx',
    'src/lib/docs-search.ts',
    'src/lib/i18n.ts',
    'src/providers/locale-provider.tsx',
  ],
  'rdx-next': [
    'config.mjs',
    'config.d.mts',
    'bin/rdx.mjs',
    'bin/add-plugin.mjs',
    'bin/plugin-config.mjs',
    'bin/i18n-setup.mjs',
    'bin/public-assets.mjs',
    'bin/project-styles.mjs',
    'bin/locale-routes.mjs',
    'dist/runtime/index.js',
    'dist/runtime/index.d.ts',
    'templates/runtime/app/rdx-search/[source]/route.ts',
    'templates/runtime/app/docs/[[...slug]]/page.tsx',
    'templates/runtime/app/not-found.tsx',
    'templates/runtime/app/sitemap.ts',
    'templates/runtime/app/robots.ts',
    'templates/runtime/rdx-project.ts',
    'src/runtime/styles.css',
    'src/runtime/styles.d.css.ts',
  ],
  'rdx-plugin-versioning': ['dist/index.js', 'dist/index.d.ts'],
  'rdx-plugin-i18n': ['dist/index.js', 'dist/index.d.ts'],
  'create-rdx': [
    'bin/index.js',
    'bin/options.mjs',
    'bin/pnpm-policy.mjs',
    'templates/default/package.json',
    'templates/default/rdx.config.ts',
    'templates/default/tsconfig.json',
    'templates/default/docs/examples/code-blocks.mdx',
    'templates/default/docs/examples/diagrams.mdx',
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

async function verifyDevelopmentAfterBuild(project) {
  await withProductionServer(
    path.join(project, 'node_modules/@lexibase/rdx/bin/rdx.mjs'),
    project,
    async (base, logs) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const html = await (
          await request(base, '/docs/examples/markdown')
        ).text()
        const styles = [
          ...html.matchAll(/<link\b[^>]*href="([^"]+\.css[^" ]*)"/g),
        ]
        assert.ok(styles.length, 'Development must serve generated CSS')
        let css = ''
        for (const [, href] of styles)
          css += await (
            await request(base, href.replaceAll('&amp;', '&'))
          ).text()
        assert.ok(
          css.includes('.px-7') && css.includes('860px'),
          'Layout must remain styled after build -> dev'
        )
        assert.equal(
          /u0026|u003e/.test(css),
          false,
          'Serialized build classes must not enter development CSS'
        )
      }
      assert.doesNotMatch(
        logs(),
        /Parsing CSS source code failed|not recognized as a valid pseudo-class/
      )
    },
    { mode: 'dev', timeoutMs: 120_000 }
  )
  console.log(
    'OK installed archives: build -> dev, Markdown, layout CSS and no serialized selector warnings'
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

function providerRequire(project) {
  // Installations can change symlink targets mid-test. Resolve in a fresh process
  // so Node's module-resolution cache cannot retain the previous framework.
  const manifest = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { createRequire } from 'node:module';
const host = createRequire(process.argv[1]);
try { process.stdout.write(host.resolve('@lexibase/rdx/package.json')) }
catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  process.stdout.write(process.argv[1]);
}`,
      path.join(project, 'package.json'),
    ],
    { encoding: 'utf8' }
  )
  return createRequire(manifest)
}

function runtimeFile(project) {
  return path.join(
    path.dirname(
      providerRequire(project).resolve('@lexibase/rdx-next/package.json')
    ),
    'dist/runtime/index.js'
  )
}

async function verifySharedUi(project, expectedVersion) {
  const hostRequire = providerRequire(project)
  const runtimeRequire = createRequire(await realpath(runtimeFile(project)))
  for (const entry of [
    'components/mdx-components',
    'globals.css',
    'postcss.config',
  ]) {
    const specifier = `@lexibase/rdx-ui/${entry}`
    assert.equal(
      await realpath(runtimeRequire.resolve(specifier)),
      await realpath(hostRequire.resolve(specifier)),
      `Runtime and project must share ${specifier}`
    )
  }
  const uiRoot = path.resolve(
    path.dirname(hostRequire.resolve('@lexibase/rdx-ui/globals.css')),
    '../..'
  )
  const ui = JSON.parse(
    await readFile(path.join(uiRoot, 'package.json'), 'utf8')
  )
  assert.equal(ui.version, expectedVersion)
}

async function verifyFrameworkUpgrade(project) {
  const runtime = runtimeFile(project)
  const before = await readFile(runtime, 'utf8')
  const runtimeManifestPath = providerRequire(project).resolve(
    '@lexibase/rdx-next/package.json'
  )
  const runtimeVersion = JSON.parse(
    await readFile(runtimeManifestPath, 'utf8')
  ).version
  const fixture = path.join(temporary, 'ui-only-upgrade')
  await mkdir(fixture)
  execFileSync('tar', [
    '-xf',
    releases.get('@lexibase/rdx-ui').archive,
    '-C',
    fixture,
  ])
  const uiRoot = path.join(fixture, 'package')
  const uiManifest = JSON.parse(
    await readFile(path.join(uiRoot, 'package.json'), 'utf8')
  )
  const [major, minor] = uiManifest.version.split('.').map(Number)
  // A synthetic minor exists only in this retained test archive; nothing is published.
  uiManifest.version = `${major}.${minor + 1}.0`
  await writeFile(
    path.join(uiRoot, 'package.json'),
    JSON.stringify(uiManifest, null, 2) + '\n'
  )
  await writeFile(
    path.join(uiRoot, 'pnpm-workspace.yaml'),
    "packages:\n  - '.'\n"
  )
  const mapFile = path.join(uiRoot, 'src/components/mdx-components.tsx')
  const map = await readFile(mapFile, 'utf8')
  assert.ok(map.includes('export const mdxComponents = {'))
  await writeFile(
    mapFile,
    map.replace(
      'export const mdxComponents = {',
      'export const mdxComponents = {\n  UiUpgradeProbe: () => <p data-rdx-ui-upgrade="true">UiOnlyUpgradeMarker</p>,'
    )
  )
  pnpm(uiRoot, ['pack', '--pack-destination', fixture], true)
  const archive = path.join(
    fixture,
    `lexibase-rdx-ui-${uiManifest.version}.tgz`
  )
  const mainFixture = path.join(fixture, 'framework')
  await mkdir(mainFixture)
  execFileSync('tar', [
    '-xf',
    releases.get('@lexibase/rdx').archive,
    '-C',
    mainFixture,
  ])
  const mainRoot = path.join(mainFixture, 'package')
  const mainManifestPath = path.join(mainRoot, 'package.json')
  const mainManifest = JSON.parse(await readFile(mainManifestPath, 'utf8'))
  const [mainMajor, mainMinor] = mainManifest.version.split('.').map(Number)
  mainManifest.version = `${mainMajor}.${mainMinor + 1}.0`
  mainManifest.dependencies['@lexibase/rdx-ui'] =
    `file:${archive.replaceAll('\\', '/')}`
  await writeFile(
    mainManifestPath,
    JSON.stringify(mainManifest, null, 2) + '\n'
  )
  await writeFile(
    path.join(mainRoot, 'pnpm-workspace.yaml'),
    "packages:\n  - '.'\n"
  )
  pnpm(mainRoot, ['pack', '--pack-destination', mainFixture], true)
  const mainArchive = path.join(
    mainFixture,
    `lexibase-rdx-${mainManifest.version}.tgz`
  )
  const pkgPath = path.join(project, 'package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  const previousUi = pkg.pnpm.overrides['@lexibase/rdx>@lexibase/rdx-ui']
  delete pkg.pnpm.overrides['@lexibase/rdx>@lexibase/rdx-ui']
  // pnpm may revisit the previous lock entry while replacing the main package.
  // Keep only that old version local; the new framework must select its own UI.
  pkg.pnpm.overrides[
    `@lexibase/rdx@${releases.get('@lexibase/rdx').manifest.version}>@lexibase/rdx-ui`
  ] = previousUi
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  pnpm(project, [
    'add',
    '--workspace-root',
    '--strict-peer-dependencies',
    `file:${mainArchive.replaceAll('\\', '/')}`,
  ])
  const updated = JSON.parse(await readFile(pkgPath, 'utf8'))
  assert.equal(updated.dependencies['@lexibase/rdx-next'], undefined)
  assert.equal(updated.dependencies['@lexibase/rdx-ui'], undefined)
  assert.equal(
    await readFile(runtimeFile(project), 'utf8'),
    before,
    'UI update must not replace the runtime implementation'
  )
  assert.equal(
    JSON.parse(
      await readFile(
        providerRequire(project).resolve('@lexibase/rdx-next/package.json'),
        'utf8'
      )
    ).version,
    runtimeVersion
  )
  await verifySharedUi(project, uiManifest.version)
  await writeFile(
    path.join(project, 'docs/examples/ui-upgrade.mdx'),
    '---\ntitle: UI upgrade\n---\n\n<UiUpgradeProbe />\n'
  )
  await writeFile(
    path.join(project, 'home.tsx'),
    "import { Home } from '@lexibase/rdx/ui/components/home'\nexport default function HomePage() { return <Home title='FrameworkHomepageMarker' /> }\n"
  )
  const configPath = path.join(project, 'rdx.config.ts')
  const config = await readFile(configPath, 'utf8')
  await writeFile(
    configPath,
    "import HomePage from './home'\n" +
      config.replace('enabled: false', 'enabled: true, component: HomePage')
  )
  buildProject(project)
  await withProductionServer(
    path.join(project, 'node_modules/@lexibase/rdx/bin/rdx.mjs'),
    project,
    async (base) => {
      const html = await (
        await request(base, '/docs/examples/ui-upgrade')
      ).text()
      assert.match(html, /data-rdx-ui-upgrade="true"/)
      assert.match(html, /UiOnlyUpgradeMarker/)
      assert.match(
        await (await request(base, '/')).text(),
        /FrameworkHomepageMarker/
      )
    }
  )
  await writeFile(configPath, config)
  console.log(
    'OK framework-only upgrade: newer UI, public homepage imports, shared CSS/PostCSS resolution and unchanged runtime'
  )
  return archive
}

async function verifyMetadataMigration(project, configPath, config) {
  const previousConfig = config.replace(
    'metadata: {',
    'metadata: { robots: { index: true, follow: true },'
  )
  assert.notEqual(previousConfig, config)
  try {
    await writeFile(configPath, previousConfig)
    const result = spawnSync(
      process.execPath,
      [path.join(project, 'node_modules/@lexibase/rdx/bin/rdx.mjs'), 'check'],
      { cwd: project, encoding: 'utf8' }
    )
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.match(result.stderr, /metadata\.robots/)
    assert.equal(await readFile(configPath, 'utf8'), previousConfig)
  } finally {
    await writeFile(configPath, config)
  }
  pnpm(project, ['exec', 'rdx', 'check'])
  console.log(
    'OK 3.x configuration migration: removed metadata.robots is rejected, removing the field restores the packed CLI'
  )
}

async function verifySite(
  project,
  {
    original,
    current,
    versioned = false,
    search = true,
    runtimeCwd = false,
    framework = true,
    locale = 'en',
  }
) {
  const entry = runtimeCwd
    ? createRequire(path.join(project, 'package.json')).resolve(
        'next/dist/bin/next'
      )
    : path.join(
        project,
        `node_modules/@lexibase/${framework ? 'rdx' : 'rdx-next'}/bin/rdx.mjs`
      )
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
      assert.ok(html.includes(locale === 'pt-BR' ? 'Feito com' : 'Powered by'))
      assert.ok(html.includes(`lang="${locale}"`))
      const markdown = await (
        await request(base, '/docs/examples/markdown')
      ).text()
      const keyboard = await (
        await request(base, '/docs/examples/keyboard-shortcuts')
      ).text()
      assert.ok(
        keyboard.includes(
          locale === 'pt-BR' ? 'Control mais K' : 'Control plus K'
        )
      )
      assert.match(
        html,
        /<main[^>]*id="rdx-main"[^>]*tabindex="-1"[^>]*>[\s\S]*?<h1\b/
      )
      assert.ok(
        markdown.includes(locale === 'pt-BR' ? 'Copiar código' : 'Copy code')
      )
      assert.ok(
        html.includes(
          locale === 'pt-BR' ? 'Ir para o conteúdo' : 'Skip to content'
        )
      )
      if (versioned) {
        assert.ok(
          html.includes(
            locale === 'pt-BR'
              ? 'Versão da documentação: Atual'
              : 'Documentation version: Current'
          )
        )
      }
      assert.match(html, /href="https:\/\/github\.com\/lexibase\/rdx"/)
      assert.match(html, /<meta name="author" content="RDX Metadata Fixture"/)
      assert.ok(
        html.includes(
          `<meta name="robots" content="${versioned ? 'noindex' : 'index'}, follow"`
        )
      )
      const robots = await (await request(base, '/robots.txt')).text()
      assert.match(
        robots,
        /Sitemap: https:\/\/docs\.example\.test\/sitemap.xml/
      )
      assert.doesNotMatch(robots, /Disallow:/)
      const sitemap = await (await request(base, '/sitemap.xml')).text()
      assert.ok(
        sitemap.includes(
          `https://docs.example.test/docs/${versioned ? '1.0.0/' : ''}init/intro`
        )
      )
      assert.doesNotMatch(sitemap, /rdx-search|_not-found/)
      if (versioned)
        assert.ok(
          !sitemap.includes('https://docs.example.test/docs/init/intro')
        )
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
      const missing = await (
        await request(base, '/docs/rdx-missing-page', 404)
      ).text()
      assert.match(missing, /data-rdx-not-found/)
      assert.match(missing, /<meta name="robots" content="noindex"/)
      assert.match(missing, /data-rdx-navbar/)
      assert.match(missing, /text-9xl/)
      assert.ok(
        missing.includes(
          locale === 'pt-BR' ? 'Página não encontrada' : 'Page not found'
        )
      )
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
      const cssText = await css.text()
      for (const selector of [
        '.px-7',
        '.gap-5',
        '.md\\:mx-auto',
        '.md\\:max-w-\\[860px\\]',
        '.md\\:py-8',
      ])
        assert.ok(
          cssText.includes(selector),
          `Missing runtime layout rule: ${selector}`
        )
      const js = await request(base, script)
      assert.match(js.headers.get('content-type'), /javascript/)
      assert.ok((await js.text()).length)
      if (search) {
        const response = await request(base, '/rdx-search/_')
        assert.match(response.headers.get('content-type'), /application\/json/)
        assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow')
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
async function verifyRollingEditions(project) {
  const introPath = path.join(project, 'docs/init/intro.mdx')
  const configPath = path.join(project, 'rdx.config.ts')
  const intro = await readFile(introPath, 'utf8')
  await writeFile(introPath, `${intro}\n\nRollingMinorPublishedMarker\n`)
  pnpm(project, ['exec', 'rdx', 'version', '1.1.0'])
  await writeFile(introPath, `${intro}\n\nRollingMajorPublishedMarker\n`)
  pnpm(project, ['exec', 'rdx', 'version', '2.0.0'])
  await writeFile(introPath, `${intro}\n\nRollingLiveDevelopmentMarker\n`)
  await writeFile(
    configPath,
    (await readFile(configPath, 'utf8')).replace(
      'search: false',
      'search: true'
    )
  )
  const manifest = JSON.parse(
    await readFile(path.join(project, 'versions.json'), 'utf8')
  )
  assert.deepEqual(manifest, {
    active: ['2.0.0', '1.1.0'],
    archived: [],
    redirects: { '1.0.0': '1.1.0' },
  })
  buildProject(project)
  await withProductionServer(
    path.join(project, 'node_modules/@lexibase/rdx/bin/rdx.mjs'),
    project,
    async (base) => {
      const live = await (await request(base, '/docs/init/intro')).text()
      assert.match(live, /RollingLiveDevelopmentMarker/)
      const minor = await (await request(base, '/docs/1.1.0/init/intro')).text()
      assert.match(minor, /RollingMinorPublishedMarker/)
      assert.doesNotMatch(
        minor,
        /RollingLiveDevelopmentMarker|RollingMajorPublishedMarker/
      )
      const major = await (await request(base, '/docs/2.0.0/init/intro')).text()
      assert.match(major, /RollingMajorPublishedMarker/)
      assert.doesNotMatch(major, /RollingLiveDevelopmentMarker/)
      for (const suffix of ['', '/init/intro', '/init/intro?from=old']) {
        const response = await request(base, `/docs/1.0.0${suffix}`, 308)
        assert.equal(response.headers.get('location'), `/docs/1.1.0${suffix}`)
        await response.arrayBuffer()
      }
      await (await request(base, '/rdx-search/1.0.0', 404)).arrayBuffer()
      const index = await (await request(base, '/rdx-search/1.1.0')).json()
      assert.ok(
        index.entries.every((entry) => entry.href.startsWith('/docs/1.1.0/'))
      )
      assert.match(JSON.stringify(index), /RollingMinorPublishedMarker/)
      assert.doesNotMatch(
        JSON.stringify(index),
        /RollingLiveDevelopmentMarker|RollingMajorPublishedMarker/
      )
    }
  )
  console.log(
    'OK installed archives: same-major edition update, preserved previous major, independent live docs, native redirects and isolated search'
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
      if (releases.has(dependency)) {
        if (field === 'peerDependencies') {
          assert.equal(
            version,
            manifest.peerDependencies[dependency],
            `${name} must retain its compatible ${dependency} peer range`
          )
          continue
        }
        assert.equal(
          version,
          releases.get(dependency).manifest.version,
          `${name} must use this release's ${dependency}`
        )
      }
    }
  }
  if (name === '@lexibase/rdx-next') {
    assert.equal(packed.dependencies?.['@lexibase/rdx-ui'], undefined)
    assert.equal(packed.peerDependencies['@lexibase/rdx-ui'], '^3.2.0')
  }
  const files = new Set(
    execFileSync('tar', ['-tf', archive], { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
  )
  for (const file of ['LICENSE', 'package.json', ...required[directory]])
    assert.ok(files.has(`package/${file}`), `${name} is missing ${file}`)
  if (name === '@lexibase/rdx-ui' || name === '@lexibase/rdx') {
    assert.ok(
      [...files].every((file) => !file.includes('button-link')),
      name + ' must not ship the removed ButtonLink module'
    )
  }
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
for (const name of ['@lexibase/rdx'])
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
      .filter(
        ([name]) =>
          ![
            '@lexibase/create-rdx',
            '@lexibase/rdx',
            '@lexibase/rdx-ui',
          ].includes(name)
      )
      .map(([name, release]) => [
        name,
        `file:${release.archive.replaceAll('\\', '/')}`,
      ])
  )
  for (const name of ['@lexibase/rdx'])
    pkg.dependencies[name] =
      `file:${releases.get(name).archive.replaceAll('\\', '/')}`
  overrides['@lexibase/rdx>@lexibase/rdx-ui'] =
    `file:${releases.get('@lexibase/rdx-ui').archive.replaceAll('\\', '/')}`
  pkg.pnpm = { overrides }
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  // Isolate this fixture from the enclosing monorepo workspace.
  await writeFile(
    path.join(project, 'pnpm-workspace.yaml'),
    "packages:\n  - '.'\n"
  )
  pnpm(project, ['install', '--strict-peer-dependencies'])
  await verifySharedUi(
    project,
    releases.get('@lexibase/rdx-ui').manifest.version
  )
  const configPath = path.join(project, 'rdx.config.ts')
  const config = await readFile(configPath, 'utf8')
  await verifyMetadataMigration(project, configPath, config)
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
  const projectStyles =
    ':root { --rdx-highlighting: #7c3aed; }\n.dark { --rdx-highlighting: #a78bfa; }\n'
  const stylesPath = path.join(project, 'rdx.css')
  await writeFile(stylesPath, projectStyles)
  pnpm(project, ['exec', 'rdx', 'check'])
  buildProject(project)
  assert.match(
    await readFile(path.join(project, '.rdx/app/globals.css'), 'utf8'),
    /@import "\.\.\/\.\.\/rdx\.css";/
  )
  assert.equal(await readFile(stylesPath, 'utf8'), projectStyles)
  await verifyDeploymentTrace(project, false)
  await verifySite(project, { original, current: original })
  await verifySite(project, { original, current: original, runtimeCwd: true })
  await verifyDevelopmentAfterBuild(project)
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
  pnpm(project, ['exec', 'rdx', 'check'])
  const versionsFile = path.join(project, 'versions.json')
  const snapshotFile = path.join(
    project,
    'versioned_docs/version-1.0.0/init/intro.mdx'
  )
  const snapshotBefore = await readFile(snapshotFile, 'utf8')
  pnpm(project, ['exec', 'rdx', 'archive', '1.0.0'])
  assert.deepEqual(JSON.parse(await readFile(versionsFile, 'utf8')), {
    active: [],
    archived: ['1.0.0'],
  })
  pnpm(project, ['exec', 'rdx', 'unarchive', '1.0.0'])
  assert.deepEqual(JSON.parse(await readFile(versionsFile, 'utf8')), {
    active: ['1.0.0'],
    archived: [],
  })
  assert.equal(await readFile(snapshotFile, 'utf8'), snapshotBefore)
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
    (await readFile(configPath, 'utf8'))
      .replace("lang: 'en'", "lang: 'pt-BR'")
      .replace('search: true', 'search: false')
  )
  buildProject(project)
  await verifyDeploymentTrace(project, true)
  await verifySite(project, {
    original,
    current,
    versioned: true,
    search: false,
    locale: 'pt-BR',
  })
  await verifySite(project, {
    original,
    current,
    versioned: true,
    search: false,
    locale: 'pt-BR',
    runtimeCwd: true,
  })
  console.log(
    'OK installed archives: standalone project, optional plugin, snapshot, production builds and HTTP servers'
  )
  const upgradedUi = await verifyFrameworkUpgrade(project)
  // Exercise a real pnpm workspace, with a docs project and dependencies above it.
  const legacyWorkspace = path.join(temporary, 'legacy-workspace')
  const legacyProject = path.join(legacyWorkspace, 'apps/docs')
  await mkdir(legacyProject, { recursive: true })
  await writeFile(
    path.join(legacyWorkspace, 'pnpm-workspace.yaml'),
    "packages:\n  - 'apps/*'\n"
  )
  await mkdir(path.join(legacyWorkspace, '.git'), { recursive: true })
  await writeFile(
    path.join(legacyWorkspace, '.gitignore'),
    'node_modules\n**/dist/*\n'
  )
  for (const name of [
    'docs',
    'public',
    'versioned_docs',
    'versions.json',
    'rdx.config.ts',
    'home.tsx',
    'package.json',
  ]) {
    await cp(path.join(project, name), path.join(legacyProject, name), {
      recursive: true,
    })
  }
  const legacyPkgPath = path.join(legacyProject, 'package.json')
  const legacyConfigPath = path.join(legacyProject, 'rdx.config.ts')
  const legacyPkg = JSON.parse(await readFile(legacyPkgPath, 'utf8'))
  legacyPkg.name = 'docs'
  await writeFile(
    path.join(legacyWorkspace, 'package.json'),
    JSON.stringify(
      {
        name: 'rdx-workspace-smoke',
        private: true,
        pnpm: legacyPkg.pnpm,
      },
      null,
      2
    ) + '\n'
  )
  delete legacyPkg.pnpm
  delete legacyPkg.dependencies['@lexibase/rdx']
  legacyPkg.dependencies['@lexibase/rdx-next'] = overrides['@lexibase/rdx-next']
  legacyPkg.dependencies['@lexibase/rdx-ui'] =
    `file:${upgradedUi.replaceAll('\\', '/')}`
  await writeFile(legacyPkgPath, JSON.stringify(legacyPkg, null, 2) + '\n')
  await writeFile(
    legacyConfigPath,
    (await readFile(legacyConfigPath, 'utf8')).replace(
      "from '@lexibase/rdx'",
      "from '@lexibase/rdx-next'"
    )
  )
  const homePath = path.join(legacyProject, 'home.tsx')
  await writeFile(
    homePath,
    (await readFile(homePath, 'utf8')).replace(
      '@lexibase/rdx/ui/components/home',
      '@lexibase/rdx-ui/components/home'
    )
  )
  pnpm(legacyProject, ['install', '--strict-peer-dependencies'])
  const nextInstallation = await realpath(
    createRequire(path.join(legacyProject, 'package.json')).resolve(
      'next/package.json'
    )
  )
  assert.ok(
    path.relative(legacyProject, nextInstallation).startsWith(`..${path.sep}`),
    'The workspace scenario must resolve Next outside the documentation project'
  )
  buildProject(legacyProject)
  await verifySite(legacyProject, {
    original,
    current,
    versioned: true,
    search: false,
    framework: false,
    locale: 'pt-BR',
  })
  console.log(
    'OK pnpm workspace apps/docs with parent dependencies and direct runtime/UI remains supported'
  )
  await verifyRollingEditions(project)
}
console.log(`Release artifacts retained for inspection: ${temporary}`)
