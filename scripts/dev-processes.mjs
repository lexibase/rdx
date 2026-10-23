import { spawn, spawnSync } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

function start(task, env) {
  const child = spawn(process.execPath, task.args, {
    cwd: task.cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Separate owned groups keep terminal Ctrl+C in the coordinator on Windows.
    detached: true,
    windowsHide: true,
    shell: false,
  })
  const record = { child, task, exited: false }
  record.exit = new Promise((resolve) => {
    child.once('error', (error) => {
      record.exited = true
      resolve({ code: 1, error })
    })
    child.once('exit', (code, signal) => {
      record.exited = true
      resolve({ code, signal })
    })
  })
  record.closed = new Promise((resolve) => child.once('close', resolve))
  return record
}

function groupExists(pid) {
  try {
    process.kill(-pid, 0)
    return true
  } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  }
}

async function stop(record, timeoutMs) {
  const { child } = record
  if (!child.pid) return
  if (process.platform === 'win32') {
    if (!record.exited) {
      const result = spawnSync(
        'taskkill',
        ['/PID', String(child.pid), '/T', '/F'],
        {
          windowsHide: true,
          encoding: 'utf8',
          timeout: timeoutMs,
        }
      )
      // It may have exited naturally between the check and taskkill.
      if (result.status !== 0) await Promise.race([record.exit, delay(100)])
      if (
        result.status !== 0 &&
        child.exitCode === null &&
        child.signalCode === null
      )
        throw new Error(
          `Could not stop ${record.task.name}: ${result.error?.message ?? result.stderr ?? result.stdout}`
        )
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
    const deadline = Date.now() + timeoutMs
    while (groupExists(child.pid) && Date.now() < deadline) await delay(50)
    if (groupExists(child.pid)) {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
  }
  const finished = await Promise.race([
    record.closed.then(() => true),
    delay(timeoutMs, false, { ref: false }),
  ])
  if (!finished) throw new Error(`Timed out stopping ${record.task.name}.`)
}

/** Run finite setup first, then native Node services, and stop only owned trees. */
export async function runDevProcesses(
  { setup = [], services = [] },
  {
    signal,
    env = process.env,
    stdout = process.stdout,
    stderr = process.stderr,
    timeoutMs = 5_000,
    onStart = () => {},
    onFailure = console.error,
  } = {}
) {
  const records = new Set()
  const cancelled = Symbol('cancelled')
  let cancel
  const cancellation = new Promise((resolve) => {
    cancel = () => resolve(cancelled)
  })
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) cancel()
  let code = 0
  function launch(task) {
    const record = start(task, env)
    record.child.stdout.pipe(stdout, { end: false })
    record.child.stderr.pipe(stderr, { end: false })
    records.add(record)
    onStart(record.child, task)
    return record
  }
  function failure(task, result) {
    code = result.code > 0 ? result.code : 1
    onFailure(
      `[RDX] ${task.name} exited unexpectedly (${result.error?.message ?? result.signal ?? result.code}).`
    )
  }
  try {
    for (const task of setup) {
      if (signal?.aborted) return 0
      const record = launch(task)
      const result = await Promise.race([record.exit, cancellation])
      if (result === cancelled) return 0
      if (result.code !== 0) {
        failure(task, result)
        return code
      }
      await stop(record, timeoutMs)
      records.delete(record)
    }
    if (signal?.aborted) return 0
    if (!services.length) throw new Error('No development services configured.')
    const exits = services.map((task) => {
      const record = launch(task)
      return record.exit.then((result) => ({ task, result }))
    })
    const result = await Promise.race([cancellation, ...exits])
    if (result !== cancelled) failure(result.task, result.result)
  } finally {
    signal?.removeEventListener('abort', cancel)
    const stopped = await Promise.allSettled(
      [...records].map((record) => stop(record, timeoutMs))
    )
    const errors = stopped.filter((result) => result.status === 'rejected')
    if (errors.length)
      throw new AggregateError(
        errors.map((result) => result.reason),
        `Could not stop all development processes: ${errors.map((result) => result.reason.message).join('; ')}`
      )
  }
  return code
}
