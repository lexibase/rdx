import { performance } from 'node:perf_hooks'

/** Show real stage timings while preserving the installer's own terminal output. */
export async function runStep(
  label,
  operation,
  { log = console.log, intervalMs = 15_000 } = {}
) {
  const started = performance.now()
  const elapsed = () => ((performance.now() - started) / 1000).toFixed(1)
  log(`\n${label}`)
  const timer = setInterval(() => {
    log(`[RDX] ${label} (${elapsed()}s elapsed)`)
  }, intervalMs)
  timer.unref()
  try {
    const result = await operation()
    log(`[RDX] Completed in ${elapsed()}s.`)
    return result
  } finally {
    clearInterval(timer)
  }
}
