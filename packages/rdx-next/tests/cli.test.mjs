import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  readFile,
  realpath,
  writeFile,
  rm,
  access,
  mkdir,
  cp,
  symlink,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const cli = fileURLToPath(new URL('../bin/rdx.mjs', import.meta.url))
const definition = new URL('../dist/index.js', import.meta.url).href
async function fixture(t, config) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-cli-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  if (config) await writeFile(path.join(rootDir, 'rdx.config.ts'), config)
  return rootDir
}
function run(cwd, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' })
}

async function nextProbe(rootDir) {
  const directory = path.join(rootDir, 'node_modules/next/dist/bin')
  await mkdir(directory, { recursive: true })
  await writeFile(
    path.join(rootDir, 'node_modules/next/package.json'),
    '{"name":"next","type":"commonjs"}'
  )
  await writeFile(
    path.join(directory, 'next'),
    `require('node:fs').writeFileSync('next-invocation.json', JSON.stringify(process.argv.slice(2))); console.log('NEXT_PROBE_STARTED')`
  )
}

test('build rejects broken content before changing the runtime or starting Next', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' } }"
  )
  await nextProbe(rootDir)
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '[Missing](missing.mdx)\n\n![Image](/missing.png)'
  )
  await mkdir(path.join(rootDir, '.rdx/app'), { recursive: true })
  const layout = path.join(rootDir, '.rdx/app/layout.tsx')
  await writeFile(layout, 'Existing runtime')
  const result = run(rootDir, 'build')
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /docs\/intro.mdx:1:1 \[page\]/)
  assert.match(result.stderr, /docs\/intro.mdx:3:1 \[asset\]/)
  assert.match(result.stderr, /2 problems/)
  assert.equal(await readFile(layout, 'utf8'), 'Existing runtime')
  await assert.rejects(access(path.join(rootDir, 'next-invocation.json')))
  await assert.rejects(access(path.join(rootDir, 'public')))
})

test('valid build checks content then prepares runtime and forwards Next arguments', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' } }"
  )
  await nextProbe(rootDir)
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '## Hello\n\n[Hello](#hello)'
  )
  const result = run(rootDir, 'build', '--debug')
  assert.equal(result.status, 0, result.stderr)
  assert.match(
    result.stdout,
    /1 page checked, 0 problems[\s\S]*NEXT_PROBE_STARTED/
  )
  await access(path.join(rootDir, '.rdx/app/layout.tsx'))
  assert.deepEqual(
    JSON.parse(
      await readFile(path.join(rootDir, 'next-invocation.json'), 'utf8')
    ),
    ['build', path.join(rootDir, '.rdx'), '--debug']
  )
})

test('build checks archived documentation as well as live content', async (t) => {
  const plugin = new URL(
    '../../rdx-plugin-versioning/dist/index.js',
    import.meta.url
  ).href
  const rootDir = await fixture(
    t,
    `import { versioning } from '${plugin}'; export default { metadata: { applicationName: 'Docs' }, plugins: [versioning()] }`
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(path.join(rootDir, 'docs/intro.mdx'), '## Live')
  await mkdir(path.join(rootDir, 'versioned_docs/version-1.0.0'), {
    recursive: true,
  })
  await writeFile(
    path.join(rootDir, 'versions.json'),
    JSON.stringify({ active: [], archived: ['1.0.0'] })
  )
  await writeFile(
    path.join(rootDir, 'versioned_docs/version-1.0.0/intro.mdx'),
    '[Missing](#missing)'
  )
  const result = run(rootDir, 'build')
  assert.equal(result.status, 1, result.stdout)
  assert.match(
    result.stderr,
    /versioned_docs\/version-1.0.0\/intro.mdx:1:1 \[anchor\]/
  )
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('dev and start do not block on documentation checks', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' } }"
  )
  await nextProbe(rootDir)
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '[Missing](missing.mdx)'
  )
  for (const command of ['dev', 'start']) {
    const result = run(rootDir, command)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /NEXT_PROBE_STARTED/)
    assert.doesNotMatch(result.stdout + result.stderr, /RDX check/)
  }
})

