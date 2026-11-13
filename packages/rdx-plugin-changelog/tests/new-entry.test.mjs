import assert from 'node:assert/strict'
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
import test from 'node:test'

import { readChangelog } from '@lexibase/rdx-core/config'
import { changelog } from '../dist/index.js'

test('the changelog command creates a valid draft and preserves existing entries', async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-changelog-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  const [command] = changelog().commands
  const run = (...args) => command.run({ rootDir, args })

  await assert.rejects(run('new', '../1.2.0'), /Usage: rdx changelog new/)
  await run('new', '--help')
  assert.deepEqual(await readdir(rootDir), [])

  const attempts = await Promise.allSettled([
    run('new', '1.2.0'),
    run('new', '1.2.0'),
  ])
  assert.equal(
    attempts.filter(({ status }) => status === 'fulfilled').length,
    1
  )
  assert.match(
    attempts.find(({ status }) => status === 'rejected').reason.message,
    /already exists/
  )

  const [draft] = readChangelog(rootDir)
  assert.equal(draft.title, 'Release 1.2.0')
  assert.equal(draft.version, '1.2.0')
  assert.match(draft.date, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(draft.content.trim(), '')
  assert.deepEqual(draft.badges, [])
  const renamed = path.join(rootDir, 'changelog', 'spring-release.mdx')
  const original = await readFile(draft.sourcePath, 'utf8')
  const edited = original + 'My release notes.\n'
  await writeFile(renamed, edited)
  await rm(draft.sourcePath)
  await assert.rejects(run('new', '1.2.0'), /spring-release\.mdx/)
  assert.equal(await readFile(renamed, 'utf8'), edited)
  assert.deepEqual(await readdir(path.dirname(renamed)), ['spring-release.mdx'])

  for (const [value, badges] of [
    ['breaking', ['breaking']],
    ['security', ['security']],
    ['deprecated', ['deprecated']],
    [
      'security, deprecated, breaking, security',
      ['security', 'deprecated', 'breaking'],
    ],
  ]) {
    await writeFile(
      renamed,
      edited.replace('\n---\n', `\nbadge: ${value}\n---\n`)
    )
    assert.deepEqual(readChangelog(rootDir)[0].badges, badges)
  }
  await writeFile(renamed, edited.replace('\n---\n', '\nbadge: typo\n---\n'))
  assert.throws(() => readChangelog(rootDir), /spring-release\.mdx: badge/)
})

test('the command rejects a changelog directory linked outside the project', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-changelog-link-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const rootDir = path.join(root, 'project')
  const outside = path.join(root, 'outside')
  const link = path.join(rootDir, 'changelog')
  await mkdir(rootDir)
  await mkdir(outside)
  const { symlink } = await import('node:fs/promises')
  await symlink(
    outside,
    link,
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  const [command] = changelog().commands
  await assert.rejects(
    command.run({ rootDir, args: ['new', '1.2.0'] }),
    /inside the project/
  )
  assert.deepEqual(await readdir(outside), [])
})
