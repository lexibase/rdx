import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  copyFile,
} from 'node:fs/promises'
import os from 'node:os'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import process from 'node:process'
import test from 'node:test'

import ts from 'typescript'

test('installed runtime layout styles survive a consumer ignoring nested dist directories', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-layout-css-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, '.git'))
  await writeFile(path.join(root, '.gitignore'), 'node_modules\n**/dist/*\n')
  const runtime = path.join(root, 'node_modules/@lexibase/rdx-next')
  await mkdir(path.join(runtime, 'src/runtime'), { recursive: true })
  await mkdir(path.join(runtime, 'dist/runtime'), { recursive: true })
  await copyFile(
    new URL('../src/runtime/styles.css', import.meta.url),
    path.join(runtime, 'src/runtime/styles.css')
  )
  await copyFile(
    new URL('../dist/runtime/index.js', import.meta.url),
    path.join(runtime, 'dist/runtime/index.js')
  )
  await symlink(
    fileURLToPath(new URL('../../rdx-ui', import.meta.url)),
    path.join(root, 'node_modules/@lexibase/rdx-ui'),
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  const require = createRequire(
    new URL('../../rdx-ui/package.json', import.meta.url)
  )
  const postcss = require('postcss')
  const tailwind = require('@tailwindcss/postcss')
  const result = await postcss([tailwind({ base: root })]).process(
    "@import './node_modules/@lexibase/rdx-next/src/runtime/styles.css';",
    { from: path.join(root, 'globals.css') }
  )
  for (const selector of [
    '.px-7',
    '.gap-5',
    '.md\\:mx-auto',
    '.md\\:max-w-\\[860px\\]',
    '.md\\:py-8',
    '.xl\\:pr-20',
  ])
    assert.ok(
      result.css.includes(selector),
      `Missing runtime layout rule: ${selector}`
    )
})

test('shared PostCSS config exposes a Node-loadable plugin through the published UI export', async () => {
  const config = (await import('../../rdx-ui/postcss.config.mjs')).default
  assert.deepEqual(Object.keys(config.plugins), [
    '@lexibase/rdx-ui/postcss-plugin',
  ])
  const require = createRequire(
    new URL('../../rdx-ui/package.json', import.meta.url)
  )
  const plugin = require('@lexibase/rdx-ui/postcss-plugin')
  assert.equal(typeof plugin, 'function')
  assert.equal(plugin.postcss, true)
})

test('prepare resolves transitive PostCSS plugins into standalone config before Next workers load it', async (t) => {
  const root = await fixture(t)
  await writeFile(
    path.join(root, 'rdx.config.ts'),
    "export default { metadata: { applicationName: 'PostCSS fixture' } }"
  )
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('../bin/rdx.mjs', import.meta.url)), 'prepare'],
    { cwd: root, encoding: 'utf8' }
  )
  assert.equal(result.status, 0, result.stderr)
  const file = path.join(root, '.rdx/postcss.config.mjs')
  const config = (await import(pathToFileURL(file).href)).default
  const require = createRequire(new URL('../package.json', import.meta.url))
  const pluginPath = require.resolve('@lexibase/rdx-ui/postcss-plugin')
  assert.deepEqual(Object.keys(config.plugins), [pluginPath])
  assert.ok(path.isAbsolute(pluginPath))
  const workerRequire = createRequire(path.join(root, '.rdx/worker.cjs'))
  assert.equal(workerRequire(pluginPath).postcss, true)
  assert.doesNotMatch(await readFile(file, 'utf8'), /\bimport\b|\brequire\(/)
})

