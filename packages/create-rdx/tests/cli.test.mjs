import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { parseArguments, validateProjectName } from '../bin/options.mjs'

const cli = fileURLToPath(new URL('../bin/index.js', import.meta.url))
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-generator-cli-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}
function run(root, args, env = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 15_000,
  })
  assert.ifError(result.error)
  return result
}

test('argument parsing rejects unknown options and multiple names', () => {
  assert.deepEqual(parseArguments(['--skip-install', 'my-docs']), {
    projectName: 'my-docs',
    skipInstall: true,
    help: false,
    version: false,
  })
  assert.equal(parseArguments(['-h']).help, true)
  assert.equal(parseArguments(['-v']).version, true)
  assert.throws(() => parseArguments(['--skip-instal']), /Unknown option/)
  assert.throws(() => parseArguments(['one', 'two']), /only one project name/)
})

test('project names are safe folder names on Windows and Unix and valid npm names after lowercasing', () => {
  for (const name of ['my-docs', 'MyDocs', 'docs.v1', 'docs_2', '0-docs'])
    assert.equal(validateProjectName(name), true)
  for (const name of [
    '',
    '.',
    '..',
    '../escape',
    'nested/docs',
    'nested\\docs',
    'bad name',
    'bad;name',
    'docs.',
    'con',
    'NUL.txt',
    'lpt1',
    'com9.log',
    'node_modules',
    'favicon.ico',
    'a'.repeat(215),
  ])
    assert.notEqual(validateProjectName(name), true, name)
})

test('help and version exit without prompting, installing or creating files', async (t) => {
  const root = await fixture(t)
  const help = run(root, ['--help'])
  assert.equal(help.status, 0, help.stderr)
  assert.match(help.stdout, /Usage: create-rdx/)
  assert.match(help.stdout, /--skip-install/)
  const version = run(root, ['--version'])
  const pkg = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  assert.equal(version.status, 0, version.stderr)
  assert.equal(version.stdout.trim(), pkg.version)
  assert.deepEqual(await readdir(root), [])
})

test('invalid command-line inputs fail before changing the filesystem and do not print stack traces', async (t) => {
  const root = await fixture(t)
  for (const args of [
    ['bad name'],
    ['nested/docs'],
    ['con'],
    ['docs.'],
    [''],
    ['one', 'two'],
    ['--skip-instal'],
  ]) {
    const result = run(root, [...args, '--skip-install'])
    assert.equal(result.status, 1, JSON.stringify(args))
    assert.match(result.stderr, /\[RDX\]/)
    assert.doesNotMatch(result.stderr, /\n\s+at /)
    assert.deepEqual(await readdir(root), [])
  }
})

test('existing files and directories are never overwritten', async (t) => {
  const root = await fixture(t)
  await writeFile(path.join(root, 'existing-file'), 'keep file')
  await mkdir(path.join(root, 'existing-dir'))
  await writeFile(path.join(root, 'existing-dir/keep.txt'), 'keep directory')
  for (const name of ['existing-file', 'existing-dir']) {
    const result = run(root, [name, '--skip-install'])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /already exists/)
  }
  assert.equal(
    await readFile(path.join(root, 'existing-file'), 'utf8'),
    'keep file'
  )
  assert.deepEqual(await readdir(path.join(root, 'existing-dir')), ['keep.txt'])
  assert.equal(
    await readFile(path.join(root, 'existing-dir/keep.txt'), 'utf8'),
    'keep directory'
  )
})

test('folder case is preserved while the package name is lowercase and skip-install never launches an installer', async (t) => {
  const root = await fixture(t)
  const installer = path.join(root, 'must-not-run.mjs')
  await writeFile(installer, 'process.exit(99)')
  for (const manager of ['npm', 'pnpm', 'yarn']) {
    const name = `MyDocs-${manager}`
    const result = run(root, [name, '--skip-install'], {
      npm_config_user_agent: `${manager}/1.0.0`,
      npm_execpath: installer,
    })
    assert.equal(result.status, 0, result.stderr)
    const pkg = JSON.parse(
      await readFile(path.join(root, name, 'package.json'), 'utf8')
    )
    assert.equal(pkg.name, name.toLowerCase())
    assert.match(result.stdout, new RegExp(`cd ${name}`))
    assert.match(
      result.stdout,
      new RegExp(`${manager === 'npm' ? 'npm run' : manager} dev`)
    )
  }
})

test('install and prepare failures preserve generated files and explain how to retry', async (t) => {
  const root = await fixture(t)
  for (const failAt of ['install', 'prepare']) {
    const installer = path.join(root, `fail-${failAt}.mjs`)
    await writeFile(
      installer,
      `if (process.argv.includes(${JSON.stringify(failAt)})) process.exit(17)`
    )
    const name = `retry-${failAt}`
    const result = run(root, [name], {
      npm_config_user_agent: 'npm/1.0.0',
      npm_execpath: installer,
    })
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /Project files were kept/)
    assert.match(result.stderr, /npm install/)
    assert.match(result.stderr, /npm run dev/)
    assert.doesNotMatch(result.stderr, /\n\s+at /)
    assert.doesNotMatch(result.stdout, /created successfully/)
    assert.ok(
      await readFile(path.join(root, name, 'docs/init/intro.mdx'), 'utf8')
    )
  }
})
