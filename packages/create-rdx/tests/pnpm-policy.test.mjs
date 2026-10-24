import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { parse } from 'yaml'

import { normalizePnpmRdxApprovals } from '../bin/pnpm-policy.mjs'

async function fixture(t, source) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-pnpm-policy-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const project = path.join(root, 'apps/docs')
  await mkdir(project, { recursive: true })
  const filename = path.join(root, 'pnpm-workspace.yaml')
  await writeFile(filename, source)
  return { root, project, filename }
}

test('only existing exact RDX approvals are consolidated; comments and other workspace policy survive', async (t) => {
  const source = [
    '# Existing workspace',
    'packages:',
    "  - 'apps/*'",
    'minimumReleaseAge: 1440',
    'minimumReleaseAgeStrict: true',
    'allowBuilds:',
    '  esbuild: true',
    'minimumReleaseAgeExclude:',
    "  - '@lexibase/rdx-core@1.0.0' # earlier approval",
    "  - 'other-package@1.0.0'",
    '  # approval added by pnpm',
    "  - '@lexibase/rdx-core@1.1.0' # release approval",
    "  - 'other-package@2.0.0'",
    "  - '@lexibase/rdx@1.2.0'",
    '',
  ].join('\r\n')
  const { project, filename, root } = await fixture(t, source)
  assert.equal(await normalizePnpmRdxApprovals(project), true)
  const changed = await readFile(filename, 'utf8')
  const data = parse(changed)
  assert.deepEqual(data.minimumReleaseAgeExclude, [
    '@lexibase/rdx-core@1.0.0 || 1.1.0',
    'other-package@1.0.0',
    'other-package@2.0.0',
    '@lexibase/rdx@1.2.0',
  ])
  assert.equal(data.minimumReleaseAge, 1440)
  assert.equal(data.minimumReleaseAgeStrict, true)
  assert.deepEqual(data.allowBuilds, { esbuild: true })
  for (const comment of [
    'Existing workspace',
    'earlier approval',
    'approval added by pnpm',
    'release approval',
  ])
    assert.ok(changed.includes(comment))
  assert.equal(changed.replaceAll('\r\n', '').includes('\n'), false)
  assert.equal(await normalizePnpmRdxApprovals(project), false)
  assert.equal(await readFile(filename, 'utf8'), changed)
  assert.deepEqual((await readdir(root)).sort(), [
    'apps',
    'pnpm-workspace.yaml',
  ])
})

test('fresh, versionless, aliased and unrelated rules are left byte-for-byte unchanged', async (t) => {
  for (const source of [
    "packages: ['apps/*']\n",
    "minimumReleaseAgeExclude: ['@lexibase/rdx@1.2.0']\n",
    "minimumReleaseAgeExclude: ['@lexibase/rdx', '@lexibase/rdx@1.2.0']\n",
    "minimumReleaseAgeExclude: ['other@1.0.0', 'other@2.0.0']\n",
    "minimumReleaseAgeExclude: ['@lexibase/rdx-core@1.0.0', '@lexibase/rdx-core@1.1.0', 42]\n",
    "approved: &approved '@lexibase/rdx@1.2.0'\nminimumReleaseAgeExclude: [*approved]\n",
  ]) {
    const { project, filename } = await fixture(t, source)
    assert.equal(await normalizePnpmRdxApprovals(project), false)
    assert.equal(await readFile(filename, 'utf8'), source)
  }
})

test('skip-install does not edit workspace approvals and invalid YAML is not overwritten', async (t) => {
  const source =
    "minimumReleaseAgeExclude: ['@lexibase/rdx-core@1.0.0', '@lexibase/rdx-core@1.1.0']\n"
  const { root, project, filename } = await fixture(t, source)
  const cli = fileURLToPath(new URL('../bin/index.js', import.meta.url))
  const result = spawnSync(
    process.execPath,
    [cli, 'skip-docs', '--skip-install'],
    {
      cwd: path.join(root, 'apps'),
      env: { ...process.env, npm_config_user_agent: 'pnpm/11.5.1' },
      encoding: 'utf8',
    }
  )
  assert.equal(result.status, 0, result.stderr)
  assert.equal(await readFile(filename, 'utf8'), source)
  const invalid = 'minimumReleaseAgeExclude: [unterminated\n'
  await writeFile(filename, invalid)
  await assert.rejects(normalizePnpmRdxApprovals(project), /Cannot read/)
  assert.equal(await readFile(filename, 'utf8'), invalid)
})

test('CLI handles existing duplicates and newly appended approvals before pnpm prepare rechecks the policy', async (t) => {
  const { root, filename } = await fixture(
    t,
    "packages: ['apps/*']\nminimumReleaseAgeExclude:\n  - '@lexibase/rdx-core@1.0.0'\n  - '@lexibase/rdx-core@1.0.1'\n"
  )
  const installer = path.join(root, 'pnpm-fixture.mjs')
  await writeFile(
    installer,
    `
import fs from 'node:fs'
import path from 'node:path'
const file = ${JSON.stringify(filename)}
const text = fs.readFileSync(file, 'utf8')
function allows(version) {
  const first = text.split('\\n').find(line => line.includes('@lexibase/rdx-core@'))
  return first.includes(version)
}
if (process.argv.includes('install')) {
  if (!allows('1.0.1')) process.exit(31)
  fs.appendFileSync(file, "  - '@lexibase/rdx-core@1.1.0'\\n")
} else if (!allows('1.1.0')) process.exit(32)
`
  )
  const cli = fileURLToPath(new URL('../bin/index.js', import.meta.url))
  const result = spawnSync(process.execPath, [cli, 'new-docs'], {
    cwd: path.join(root, 'apps'),
    env: {
      ...process.env,
      npm_config_user_agent: 'pnpm/11.5.1',
      npm_execpath: installer,
    },
    encoding: 'utf8',
    timeout: 15_000,
  })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(
    parse(await readFile(filename, 'utf8')).minimumReleaseAgeExclude,
    ['@lexibase/rdx-core@1.0.0 || 1.0.1 || 1.1.0']
  )
  assert.match(result.stdout, /created successfully/)
})