test('runtime CSS ignores serialized classes in previous Next builds while retaining project sources', async (t) => {
  const root = await fixture(t)
  await mkdir(path.join(root, '.git'))
  await writeFile(path.join(root, '.gitignore'), '.rdx\n.next\nnode_modules\n')
  const app = path.join(root, '.rdx/app')
  const build = path.join(root, '.rdx/.next/server/app')
  await mkdir(app, { recursive: true })
  await mkdir(build, { recursive: true })
  await mkdir(path.join(root, 'components'))
  await mkdir(path.join(root, 'docs'))
  const from = path.join(app, 'globals.css')
  await copyFile(
    new URL('../templates/runtime/app/globals.css', import.meta.url),
    from
  )
  // Next's serialized HTML contains escaped copies of valid UI class names.
  const escaped = String.raw`[\u0026_tbody\u003etr:last-child\u003etd]:border-b-0`
  await writeFile(path.join(build, 'page.html'), `<script>${escaped}</script>`)
  await writeFile(
    path.join(root, 'components/logo.tsx'),
    '<svg className="text-[37px]" />'
  )
  await writeFile(
    path.join(root, 'docs/intro.mdx'),
    '<div className="tracking-[0.123em]" />'
  )
  const require = createRequire(
    new URL('../../rdx-ui/package.json', import.meta.url)
  )
  const result = await require('postcss')([
    require('@tailwindcss/postcss')({ base: path.join(root, '.rdx') }),
  ]).process(await readFile(from, 'utf8'), { from })
  assert.equal(
    /u0026|u003e/.test(result.css),
    false,
    'Serialized build classes must not generate CSS'
  )
  assert.ok(result.css.includes('.px-7'), 'Runtime layout must remain styled')
  assert.ok(
    result.css.includes('37px'),
    'Project components must remain styled'
  )
  assert.ok(result.css.includes('0.123em'), 'Project MDX must remain styled')
  assert.equal(
    result.messages.some(
      (message) =>
        message.type === 'dependency' &&
        message.file &&
        path
          .relative(path.join(root, '.rdx/.next'), message.file)
          .startsWith('server')
    ),
    false,
    'Generated build files must not be style sources'
  )
})

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-css-types-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const scope = path.join(root, 'node_modules/@lexibase')
  await mkdir(scope, { recursive: true })
  for (const [name, relative] of [
    ['rdx-ui', '../../rdx-ui'],
    ['rdx-next', '..'],
  ]) {
    await symlink(
      fileURLToPath(new URL(relative, import.meta.url)),
      path.join(scope, name),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
  }
  await writeFile(path.join(root, 'package.json'), '{ "type": "module" }')
  await copyFile(
    new URL('../templates/runtime/app/globals.css', import.meta.url),
    path.join(root, 'globals.css')
  )
  await copyFile(
    new URL('../templates/runtime/app/globals.d.css.ts', import.meta.url),
    path.join(root, 'globals.d.css.ts')
  )
  return root
}

async function check(root, source, paths) {
  const filename = path.join(root, 'index.ts')
  await writeFile(filename, source)
  const program = ts.createProgram([filename], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
    strict: true,
    types: [],
    skipLibCheck: true,
    noUncheckedSideEffectImports: true,
    allowArbitraryExtensions: true,
    paths,
  })
  return ts.getPreEmitDiagnostics(program)
}

test('public package CSS exports and generated global stylesheet have specific type declarations without baseUrl', async (t) => {
  const root = await fixture(t)
  const source = `import '@lexibase/rdx-ui/globals.css'; import '@lexibase/rdx-next/styles.css'; import './globals.css';`
  const paths = {
    '@lexibase/rdx-ui/*': [
      fileURLToPath(new URL('../../rdx-ui/src/*', import.meta.url)),
    ],
  }
  for (const aliases of [undefined, paths]) {
    const diagnostics = await check(root, source, aliases)
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (filename) => filename,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      })
    )
  }
  const ui = JSON.parse(
    await readFile(
      new URL('../../rdx-ui/package.json', import.meta.url),
      'utf8'
    )
  )
  const runtime = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  assert.equal(ui.exports['./globals.css'].default, './src/styles/globals.css')
  assert.equal(ui.exports['./postcss-plugin'], './postcss-plugin.cjs')
  assert.ok(ui.files.includes('postcss-plugin.cjs'))
  assert.equal(
    runtime.exports['./styles.css'].default,
    './src/runtime/styles.css'
  )
  assert.ok(
    runtime.files.includes(runtime.exports['./styles.css'].types.slice(2))
  )
})

test('CSS declarations do not silently accept misspelled paths or pretend styles export JavaScript values', async (t) => {
  const root = await fixture(t)
  const diagnostics = await check(
    root,
    `import '@lexibase/rdx-ui/missing.css'; import './missing.css'; import { missing } from '@lexibase/rdx-ui/globals.css';`
  )
  // TypeScript 6 reports unresolved side-effect imports with TS2882.
  assert.equal(diagnostics.filter((entry) => entry.code === 2882).length, 2)
  assert.ok(diagnostics.some((entry) => entry.code === 2305))
})