test('check aggregates content errors and never prepares runtime, assets or a Next server', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' } }`
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '---\ntitle: Intro\n---\n\n[Missing](missing.mdx)\n\n![Image](/missing.png)'
  )
  let result = run(rootDir, 'check')
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /docs\/intro.mdx:5:1 \[page\]/)
  assert.match(result.stderr, /docs\/intro.mdx:7:1 \[asset\]/)
  assert.match(result.stderr, /2 problems/)
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '## Hello\n\n[Section](#hello)'
  )
  result = run(rootDir, 'check')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1 page checked, 0 problems/)
  for (const filename of ['.rdx', 'public', 'versions.json'])
    await assert.rejects(access(path.join(rootDir, filename)))
})

test('check help and invalid arguments are handled before reading configuration', async (t) => {
  const rootDir = await fixture(t)
  assert.equal(run(rootDir, 'check', '--help').status, 0)
  const result = run(rootDir, 'check', '--fix')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Usage: rdx check/)
  assert.doesNotMatch(result.stderr, /Missing .*rdx.config/)
})

test('all creator documentation examples pass the public check command', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' } }`
  )
  const template = new URL(
    '../../create-rdx/templates/default/',
    import.meta.url
  )
  for (const directory of ['docs', 'public']) {
    await cp(new URL(directory, template), path.join(rootDir, directory), {
      recursive: true,
    })
  }
  const result = run(rootDir, 'check')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /0 problems/)
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('checking versioned content never initializes a missing manifest', async (t) => {
  const plugin = new URL(
    '../../rdx-plugin-versioning/dist/index.js',
    import.meta.url
  ).href
  const rootDir = await fixture(
    t,
    `import { versioning } from '${plugin}'; export default { metadata: { applicationName: 'Docs' }, plugins: [versioning()] }`
  )
  const result = run(rootDir, 'check')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Run "rdx prepare"/)
  await assert.rejects(access(path.join(rootDir, 'versions.json')))
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('prepare loads typed config with defineConfig without loading a Next server or versioning', async (t) => {
  const rootDir = await fixture(
    t,
    `import { defineConfig } from '${definition}'; export default defineConfig({ metadata: { applicationName: 'Typed docs' } })`
  )
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 0, result.stderr)
  await access(path.join(rootDir, '.rdx/rdx-project.ts'))
  await assert.rejects(access(path.join(rootDir, 'versions.json')))
  const config = JSON.parse(
    await readFile(path.join(rootDir, '.rdx/tsconfig.json'))
  )
  assert.equal(config.compilerOptions.isolatedModules, true)
  assert.equal(config.compilerOptions.allowArbitraryExtensions, true)
  assert.equal(config.compilerOptions.noUncheckedSideEffectImports, true)
  assert.equal(config.compilerOptions.jsx, 'react-jsx')
  assert.equal(config.compilerOptions.rootDir, '..')
  assert.deepEqual(config.compilerOptions.types, ['node', 'react'])
  assert.equal(config.compilerOptions.baseUrl, undefined)
  assert.equal(config.compilerOptions.ignoreDeprecations, undefined)
  assert.ok(config.include.includes('.next/dev/types/**/*.ts'))
  // Simulate the installed adapter for the generated Next configuration.
  const scope = path.join(rootDir, 'node_modules/@lexibase')
  await mkdir(scope, { recursive: true })
  const adapterLink = path.join(scope, 'rdx-next')
  await symlink(
    fileURLToPath(new URL('../', import.meta.url)),
    adapterLink,
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  t.after(() => rm(adapterLink, { force: true }))
  // The configuration resolves package metadata without loading a Next server.
  await mkdir(path.join(rootDir, 'node_modules/next'), { recursive: true })
  await writeFile(
    path.join(rootDir, 'node_modules/next/package.json'),
    '{"name":"next","version":"16.4.3"}'
  )
  const nextConfig = (
    await import(pathToFileURL(path.join(rootDir, '.rdx/next.config.mjs')).href)
  ).default
  const canonicalRoot = await realpath(rootDir)
  assert.equal(path.resolve(nextConfig.turbopack.root), canonicalRoot)
  assert.equal(nextConfig.outputFileTracingRoot, canonicalRoot)
  assert.equal(nextConfig.agentRules, false)
  assert.equal(nextConfig.experimental?.externalDir, undefined)
  await access(path.join(rootDir, '.rdx/app/globals.d.css.ts'))
  assert.ok(config.exclude.includes('public'))
})

test('prepare discovers project CSS without creating or replacing user styles', async (t) => {
  const root = await fixture(
    t,
    "export default { metadata: { applicationName: 'Styled docs' } }"
  )
  let result = run(root, 'prepare')
  assert.equal(result.status, 0, result.stderr)
  await assert.rejects(access(path.join(root, 'rdx.css')))
  const source = ':root { --rdx-highlighting: #7c3aed }'
  await writeFile(path.join(root, 'rdx.css'), source)
  for (let attempt = 0; attempt < 2; attempt++) {
    result = run(root, 'prepare')
    assert.equal(result.status, 0, result.stderr)
    const generated = await readFile(
      path.join(root, '.rdx/app/globals.css'),
      'utf8'
    )
    assert.equal(generated.match(/@import "\.\.\/\.\.\/rdx\.css";/g)?.length, 1)
    assert.equal(await readFile(path.join(root, 'rdx.css'), 'utf8'), source)
  }
})

test('preflight rejects invalid config before creating .rdx', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' }, theme: { defaultTheme: 'purple' } }`
  )
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /theme.defaultTheme/)
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('removed docsDir option fails before preparing runtime or moving content', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' }, docsDir: 'content' }"
  )
  await mkdir(path.join(rootDir, 'content'))
  const filename = path.join(rootDir, 'content/intro.mdx')
  await writeFile(filename, 'Existing documentation')
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /docsDir is not configurable.*docs\//)
  assert.equal(await readFile(filename, 'utf8'), 'Existing documentation')
  await assert.rejects(access(path.join(rootDir, '.rdx')))
  await assert.rejects(access(path.join(rootDir, 'docs')))
})

