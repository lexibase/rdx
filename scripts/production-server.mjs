import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

async function availablePort() {
  const socket = createServer()
  await new Promise((resolve, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolve)
  })
  const { port } = socket.address()
  await new Promise((resolve, reject) =>
    socket.close((error) => (error ? reject(error) : resolve()))
  )
  return port
}

// Run only this fixture's installed CLI, never a global server or port 3000.
export async function withProductionServer(
  entry,
  cwd,
  verify,
  { timeoutMs = 90_000, readyPath = '/docs/init/intro', mode = 'start' } = {}
) {
  assert.ok(
    ['start', 'dev'].includes(mode),
    'Expected a production or development server'
  )
  const port = await availablePort()
  const base = `http://127.0.0.1:${port}`
  const child = spawn(
    process.execPath,
    [entry, mode, '--port', String(port), '--hostname', '127.0.0.1'],
    {
      cwd,
      env: {
        ...process.env,
        NODE_ENV: mode === 'dev' ? 'development' : 'production',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      windowsHide: true,
    }
  )
  let output = ''
  let spawnError
  child.on('error', (error) => {
    spawnError = error
  })
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (data) => {
      output = (output + data.toString()).slice(-24_000)
    })
  const closed = new Promise((resolve) =>
    child.once('close', () => resolve(true))
  )
  let stopping
  function stop() {
    return (stopping ??= (async () => {
      if (!child.pid) return
      if (process.platform === 'win32') {
        if (child.exitCode === null && child.signalCode === null) {
          const result = spawnSync(
            'taskkill',
            ['/PID', String(child.pid), '/T', '/F'],
            {
              windowsHide: true,
              encoding: 'utf8',
              timeout: 10_000,
            }
          )
          // spawnSync blocks delivery of Node's exit/close events. taskkill /T
          // can report a disappearing worker as an error after killing the tree.
          // Yield for confirmed closure before deciding whether shutdown failed.
          if (result.status !== 0)
            await Promise.race([closed, delay(5_000, false, { ref: false })])
          if (
            result.status !== 0 &&
            child.exitCode === null &&
            child.signalCode === null
          )
            throw new Error(
              `Could not stop production fixture PID ${child.pid}: ${[
                result.error?.message,
                result.stderr,
                result.stdout,
              ]
                .filter(Boolean)
                .join('\n')}`
            )
        }
      } else {
        try {
          process.kill(-child.pid, 'SIGTERM')
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }
      if (await Promise.race([closed, delay(5_000, false, { ref: false })]))
        return
      if (process.platform !== 'win32') {
        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }
      assert.ok(
        await Promise.race([closed, delay(5_000, false, { ref: false })]),
        'Production fixture did not stop'
      )
    })())
  }
  const interrupt = () => {
    void stop().finally(() => process.exit(130))
  }
  const terminate = () => {
    void stop().finally(() => process.exit(143))
  }
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', terminate)
  try {
    const deadline = Date.now() + timeoutMs
    let ready = false
    while (Date.now() < deadline) {
      let startupError
      if (spawnError) throw spawnError
      assert.ok(
        child.exitCode === null && child.signalCode === null,
        'Production fixture exited before becoming ready'
      )
      try {
        const response = await fetch(`${base}${readyPath}`, {
          signal: AbortSignal.timeout(
            Math.min(mode === 'dev' ? 30_000 : 3_000, timeoutMs)
          ),
        })
        await response.arrayBuffer()
        if (response.status >= 500)
          startupError = new Error(
            `Server returned HTTP ${response.status} during startup`
          )
        if (response.status === 200) {
          ready = true
          break
        }
      } catch {
        /* Startup may not have bound the socket yet. */
      }
      if (startupError) throw startupError
      await delay(200)
    }
    assert.ok(
      ready,
      `Production fixture did not become ready within ${timeoutMs}ms`
    )
    await verify(base, () => output)
    assert.ok(
      child.exitCode === null && child.signalCode === null,
      'Production fixture exited during HTTP validation'
    )
  } catch (error) {
    throw new Error(`${error.message}\nProduction fixture logs:\n${output}`, {
      cause: error,
    })
  } finally {
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', terminate)
    await stop()
  }
}
