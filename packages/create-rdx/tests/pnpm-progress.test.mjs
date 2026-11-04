import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'

import { createPnpmProgress } from '../bin/pnpm-progress.mjs'

function fixture(interactive = true, options = {}) {
  const stdout = []
  const stderr = []
  const progress = createPnpmProgress({
    interactive,
    output: {
      isTTY: interactive,
      columns: 120,
      write: (text) => stdout.push(text),
    },
    errors: { write: (text) => stderr.push(text) },
    intervalMs: 0,
    ...options,
  })
  return {
    progress,
    stdout,
    stderr,
    event: (record) => progress.stdout(JSON.stringify(record) + '\n'),
  }
}

test('the live bar uses real imports, handles split JSON and never declares completion before child closure', () => {
  const { progress, stdout, event } = fixture()
  assert.match(stdout.join(''), /\[----------------\].*0\/\?/)
  event({ name: 'pnpm:stats', prefix: 'workspace', added: 2 })
  const record = JSON.stringify({
    name: 'pnpm:progress',
    status: 'imported',
    requester: 'workspace',
    to: 'pkg-a',
  })
  progress.stdout(record.slice(0, 25))
  progress.stdout(record.slice(25) + '\n')
  event(JSON.parse(record))
  assert.match(stdout.join(''), /\[########--------\].*1\/2/)
  assert.doesNotMatch(stdout.join(''), /Dependencies installed/)
  event({
    name: 'pnpm:progress',
    status: 'imported',
    requester: 'workspace',
    to: 'pkg-b',
  })
  event({ name: 'pnpm:stage', stage: 'importing_done' })
  assert.match(stdout.join(''), /\[################\] Finalizing 2\/2/)
  assert.doesNotMatch(stdout.join(''), /Dependencies installed/)
  progress.finish(true)
  assert.match(stdout.join(''), /Dependencies installed: 2 linked/)
  assert.doesNotMatch(stdout.join(''), /"pnpm:/)
})

test('workspace totals and cache/download counts accumulate without duplicate progress events', () => {
  const { progress, stdout, event } = fixture()
  event({ name: 'pnpm:stats', prefix: 'a', added: 1 })
  event({ name: 'pnpm:stats', prefix: 'b', added: 2 })
  for (const name of ['one', 'two', 'three']) {
    event({ name: 'pnpm:progress', status: 'resolved', packageId: name })
    event({ name: 'pnpm:progress', status: 'found_in_store', packageId: name })
    event({ name: 'pnpm:progress', status: 'imported', to: name })
  }
  event({ name: 'pnpm:progress', status: 'fetched', packageId: 'four' })
  event({ name: 'pnpm:progress', status: 'found_in_store', packageId: 'one' })
  assert.match(stdout.join(''), /3\/3/)
  progress.finish(true)
  assert.match(stdout.at(-1), /3 linked, 3 cached, 1 downloaded/)
})

test('warnings, fatal errors, lifecycle scripts, downloads and unknown plain output remain visible', () => {
  const { progress, stdout, stderr, event } = fixture(false)
  event({
    name: 'pnpm:fetching-progress',
    status: 'started',
    packageId: 'next@16',
    size: 2 * 1024 * 1024,
  })
  event({ name: 'pnpm:lifecycle', stage: 'postinstall', line: 'Script output' })
  event({ name: 'pnpm', level: 'warn', message: 'Registry retry' })
  event({
    name: 'pnpm',
    level: 'error',
    err: {
      code: 'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION',
      message: 'Release is too recent',
      hint: 'Check your project policy',
    },
  })
  event({
    name: 'pnpm:peer-dependency-issues',
    issuesByProjects: { docs: { bad: 'eslint' } },
  })
  event({ name: 42, message: 'Unexpected record' })
  progress.stdout('Preserved plain output\n')
  progress.stderr('Native stderr\n')
  progress.finish(false)
  assert.match(stdout.join(''), /Downloading next@16 \(2.0 MB\)/)
  assert.match(stdout.join(''), /Script output/)
  assert.match(stdout.join(''), /Unexpected record/)
  assert.match(stdout.join(''), /Preserved plain output/)
  for (const text of [
    'Registry retry',
    'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION',
    'Check your project policy',
    'eslint',
    'Native stderr',
  ])
    assert.ok(stderr.join('').includes(text))
  assert.doesNotMatch(stdout.join(''), /\x1b|Dependencies installed/)
  assert.match(stdout.join(''), /Installation stopped/)
})

test('prompts without a newline stay visible while the animation is paused', async () => {
  const { progress, stdout } = fixture(true, { intervalMs: 5 })
  try {
    progress.stdout('Continue? ')
    const count = stdout.length
    await delay(25)
    assert.equal(stdout.length, count)
    progress.stdout('\n')
    await delay(15)
    assert.ok(stdout.length > count)
  } finally {
    progress.finish(false)
  }
})

test('the spinner keeps moving during quiet periods and is stopped on success or failure', async () => {
  for (const success of [true, false]) {
    const { progress, stdout } = fixture(true, { intervalMs: 5 })
    await delay(30)
    assert.match(stdout.join(''), /\/ \[/)
    progress.finish(success)
    const count = stdout.length
    await delay(20)
    progress.finish(success)
    assert.equal(stdout.length, count)
  }
})

test('non-interactive logs keep reporting during quiet periods without terminal escapes', async () => {
  const { progress, stdout } = fixture(false, { intervalMs: 1, heartbeatMs: 5 })
  await delay(25)
  assert.ok(stdout.length > 1)
  assert.doesNotMatch(stdout.join(''), /\x1b/)
  progress.finish(true)
  const count = stdout.length
  await delay(15)
  assert.equal(stdout.length, count)
})

test('high-volume package records update counters without repainting on every event', () => {
  const { progress, stdout, event } = fixture(true, { intervalMs: 10_000 })
  const initial = stdout.length
  for (let index = 0; index < 1000; index++)
    event({
      name: 'pnpm:progress',
      status: 'resolved',
      packageId: String(index),
    })
  assert.equal(stdout.length, initial)
  progress.finish(true)
})
