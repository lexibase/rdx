import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, access, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const cli = fileURLToPath(new URL('../bin/index.js', import.meta.url))

test('generated projects expose homepage and navbar defaults without activating plugins', async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-defaults-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  const result = spawnSync(
    process.execPath,
    [cli, 'rdx-defaults', '--skip-install'],
    { cwd: rootDir, encoding: 'utf8' }
  )
  assert.equal(result.status, 0, result.stderr)
  const projectDir = path.join(rootDir, 'rdx-defaults')
  const config = await readFile(path.join(projectDir, 'rdx.config.ts'), 'utf8')
  assert.match(config, /navbar:\s*\{\s*title:\s*''/)
  assert.match(config, /github:\s*\{\s*visible:\s*true,\s*url:\s*'#'/)
  assert.match(config, /showToggleMode:\s*true/)
  assert.match(config, /homepage:\s*\{\s*enabled:\s*false/)
  assert.doesNotMatch(config, /plugins\s*:/)
  await access(path.join(projectDir, 'docs/init/intro.mdx'))
  await access(path.join(projectDir, '.gitignore'))
  await access(path.join(projectDir, 'public/images/rdx.svg'))
  await access(path.join(projectDir, 'public/downloads/example.txt'))
  await access(path.join(projectDir, 'docs/examples/images.mdx'))
  await assert.rejects(access(path.join(projectDir, 'versions.json')))
  const pkg = JSON.parse(
    await readFile(path.join(projectDir, 'package.json'), 'utf8')
  )
  assert.equal(pkg.name, 'rdx-defaults')
  assert.match(
    await readFile(path.join(projectDir, 'README.md'), 'utf8'),
    /^# rdx-defaults\r?\n/
  )
  assert.ok(pkg.dependencies['@lexibase/rdx-next'])
  assert.ok(pkg.dependencies['@lexibase/rdx-ui'])
  assert.equal(pkg.dependencies['@lexibase/rdx-versioning'], undefined)
})
