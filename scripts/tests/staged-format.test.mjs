import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { checkStagedFormat } from '../check-staged-format.mjs'

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-staged-format-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  execFileSync('git', ['init', '--quiet'], { cwd: root })
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root })
  await writeFile(
    path.join(root, '.prettierrc.json'),
    '{"semi":false,"singleQuote":true}'
  )
  return root
}

test('format checks read the staged version and preserve unrelated and partial working edits', async (t) => {
  const root = await fixture(t)
  const file = path.join(root, 'example.ts')
  await writeFile(file, 'const count = 1\n')
  execFileSync('git', ['add', 'example.ts'], { cwd: root })
  const working = 'const count=2;\n'
  await writeFile(file, working)
  await writeFile(path.join(root, 'unrelated.md'), '#   Unformatted\n')
  assert.deepEqual(await checkStagedFormat(root), [])
  assert.equal(await readFile(file, 'utf8'), working)
  assert.equal(
    execFileSync('git', ['show', ':example.ts'], {
      cwd: root,
      encoding: 'utf8',
    }),
    'const count = 1\n'
  )
})

test('unformatted staged content is reported without rewriting or restaging a formatted working copy', async (t) => {
  const root = await fixture(t)
  const file = path.join(root, 'example.ts')
  const staged = 'const count=1;\n'
  await writeFile(file, staged)
  execFileSync('git', ['add', 'example.ts'], { cwd: root })
  const working = 'const count = 1\n'
  await writeFile(file, working)
  assert.deepEqual(await checkStagedFormat(root), ['example.ts'])
  assert.equal(await readFile(file, 'utf8'), working)
  assert.equal(
    execFileSync('git', ['show', ':example.ts'], {
      cwd: root,
      encoding: 'utf8',
    }),
    staged
  )
})
