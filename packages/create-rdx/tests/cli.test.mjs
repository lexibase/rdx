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
    lang: undefined,
    skipInstall: true,
    agentsMd: true,
    help: false,
    version: false,
  })
  assert.equal(parseArguments(['docs', '--no-agents-md']).agentsMd, false)
  // Language tags are canonicalized; invalid tags fail before creating files.
  assert.equal(parseArguments(['docs', '--lang', 'pt-br']).lang, 'pt-BR')
  assert.equal(parseArguments(['--lang=ES-es', 'docs']).lang, 'es-ES')
  assert.throws(() => parseArguments(['--lang']), /language tag/)
  assert.throws(() => parseArguments(['--lang', 'not a tag']), /not a valid/)
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
  assert.match(help.stdout, /--no-agents-md/)
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
    assert.equal(pkg.scripts.check, 'rdx check')
    assert.match(result.stdout, new RegExp(`cd ${name}`))
    assert.match(
      result.stdout,
      new RegExp(`${manager === 'npm' ? 'npm run' : manager} dev`)
    )
  }
})

test('projects start with the managed AGENTS.md block unless --no-agents-md is passed', async (t) => {
  const root = await fixture(t)
  const created = run(root, ['with-agents', '--skip-install'])
  assert.equal(created.status, 0, created.stderr)
  const agents = await readFile(
    path.join(root, 'with-agents/AGENTS.md'),
    'utf8'
  )
  assert.match(
    agents,
    /^<!-- BEGIN:rdx-agent-rules -->\n[\s\S]+\n<!-- END:rdx-agent-rules -->\n$/
  )
  assert.match(agents, /rdx check/)
  const files = await readdir(path.join(root, 'with-agents'))
  assert.equal(files.includes('AGENTS.md.template'), false)
  assert.equal(files.includes('CLAUDE.md'), false)

  const skipped = run(root, [
    'without-agents',
    '--skip-install',
    '--no-agents-md',
  ])
  assert.equal(skipped.status, 0, skipped.stderr)
  const remaining = await readdir(path.join(root, 'without-agents'))
  assert.equal(remaining.includes('AGENTS.md'), false)
  assert.equal(remaining.includes('AGENTS.md.template'), false)
})

test('install and prepare failures preserve generated files and explain how to retry', async (t) => {
  const root = await fixture(t)
  for (const failAt of ['install', 'prepare']) {
    const installer = path.join(root, `fail-${failAt}.mjs`)
    await writeFile(
      installer,
      `import fs from 'node:fs'
import path from 'node:path'
if (process.argv.includes('install')) {
  if (${JSON.stringify(failAt)} === 'install') process.exit(17)
  const directory = path.join(process.cwd(), 'node_modules/@lexibase/rdx')
  fs.mkdirSync(directory, {recursive:true})
  fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify({name:'@lexibase/rdx',bin:{rdx:'rdx.mjs'},exports:{'./package.json':'./package.json'}}))
  fs.writeFileSync(path.join(directory,'rdx.mjs'), 'process.exit(17)')
}`
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
      await readFile(
        path.join(root, name, 'docs/01-getting-started/intro.mdx'),
        'utf8'
      )
    )
  }
})
