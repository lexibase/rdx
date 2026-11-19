import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { isChangelogVersion, readChangelog } from '../dist/config/index.js'

function fixture(t, versions) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rdx-changelog-order-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'changelog'))
  for (const [index, [version, date = '2026-11-19']] of versions.entries())
    fs.writeFileSync(
      path.join(root, 'changelog', `${index}.md`),
      `---\ntitle: Release\nversion: '${version}'\ndate: '${date}'\n---\nNotes.\n`
    )
  return root
}

test('release notes sort equal dates by semantic version precedence', (t) => {
  const ascending = [
    '1.0.0-alpha',
    '1.0.0-alpha.1',
    '1.0.0-alpha.beta',
    '1.0.0-beta',
    '1.0.0-beta.2',
    '1.0.0-beta.11',
    '1.0.0-rc.1',
    '1.0.0',
    '1.0.1',
    '1.1.0',
    '2.0.0',
  ]
  const root = fixture(t, [
    ...ascending.map((version) => [version]),
    ['99.0.0', '2026-11-18'],
  ])
  assert.deepEqual(
    readChangelog(root).map(({ version }) => version),
    [...ascending.toReversed(), '99.0.0']
  )
})

test('version validation rejects empty identifiers and numeric leading zeros', () => {
  for (const value of [
    '1.2.3',
    '0.0.0',
    '1.0.0-beta.1',
    '1.0.0-alpha-beta',
    '1.0.0-0',
    '1.0.0-01a',
    '1.0.0+001',
    '1.0.0-rc.1+Build.001',
  ])
    assert.equal(isChangelogVersion(value), true, value)
  for (const value of [
    '01.2.3',
    '1.02.3',
    '1.2.03',
    '1.0.0-01',
    '1.0.0-alpha..1',
    '1.0.0-.',
    '1.0.0+build..1',
    '1.0.0+.',
    '1.0.0-',
    '1.0.0+',
    '1.0.0\n',
  ])
    assert.equal(isChangelogVersion(value), false, value)
})

test('invalid versions in hand-written notes are reported with their file', (t) => {
  const root = fixture(t, [['1.0.0-beta..1']])
  assert.throws(
    () => readChangelog(root),
    /changelog[\\/]0\.md: version must be/
  )
  const errors = []
  assert.deepEqual(
    readChangelog(root, (error, file) => errors.push({ error, file })),
    []
  )
  assert.equal(errors.length, 1)
  assert.match(errors[0].error.message, /version must be/)
  assert.equal(errors[0].file, path.join(root, 'changelog', '0.md'))
})

test('build metadata does not change release precedence and long numbers stay exact', (t) => {
  const versions = [
    '1.0.0+abc',
    '1.0.0+xyz',
    '1.0.0-9007199254740992',
    '1.0.0-9007199254740993',
    '1.0.0-Z',
    '1.0.0-a',
  ]
  const root = fixture(
    t,
    versions.map((version) => [version])
  )
  assert.deepEqual(
    readChangelog(root).map(({ version }) => version),
    [
      '1.0.0+abc',
      '1.0.0+xyz',
      '1.0.0-a',
      '1.0.0-Z',
      '1.0.0-9007199254740993',
      '1.0.0-9007199254740992',
    ]
  )
})
