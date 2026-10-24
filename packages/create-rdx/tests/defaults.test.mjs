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
  assert.match(config, /TOC:\s*false/)
  assert.match(config, /search:\s*false/)
  assert.match(config, /metadata:\s*\{/)
  assert.match(config, /applicationName:\s*'My documentation'/)
  assert.doesNotMatch(config, /^  title:/m)
  assert.doesNotMatch(config, /metadataBase:\s*['"]/)
  assert.doesNotMatch(config, /plugins\s*:/)
  assert.doesNotMatch(config, /docsDir/)
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
  assert.ok(pkg.dependencies['@lexibase/rdx'])
  assert.equal(pkg.dependencies['@lexibase/rdx-next'], undefined)
  assert.equal(pkg.dependencies['@lexibase/rdx-ui'], undefined)
  assert.match(config, /from '@lexibase\/rdx'/)
  for (const [name, directory] of [['@lexibase/rdx', 'rdx']]) {
    const release = JSON.parse(
      await readFile(
        new URL(`../../${directory}/package.json`, import.meta.url),
        'utf8'
      )
    )
    assert.equal(
      pkg.dependencies[name],
      release.version,
      `The starter must require the exact tested ${name} release`
    )
  }
  assert.equal(pkg.dependencies['@lexibase/rdx-versioning'], undefined)
  assert.equal(pkg.dependencies.next, '^16.4.2')
  assert.equal(pkg.dependencies.react, '19.3.1')
  assert.equal(pkg.dependencies['react-dom'], pkg.dependencies.react)
  assert.equal(pkg.devDependencies['@types/react'], '19.3.0')
  assert.equal(pkg.devDependencies.typescript, '6.0.3')
  assert.equal(pkg.engines.node, '^22.18.0 || ^24.11.0')
})
