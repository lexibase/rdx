import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { withProductionServer } from '../production-server.mjs'

const cwd = fileURLToPath(new URL('./fixtures', import.meta.url))
const entry = path.join(cwd, 'http-server.mjs')
async function assertPortReleased(base) {
  const socket = createServer()
  try {
    await new Promise((resolve, reject) => {
      socket.once('error', reject)
      socket.listen(Number(new URL(base).port), '127.0.0.1', resolve)
    })
  } finally {
    if (socket.listening) await new Promise((resolve) => socket.close(resolve))
  }
}

test(
  'production harness uses an available local port and releases it after success',
  { timeout: 20_000 },
  async () => {
    let base
    await withProductionServer(
      entry,
      cwd,
      async (url) => {
        base = url
        assert.notEqual(new URL(url).port, '3000')
        assert.equal(
          await (
            await fetch(url, { signal: AbortSignal.timeout(3_000) })
          ).text(),
          'Fixture is running'
        )
      },
      { timeoutMs: 10_000 }
    )
    await assertPortReleased(base)
  }
)

test(
  'production harness stops its server when an HTTP assertion fails',
  { timeout: 20_000 },
  async () => {
    let base
    await assert.rejects(
      withProductionServer(
        entry,
        cwd,
        async (url) => {
          base = url
          throw new Error('Intentional assertion failure')
        },
        { timeoutMs: 10_000 }
      ),
      /Intentional assertion failure/
    )
    await assertPortReleased(base)
  }
)

test('server harness supports development with the matching Node environment and cleanup', async () => {
  let base
  await withProductionServer(
    entry,
    cwd,
    async (url) => {
      base = url
      assert.deepEqual(await (await fetch(`${url}/environment`)).json(), {
        command: 'dev',
        nodeEnv: 'development',
      })
    },
    { mode: 'dev' }
  )
  await assertPortReleased(base)
})

test(
  'production startup failures include captured server logs',
  { timeout: 20_000 },
  async () => {
    await assert.rejects(
      withProductionServer(
        path.join(cwd, 'failed-server.mjs'),
        cwd,
        () => assert.fail('must not verify'),
        { timeoutMs: 10_000 }
      ),
      /Production fixture logs:[\s\S]*Intentional startup failure/
    )
  }
)

test('server harness reports startup HTTP errors without waiting for the readiness timeout', async () => {
  await assert.rejects(
    withProductionServer(entry, cwd, () => assert.fail('must not verify'), {
      readyPath: '/unhealthy',
      timeoutMs: 10_000,
    }),
    /HTTP 500 during startup/
  )
})

test(
  'production harness bounds startup waits and stops an unready process',
  { timeout: 20_000 },
  async () => {
    await assert.rejects(
      withProductionServer(
        path.join(cwd, 'waiting-server.mjs'),
        cwd,
        () => assert.fail('must not verify'),
        { timeoutMs: 2_000 }
      ),
      /did not become ready[\s\S]*Intentional startup timeout/
    )
  }
)
