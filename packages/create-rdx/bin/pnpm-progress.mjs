import { performance } from 'node:perf_hooks'
import process from 'node:process'

/** Adapt pnpm's NDJSON logs; the bar measures package linking, not elapsed time. */
export function createPnpmProgress({
  output = process.stdout,
  errors = process.stderr,
  interactive = Boolean(output.isTTY) && process.env.TERM !== 'dumb',
  intervalMs = 125,
  heartbeatMs = 15_000,
  now = () => performance.now(),
} = {}) {
  const started = now()
  const counts = { resolved: 0, cached: 0, downloaded: 0, linked: 0 }
  const statuses = {
    resolved: 'resolved',
    found_in_store: 'cached',
    fetched: 'downloaded',
    imported: 'linked',
  }
  const totals = new Map()
  const seen = new Set()
  let phase = 'Resolving dependencies'
  let buffer = ''
  let frame = 0
  let finished = false
  let promptOpen = false
  let previousPhase
  let frameWidth = 0
  let platformWarning
  let skippedPlatforms = 0
  const elapsed = () => `${((now() - started) / 1000).toFixed(1)}s`
  const clear = () => {
    if (interactive && frameWidth) {
      output.write('\r\x1b[2K')
      frameWidth = 0
    }
  }
  function render() {
    const total = totals.size
      ? [...totals.values()].reduce((sum, value) => sum + value, 0)
      : undefined
    const width = output.columns || 100
    const cells = width < 100 ? 10 : 16
    const filled =
      total > 0
        ? Math.min(cells, Math.floor((counts.linked / total) * cells))
        : 0
    const bar = `[${'#'.repeat(filled)}${'-'.repeat(cells - filled)}]`
    const packages =
      total === undefined ? `${counts.linked}/?` : `${counts.linked}/${total}`
    const detail = `${width >= 110 ? `resolved ${counts.resolved}, ` : ''}cached ${counts.cached}, downloaded ${counts.downloaded}`
    const shortPhase = phase.split(' ')[0]
    const text =
      width < 70
        ? `${packages} packages | ${elapsed()}`
        : `${shortPhase} ${packages} | ${elapsed()} | ${detail}`
    return `${['|', '/', '-', '\\'][frame++ % 4]} ${bar} ${text}`.slice(
      0,
      Math.max(1, width - 1)
    )
  }
  function draw(force = false) {
    if (finished || promptOpen) return
    if (interactive) {
      // pnpm emits many debug records per package. Paint on the timer instead
      // of turning each record into terminal writes during large installations.
      if (!force && intervalMs > 0 && previousPhase === phase) return
      const line = render()
      const previousWidth = Math.min(
        frameWidth,
        Math.max(1, (output.columns || 100) - 1)
      )
      // Write the replacement and any trailing padding atomically. Clearing the
      // row in a separate write exposes a blank frame in Windows terminals.
      output.write('\r' + line.padEnd(previousWidth, ' '))
      frameWidth = line.length
    } else if (force || previousPhase !== phase) {
      output.write(
        `[RDX] ${phase}: resolved ${counts.resolved}, cached ${counts.cached}, downloaded ${counts.downloaded}, linked ${counts.linked} (${elapsed()}).\n`
      )
    }
    previousPhase = phase
  }
  function message(text, stream = output) {
    flushPlatformWarning()
    if (!promptOpen) clear()
    stream.write(text)
    // Keep prompts without a newline visible and leave the cursor after them.
    promptOpen = !text.endsWith('\n')
    if (text.endsWith('\n')) draw(true)
  }
  function diagnostic(event) {
    const error = event.err || event
    const text = [
      error.code,
      error.message || event.message,
      error.hint,
      error.pkgsStack && JSON.stringify(error.pkgsStack),
    ]
      .filter(Boolean)
      .join('\n')
    message(`[pnpm] ${text || JSON.stringify(event)}\n`, errors)
  }
  function flushPlatformWarning() {
    if (!platformWarning) return
    const { event } = platformWarning
    platformWarning = undefined
    diagnostic(event)
  }
  function record(line) {
    if (!line.trim()) {
      if (promptOpen) message('\n')
      return
    }
    let event
    try {
      event = JSON.parse(line)
    } catch {
      message(line + '\n')
      return
    }
    if (
      !event ||
      typeof event !== 'object' ||
      typeof event.name !== 'string' ||
      !(event.name === 'pnpm' || event.name.startsWith('pnpm:'))
    ) {
      message(line + '\n')
      return
    }
    if (promptOpen) {
      output.write('\n')
      promptOpen = false
    }
    if (platformWarning) {
      if (
        event.name === 'pnpm:skipped-optional-dependency' &&
        event.reason === 'unsupported_platform' &&
        event.package?.id === platformWarning.id &&
        event.prefix === platformWarning.event.prefix
      ) {
        platformWarning = undefined
        skippedPlatforms++
        return
      }
      flushPlatformWarning()
    }
    if (event.name === 'pnpm:install-check' && event.level === 'warn') {
      const match = /^Unsupported platform for (.+?): wanted /.exec(
        event.message || ''
      )
      if (match) {
        // pnpm emits the warning before confirming that this is an optional
        // package for another OS/CPU. Suppress only the confirmed matching pair.
        platformWarning = { id: match[1], event }
        return
      }
    }
    if (
      event.name === 'pnpm:progress' &&
      Object.hasOwn(statuses, event.status)
    ) {
      const key = statuses[event.status]
      const id = event.to || event.packageId
      const identity = id && JSON.stringify([event.requester, event.status, id])
      if (!identity || !seen.has(identity)) {
        counts[key]++
        if (identity) seen.add(identity)
      }
      if (key === 'linked') phase = 'Linking packages'
    } else if (
      event.name === 'pnpm:fetching-progress' &&
      event.status === 'started' &&
      event.size >= 1024 * 1024
    ) {
      message(
        `[RDX] Downloading ${event.packageId} (${(event.size / 1024 / 1024).toFixed(1)} MB).\n`
      )
    } else if (event.name === 'pnpm:stats' && Number.isFinite(event.added)) {
      totals.set(event.prefix || '', Math.max(0, event.added))
    } else if (event.name === 'pnpm:stage') {
      if (event.stage === 'importing_started') phase = 'Linking packages'
      if (event.stage === 'importing_done') phase = 'Finalizing installation'
    } else if (event.name === 'pnpm:lifecycle' && event.line) {
      message(`[pnpm:${event.stage || 'script'}] ${event.line}\n`)
    } else if (event.level === 'warn' || event.level === 'error') {
      diagnostic(event)
    } else if (event.name === 'pnpm:peer-dependency-issues') {
      message(
        `[pnpm] Peer dependency issues:\n${JSON.stringify(event.issuesByProjects || event, null, 2)}\n`,
        errors
      )
    } else if (event.level === 'info' && event.message) {
      message(`[pnpm] ${event.message}\n`)
    }
    draw()
  }
  draw(true)
  const timer =
    intervalMs > 0
      ? setInterval(() => draw(true), interactive ? intervalMs : heartbeatMs)
      : undefined
  timer?.unref()
  return {
    stdout(chunk) {
      buffer += chunk
      let end
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end).replace(/\r$/, '')
        buffer = buffer.slice(end + 1)
        record(line)
      }
      if (buffer && !buffer.trimStart().startsWith('{')) {
        message(buffer)
        buffer = ''
      }
    },
    stderr(chunk) {
      message(chunk, errors)
    },
    finish(success) {
      if (finished) return
      clearInterval(timer)
      if (buffer) {
        record(buffer)
        buffer = ''
      }
      flushPlatformWarning()
      finished = true
      if (promptOpen) {
        output.write('\n')
        promptOpen = false
      }
      clear()
      if (skippedPlatforms)
        output.write(
          `[RDX] Skipped ${skippedPlatforms} optional package${skippedPlatforms === 1 ? '' : 's'} for other platforms.\n`
        )
      output.write(
        `[RDX] ${success ? 'Dependencies installed' : 'Installation stopped'}: ${counts.linked} linked, ${counts.cached} cached, ${counts.downloaded} downloaded (${elapsed()}).\n`
      )
    },
  }
}
