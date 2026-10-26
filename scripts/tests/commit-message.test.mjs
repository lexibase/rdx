import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))

test('the commit-msg hook accepts conventional commits and rejects invalid messages without creating commits', async (t) => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'rdx-commit-hook-'))
  t.after(() => rm(temporary, { recursive: true, force: true }))
  const hook = await readFile(path.join(root, '.husky/commit-msg'), 'utf8')
  const hookPath = path.join(temporary, 'commit-msg')
  await writeFile(hookPath, `#!/bin/sh\n${hook}`)
  await chmod(hookPath, 0o755)
  const messagePath = path.join(temporary, 'commit message.txt')
  for (const message of [
    'fix(hooks): validate commit messages',
    'docs: explain development hooks',
    'feat(ui)!: remove the legacy API\n\nBREAKING CHANGE: use the replacement API.',
  ]) {
    await writeFile(messagePath, message + '\n')
    const result = spawnSync(
      'git',
      [
        '-c',
        `core.hooksPath=${temporary}`,
        'hook',
        'run',
        'commit-msg',
        '--',
        messagePath,
      ],
      { cwd: root, encoding: 'utf8' }
    )
    assert.equal(result.status, 0, result.stderr || result.stdout)
  }
  for (const message of [
    'update some files',
    'unknown: change files',
    'fix: ',
  ]) {
    await writeFile(messagePath, message + '\n')
    const result = spawnSync(
      'git',
      [
        '-c',
        `core.hooksPath=${temporary}`,
        'hook',
        'run',
        'commit-msg',
        '--',
        messagePath,
      ],
      { cwd: root, encoding: 'utf8' }
    )
    assert.equal(result.status, 1, result.stderr || result.stdout)
    assert.match(
      result.stdout + result.stderr,
      /problems|type-empty|type-enum|subject-empty/
    )
  }
})
