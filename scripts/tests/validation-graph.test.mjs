import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const turbo = path.join(
  path.dirname(require.resolve('turbo/package.json')),
  'bin/turbo'
)

test('showcase validation waits for compiled workspace exports in a fresh checkout', () => {
  // Ask Turbo for its real dependency graph without running or needing builds.
  // Existing local dist/ folders must not hide missing validation prerequisites.
  const graph = JSON.parse(
    execFileSync(
      process.execPath,
      [turbo, 'run', 'lint', 'check-types', '--filter=web', '--dry=json'],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 30_000,
        env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' },
      }
    )
  )
  for (const id of ['web#lint', 'web#check-types']) {
    const task = graph.tasks.find((task) => task.taskId === id)
    assert.ok(task, id)
    for (const name of [
      'rdx-core',
      'rdx-next',
      'rdx-types',
      'rdx-versioning',
    ]) {
      const prerequisite = `@lexibase/${name}#build`
      assert.ok(
        task.dependencies.includes(prerequisite),
        `${id} must wait for ${prerequisite}, even without local dist/ outputs`
      )
    }
  }
})
