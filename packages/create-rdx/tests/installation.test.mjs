import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { installedRuntime } from '../bin/installed-runtime.mjs'
import { runStep } from '../bin/progress.mjs'

const cli = fileURLToPath(new URL('../bin/index.js', import.meta.url))
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx install steps-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

for (const manager of ['npm', 'pnpm', 'yarn'])
  test(`${manager} installs once and prepares the installed framework with preserved terminal arguments`, async (t) => {
    const root = await fixture(t)
    const installer = path.join(root, 'package manager.mjs')
    const runtime = `import fs from 'node:fs';fs.appendFileSync('events.jsonl',JSON.stringify({kind:'runtime',args:process.argv.slice(2),cwd:process.cwd()})+'\\n')`
    await writeFile(
      installer,
      `
import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
fs.appendFileSync('events.jsonl', JSON.stringify({kind:'manager',args:process.argv.slice(2)})+'\\n')
const directory = path.join(process.cwd(),'node_modules/@lexibase/rdx')
const entry = path.join(directory,'bin/runtime entry.mjs')
if (process.argv[2] === 'install') {
  fs.mkdirSync(path.dirname(entry),{recursive:true})
  fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify({name:'@lexibase/rdx',bin:{rdx:'bin/runtime entry.mjs'},exports:{'./package.json':'./package.json'}}))
  fs.writeFileSync(entry,${JSON.stringify(runtime)})
  if (${JSON.stringify(manager)} === 'pnpm') {
    console.log(JSON.stringify({name:'pnpm:stats',prefix:process.cwd(),added:1}))
    console.log(JSON.stringify({name:'pnpm:progress',status:'imported',to:entry}))
    console.log(JSON.stringify({name:'pnpm',level:'warn',message:'Visible installer warning'}))
  }
} else if (process.argv[2] === 'exec') {
  const child=spawnSync(process.execPath,[entry,'prepare'],{stdio:'inherit'})
  process.exit(child.status??1)
} else process.exit(81)
`
    )
    const result = spawnSync(process.execPath, [cli, 'docs'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 15000,
      env: {
        ...process.env,
        npm_config_user_agent: manager + '/1.0.0',
        npm_execpath: installer,
      },
    })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stdout + result.stderr)
    const events = (
      await readFile(path.join(root, 'docs/events.jsonl'), 'utf8')
    )
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    assert.deepEqual(
      events
        .filter((event) => event.kind === 'manager')
        .map((event) => event.args),
      manager === 'yarn'
        ? [['install'], ['exec', 'rdx', 'prepare']]
        : manager === 'pnpm'
          ? [['install', '--reporter=ndjson']]
          : [['install']]
    )
    assert.deepEqual(
      events.find((event) => event.kind === 'runtime'),
      { kind: 'runtime', args: ['prepare'], cwd: path.join(root, 'docs') }
    )
    for (const label of [
      '[1/3] Creating project files',
      '[2/3] Installing dependencies',
      '[3/3] Preparing RDX',
    ])
      assert.ok(result.stdout.includes(label))
    assert.equal((result.stdout.match(/Completed in/g) ?? []).length, 3)
    assert.match(result.stdout, /created successfully/)
    if (manager === 'pnpm') {
      assert.match(result.stdout, /Dependencies installed: 1 linked/)
      assert.doesNotMatch(result.stdout, /"pnpm:stats"/)
      assert.match(result.stderr, /Visible installer warning/)
    }
  })

test('pnpm fatal diagnostics without a trailing newline survive child closure and keep recovery instructions', async (t) => {
  const root = await fixture(t)
  const installer = path.join(root, 'failed installer.mjs')
  await writeFile(
    installer,
    `process.stdout.write(JSON.stringify({name:'pnpm',level:'error',err:{code:'ERR_PNPM_FIXTURE',message:'Fixture install failed'}}));process.exitCode=17`
  )
  const result = spawnSync(process.execPath, [cli, 'docs'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      npm_config_user_agent: 'pnpm/11.5.1',
      npm_execpath: installer,
    },
  })
  assert.ifError(result.error)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /ERR_PNPM_FIXTURE/)
  assert.match(result.stderr, /Fixture install failed/)
  assert.match(result.stderr, /Project files were kept/)
  assert.match(result.stderr, /pnpm install/)
  assert.doesNotMatch(
    result.stdout,
    /Dependencies installed|Preparing RDX|created successfully/
  )
  await readFile(path.join(root, 'docs/package.json'))
})

test('installed runtime resolution follows a workspace-hoisted framework and reports missing executables', async (t) => {
  const root = await fixture(t)
  const project = path.join(root, 'apps/docs')
  const module = path.join(root, 'node_modules/@lexibase/rdx')
  await mkdir(project, { recursive: true })
  await assert.rejects(
    installedRuntime(project),
    /Could not find @lexibase\/rdx/
  )
  await mkdir(module, { recursive: true })
  await writeFile(
    path.join(module, 'package.json'),
    JSON.stringify({
      exports: { './package.json': './package.json' },
      bin: { rdx: 'rdx.mjs' },
    })
  )
  await assert.rejects(installedRuntime(project), /executable is missing/)
  await writeFile(path.join(module, 'rdx.mjs'), '')
  assert.equal(await installedRuntime(project), path.join(module, 'rdx.mjs'))
})

test('long stages report elapsed activity and stop updating after success or failure', async () => {
  for (const fail of [false, true]) {
    const lines = []
    const operation = runStep(
      'Preparing fixture',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 35))
        if (fail) throw new Error('fixture failure')
        return 42
      },
      { log: (line) => lines.push(line), intervalMs: 5 }
    )
    if (fail) await assert.rejects(operation, /fixture failure/)
    else assert.equal(await operation, 42)
    assert.ok(lines.some((line) => line.includes('s elapsed')))
    assert.equal(
      lines.some((line) => line.includes('Completed in')),
      !fail
    )
    const count = lines.length
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal(lines.length, count)
  }
})