test('plugin commands are registered only through config', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' }, plugins: [{ name: 'fixture', apiVersion: 1, commands: [{ name: 'ping', description: 'Fixture command', run(context) { console.log(context.args.join(':')) } }] }] }`
  )
  const result = run(rootDir, 'ping', 'hello', 'world')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /hello:world/)
  const unavailable = run(rootDir, 'version', '1.0.0')
  assert.equal(unavailable.status, 1)
  assert.match(unavailable.stderr, /Unknown command.*version/)
  for (const command of ['archive', 'unarchive']) {
    const missing = run(rootDir, command, '1.0.0')
    assert.equal(missing.status, 1)
    assert.match(missing.stderr, new RegExp(`Unknown command.*${command}`))
  }
})

test('versioning archive commands work through the CLI without preparing a runtime', async (t) => {
  const plugin = new URL(
    '../../rdx-plugin-versioning/dist/index.js',
    import.meta.url
  ).href
  const rootDir = await fixture(
    t,
    `import { versioning } from '${plugin}'; export default { metadata: { applicationName: 'Docs' }, plugins: [versioning()] }`
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(path.join(rootDir, 'docs/intro.mdx'), 'Preserved snapshot')
  for (const command of ['version', 'archive', 'unarchive']) {
    const result = run(rootDir, command, '1.0.0')
    assert.equal(result.status, 0, result.stderr)
    const manifest = JSON.parse(
      await readFile(path.join(rootDir, 'versions.json'), 'utf8')
    )
    assert.deepEqual(
      manifest,
      command === 'archive'
        ? { active: [], archived: ['1.0.0'] }
        : { active: ['1.0.0'], archived: [] }
    )
  }
  assert.equal(
    await readFile(
      path.join(rootDir, 'versioned_docs/version-1.0.0/intro.mdx'),
      'utf8'
    ),
    'Preserved snapshot'
  )
  await assert.rejects(access(path.join(rootDir, '.rdx')))
  const invalid = run(rootDir, 'archive', '9.0.0')
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /does not exist/)
})

test('missing configuration and missing plugin packages fail with actionable messages', async (t) => {
  const rootDir = await fixture(t)
  assert.match(run(rootDir, 'prepare').stderr, /Missing.*rdx.config.ts/)
  await writeFile(
    path.join(rootDir, 'rdx.config.ts'),
    `import plugin from '@rdx-nonexistent/plugin'; export default { metadata: { applicationName: 'Docs' }, plugins: [plugin()] }`
  )
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /install its package/)
})
