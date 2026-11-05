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
    lookup: (spec) => (spec === '@lexibase/core@2.0.0' ? '2.0.0' : undefined),
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
  await publishPackages(packages, {
    dryRun: false,
    lookup: (spec) => registry.get(spec),
    publish: (archive) => published.push(archive),
    wait: () => {
      registry.set('@lexibase/consumer@2.0.0', '2.0.0')
      registry.set('@lexibase/consumer@latest', '2.0.0')
    },
    log: () => {},
  })
  assert.deepEqual(published, ['consumer.tgz'])
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
