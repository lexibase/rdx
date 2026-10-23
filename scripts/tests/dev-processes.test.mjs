import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'
import path from 'node:path'
import { Writable } from 'node:stream'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { developmentSpawnOptions, runDevProcesses } from '../dev-processes.mjs'
import { captureTerminalInterrupt, developmentPlan } from '../dev.mjs'

const cwd = fileURLToPath(new URL('./fixtures/', import.meta.url))
const entry = path.join(cwd, 'dev-service.mjs')
const task = (name, mode = 'server') => ({ name, cwd, args: [entry, mode] })

test('Windows services share the terminal console while POSIX keeps owned process groups', () => {
  const service = task('server')
  const env = { RDX_TEST: '1' }
  const windows = developmentSpawnOptions(service, env, 'win32')
  assert.equal(windows.detached, false)
  assert.equal(windows.windowsHide, false)
  assert.equal(windows.shell, false)
  assert.equal(windows.cwd, cwd)
  assert.equal(windows.env, env)
  assert.deepEqual(windows.stdio, ['ignore', 'pipe', 'pipe'])
  for (const platform of ['linux', 'darwin']) {
    assert.equal(developmentSpawnOptions(service, env, platform).detached, true)
  }
})

function output() {
  let value = ''
  const stream = new Writable({
    write(chunk, _encoding, done) {
      value += chunk
      done()
    },
  })
  return {
    stream,
    text: () => value,
    servers: () =>
      value.split('\n').flatMap((line) => {
        try {
          const item = JSON.parse(line)
          return item.port ? [item] : []
        } catch {
          return []
        }
      }),
  }
}

async function until(check, message) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (await check()) return
    await delay(25)
  }
  assert.fail(message)
}

async function released(port) {
  await assert.rejects(
    fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1_000) })
  )
}

test(
  'one cancellation stops owned services and descendants, releases ports and leaves unrelated servers alive',
  { timeout: 20_000 },
  async () => {
    const guard = createServer((_request, response) =>
      response.end('Unrelated')
    )
    await new Promise((resolve) => guard.listen(0, '127.0.0.1', resolve))
    const controller = new AbortController()
    const logs = output()
    const errors = []
    const run = runDevProcesses(
      { services: [task('watcher'), task('server tree', 'tree')] },
      {
        signal: controller.signal,
        stdout: logs.stream,
        stderr: logs.stream,
        timeoutMs: 500,
        onFailure: (message) => errors.push(message),
      }
    )
    try {
      await until(() => logs.servers().length === 3, logs.text())
      for (const { port } of logs.servers())
        assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200)
      controller.abort()
      controller.abort()
      assert.equal(await run, 0)
      assert.deepEqual(errors, [])
      for (const { port } of logs.servers()) await released(port)
      assert.equal(
        await (await fetch(`http://127.0.0.1:${guard.address().port}`)).text(),
        'Unrelated'
      )
    } finally {
      controller.abort()
      await run
      await new Promise((resolve) => guard.close(resolve))
    }
  }
)

test(
  'real service failure preserves its nonzero code and output while stopping siblings',
  { timeout: 20_000 },
  async () => {
    const logs = output()
    const errors = []
    const code = await runDevProcesses(
      { services: [task('watcher'), task('failed service', 'failure')] },
      {
        stdout: logs.stream,
        stderr: logs.stream,
        timeoutMs: 500,
        onFailure: (message) => errors.push(message),
      }
    )
    assert.equal(code, 23)
    assert.match(logs.text(), /Intentional development failure/)
    assert.match(errors.join('\n'), /failed service.*23/)
    for (const { port } of logs.servers()) await released(port)
  }
)

test('setup failure never starts services and keeps the original exit code', async () => {
  const logs = output()
  const started = []
  const code = await runDevProcesses(
    {
      setup: [task('failed build', 'setup-failure')],
      services: [task('must not start')],
    },
    {
      stdout: logs.stream,
      stderr: logs.stream,
      onStart: (_child, task) => started.push(task.name),
      onFailure: () => {},
    }
  )
  assert.equal(code, 17)
  assert.deepEqual(started, ['failed build'])
})

test(
  'cancelling initial setup prevents startup of all subsequent tasks',
  { timeout: 20_000 },
  async () => {
    const controller = new AbortController()
    const logs = output()
    const started = []
    const run = runDevProcesses(
      { setup: [task('slow build')], services: [task('must not start')] },
      {
        signal: controller.signal,
        stdout: logs.stream,
        stderr: logs.stream,
        timeoutMs: 500,
        onStart: (_child, task) => started.push(task.name),
      }
    )
    try {
      await until(() => logs.servers().length === 1, 'Setup did not start')
      controller.abort()
      assert.equal(await run, 0)
      assert.deepEqual(started, ['slow build'])
      await released(logs.servers()[0].port)
    } finally {
      controller.abort()
      await run
    }
  }
)

test('successful setup completes before watchers start; unexpected clean service exit is still a failure', async () => {
  const logs = output()
  let setup
  const code = await runDevProcesses(
    {
      setup: [task('build', 'setup')],
      services: [task('unexpected exit', 'setup')],
    },
    {
      stdout: logs.stream,
      stderr: logs.stream,
      onFailure: () => {},
      onStart: (child, task) => {
        if (task.name === 'build') setup = child
        else assert.equal(setup.exitCode, 0)
      },
    }
  )
  assert.equal(code, 1)
})

test('development plan keeps the initial Turbo builds but launches long-running tools without package-manager batch files', () => {
  const plan = developmentPlan()
  assert.equal(plan.setup.length, 2)
  assert.ok(plan.setup[0].args.includes('build'))
  assert.equal(plan.services.length, 5)
  assert.ok(
    plan.services.every((task) => !task.args.some((arg) => /\.cmd$/i.test(arg)))
  )
  assert.ok(
    plan.services.some(
      (task) => task.name === 'web' && task.args.at(-1) === 'dev'
    )
  )
})

test('terminal Ctrl+C is captured once per key and original raw/flow state is restored', () => {
  const input = new EventEmitter()
  input.isTTY = true
  input.isRaw = false
  input.readableFlowing = null
  input.setRawMode = (raw) => {
    input.isRaw = raw
  }
  input.resume = () => {
    input.readableFlowing = true
  }
  input.pause = () => {
    input.readableFlowing = false
  }
  let interrupts = 0
  const restore = captureTerminalInterrupt(input, () => {
    interrupts++
  })
  assert.equal(input.isRaw, true)
  input.emit('data', Buffer.from('hello'))
  input.emit('data', Buffer.from([3]))
  assert.equal(interrupts, 1)
  restore()
  assert.equal(input.isRaw, false)
  assert.equal(input.readableFlowing, false)
  assert.equal(input.listenerCount('data'), 0)
  assert.doesNotThrow(() =>
    captureTerminalInterrupt({ isTTY: false }, () => {})()
  )
})
