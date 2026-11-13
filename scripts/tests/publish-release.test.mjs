import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadRelease, publishPackages } from '../publish-release.mjs'

const packages = [
  { name: '@lexibase/core', version: '2.0.0', archive: 'core.tgz' },
  { name: '@lexibase/consumer', version: '2.0.0', archive: 'consumer.tgz' },
]

test('a dry run only reports missing versions and refuses a mismatched release version', async () => {
  const log = []
  await publishPackages(packages, {
    lookup: (spec) =>
      ({
        '@lexibase/core@2.0.0': '2.0.0',
        '@lexibase/consumer@latest': '1.0.0',
      })[spec],
    publish: () => assert.fail('dry run cannot publish'),
    log: (message) => log.push(message),
  })
  assert.deepEqual(log, [
    'Already on npm: @lexibase/core@2.0.0',
    'Would publish: @lexibase/consumer@2.0.0',
  ])
  await assert.rejects(
    loadRelease(fileURLToPath(new URL('../..', import.meta.url)), '0.0.0'),
    /not prepared/
  )
})

test('a retry skips published archives and waits for the remaining package and tag', async () => {
  const registry = new Map([
    ['@lexibase/core@2.0.0', '2.0.0'],
    ['@lexibase/core@latest', '2.0.0'],
    ['@lexibase/consumer@latest', '1.0.0'],
  ])
  const published = []
  let polls = 0
  let time = 0
  const unavailable = Object.assign(new Error('npm returned HTTP 503'), {
    retryable: true,
  })
  await publishPackages(packages, {
    dryRun: false,
    lookup: (spec) => {
      if (published.length && !polls) throw unavailable
      return registry.get(spec)
    },
    publish: (archive) => published.push(archive),
    now: () => time,
    wait: (duration) => {
      time += duration
      if (++polls < 25) return
      registry.set('@lexibase/consumer@2.0.0', '2.0.0')
      registry.set('@lexibase/consumer@latest', '2.0.0')
    },
    log: () => {},
  })
  assert.deepEqual(published, ['consumer.tgz'])
  assert.equal(polls, 25)
  assert.equal(time, 250_000)
})

test('a new package is reported before any archive is published', async () => {
  const lookup = (spec) =>
    spec === '@lexibase/core@latest' ? '1.0.0' : undefined
  await assert.rejects(
    publishPackages(packages, {
      dryRun: false,
      lookup,
      publish: () => assert.fail('preflight must finish before publishing'),
    }),
    /First publication required for @lexibase\/consumer@2\.0\.0/
  )
})

test('a retry waits for latest after the exact version is already visible', async () => {
  let time = 0
  await publishPackages(packages.slice(0, 1), {
    dryRun: false,
    lookup: (spec) => (spec.endsWith('@latest') && !time ? '1.0.0' : '2.0.0'),
    now: () => time,
    wait: (duration) => {
      time += duration
    },
    publish: () => assert.fail('an existing version must not be republished'),
    log: () => {},
  })
  assert.equal(time, 10_000)
})

test('publication stops on registry errors and never downgrades latest', async () => {
  const publish = () => assert.fail('unsafe release must not publish')
  await assert.rejects(
    publishPackages(packages, {
      dryRun: false,
      lookup: (spec) => (spec.endsWith('@latest') ? '3.0.0' : undefined),
      publish,
    }),
    /backwards/
  )
  await assert.rejects(
    publishPackages(packages, {
      dryRun: false,
      lookup: () => {
        throw new Error('Registry unavailable')
      },
      publish,
    }),
    /Registry unavailable/
  )
})
