import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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
const temporary = await mkdtemp(path.join(base, 'release-'))
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
  execFileSync(
    process.execPath,
    [
      path.join(root, 'packages/create-rdx/bin/index.js'),
      'project',
      '--skip-install',
    ],
    { cwd: temporary, stdio: 'inherit' }
  )
  const project = path.join(temporary, 'project')
  const pkgPath = path.join(project, 'package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
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
      .replace('TOC: false', 'TOC: true')
      .replace('search: false', 'search: true')
  )
  pnpm(project, ['build'])
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
  pnpm(project, ['build'])
  console.log(
    'OK installed archives: standalone project, opt-in search/TOC, optional plugin, snapshot and production builds'
  )
}
console.log(`Release artifacts retained for inspection: ${temporary}`)
