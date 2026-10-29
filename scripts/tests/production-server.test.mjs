import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { createServer } from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

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

function mockTaskkill(t, run) {
  const original = childProcess.spawnSync
  const mocked = t.mock.method(
    childProcess,
    'spawnSync',
    (command, args, options) =>
      command === 'taskkill'
        ? run(original, args, options)
        : original(command, args, options)
  )
  syncBuiltinESMExports()
  t.after(() => {
    mocked.mock.restore()
    syncBuiltinESMExports()
  })
  return original
}

async function waitForPortRelease(base) {
  const deadline = Date.now() + 2_000
  while (true) {
    try {
      await assertPortReleased(base)
      return
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || Date.now() >= deadline) throw error
      await delay(25)
    }
  }
}

test(
  'Windows cleanup accepts a taskkill worker race only after the server actually closes',
  {
    skip: process.platform !== 'win32',
    timeout: 20_000,
  },
  async (t) => {
    let base
    let calls = 0
    mockTaskkill(t, (original, args, options) => {
      calls++
      const result = original('taskkill', args, options)
      return {
        ...result,
        status: 1,
        stderr: 'A worker exited during taskkill.',
      }
    })
    await withProductionServer(
      entry,
      cwd,
      async (url) => {
        base = url
      },
      { timeoutMs: 10_000 }
    )
    assert.equal(calls, 1)
    await assertPortReleased(base)
  }
)

test(
  'Windows cleanup still rejects a failed taskkill when the server remains alive',
  {
    skip: process.platform !== 'win32',
    timeout: 20_000,
  },
  async (t) => {
    let base
    let pid
    const original = mockTaskkill(t, (_original, args) => {
      pid = Number(args[1])
      return { status: 1, stderr: 'Intentional taskkill refusal.' }
    })
    t.after(async () => {
      if (pid)
        original('taskkill', ['/PID', String(pid), '/T', '/F'], {
          windowsHide: true,
        })
      // The intentionally refused stop left a live server. Its forced cleanup
      // can return before Windows has released the listening socket.
      if (base) await waitForPortRelease(base)
    })
    await assert.rejects(
      withProductionServer(
        entry,
        cwd,
        async (url) => {
          base = url
        },
        { timeoutMs: 10_000 }
      ),
      /Could not stop production fixture PID .*Intentional taskkill refusal/
    )
    assert.equal(await (await fetch(base)).text(), 'Fixture is running')
  }
)

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
    const started = performance.now()
    await assert.rejects(
      withProductionServer(
        path.join(cwd, 'waiting-server.mjs'),
        cwd,
        () => assert.fail('must not verify'),
        { timeoutMs: 2_000 }
      ),
      (error) => {
        assert.match(error.message, /did not become ready within 2000ms/)
        // A slow machine may time out before Node executes the fixture at all.
        // Log capture is covered separately by the startup-failure test.
        const pid = error.message.match(
          /Intentional startup timeout \(PID (\d+)\)/
        )?.[1]
        if (pid)
          assert.throws(() => process.kill(Number(pid), 0), { code: 'ESRCH' })
        return true
      }
    )
    assert.ok(
      performance.now() - started < 15_000,
      'Startup and cleanup remain bounded'
    )
  }
)
