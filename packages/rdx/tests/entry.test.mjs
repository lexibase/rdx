import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { defineConfig } from '../dist/index.js'
import { defineConfig as adapterDefineConfig } from '@lexibase/rdx-next'

const root = fileURLToPath(new URL('../', import.meta.url))
const cli = path.join(root, 'bin/rdx.mjs')

test('the main package preserves configuration identity without loading server or UI code', () => {
  assert.equal(defineConfig, adapterDefineConfig)
  const input = { metadata: { applicationName: 'Framework docs' } }
  assert.equal(defineConfig(input), input)
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { defineConfig } from ${JSON.stringify(new URL('../dist/index.js', import.meta.url).href)}; console.log(defineConfig({metadata:{applicationName:'Isolated'}}).metadata.applicationName)`,
    ],
    { encoding: 'utf8' }
  )
  assert.equal(child.status, 0, child.stderr)
  assert.equal(child.stdout.trim(), 'Isolated')
})

test('public UI paths are typed per-module re-exports rather than bundled copies', async () => {
  for (const group of ['components', 'lib', 'providers']) {
    const entries = await readdir(path.join(root, 'dist/ui', group))
    assert.ok(
      entries.some((name) => name.endsWith('.js')),
      group
    )
    for (const entry of entries.filter((name) => name.endsWith('.js'))) {
      const source = await readFile(
        path.join(root, 'dist/ui', group, entry),
        'utf8'
      )
      const types = await readFile(
        path.join(root, 'dist/ui', group, entry.replace(/\.js$/, '.d.ts')),
        'utf8'
      )
      assert.equal(source, types)
      assert.equal(
        source,
        `export * from '@lexibase/rdx-ui/${group}/${entry.slice(0, -3)}'\n`
      )
    }
  }
})

test('main CLI prepares its own public-import templates without changing user sources or enabling plugins', async (t) => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'rdx-entry-'))
  t.after(() => rm(project, { recursive: true, force: true }))
  const help = spawnSync(process.execPath, [cli, '--help'], {
    cwd: project,
    encoding: 'utf8',
  })
  assert.equal(help.status, 0, help.stderr)
  assert.match(help.stdout, /rdx <dev/)
  await mkdir(path.join(project, 'node_modules/@lexibase'), { recursive: true })
  await symlink(
    root,
    path.join(project, 'node_modules/@lexibase/rdx'),
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  const config =
    "import { defineConfig } from '@lexibase/rdx'\nexport default defineConfig({metadata:{applicationName:'Entry fixture'}})\n"
  await writeFile(path.join(project, 'rdx.config.ts'), config)
  await mkdir(path.join(project, 'docs'))
  await writeFile(path.join(project, 'docs/intro.mdx'), '# Preserve this')
  const result = spawnSync(process.execPath, [cli, 'prepare'], {
    cwd: project,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    await readFile(path.join(project, 'rdx.config.ts'), 'utf8'),
    config
  )
  assert.equal(
    await readFile(path.join(project, 'docs/intro.mdx'), 'utf8'),
    '# Preserve this'
  )
  const route = await readFile(
    path.join(project, '.rdx/app/docs/[[...slug]]/page.tsx'),
    'utf8'
  )
  assert.match(route, /from '@lexibase\/rdx\/runtime'/)
  assert.doesNotMatch(route, /@lexibase\/rdx-next/)
  assert.match(
    await readFile(path.join(project, '.rdx/app/globals.css'), 'utf8'),
    /@lexibase\/rdx\/styles.css/
  )
  await assert.rejects(readFile(path.join(project, 'versions.json')), /ENOENT/)
})
