import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  access,
  mkdir,
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
  const nextConfig = (
    await import(pathToFileURL(path.join(rootDir, '.rdx/next.config.mjs')).href)
  ).default
  assert.equal(path.resolve(nextConfig.turbopack.root), rootDir)
  assert.equal(nextConfig.agentRules, false)
  assert.equal(nextConfig.experimental?.externalDir, undefined)
  await access(path.join(rootDir, '.rdx/app/globals.d.css.ts'))
  assert.ok(config.exclude.includes('public'))
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
