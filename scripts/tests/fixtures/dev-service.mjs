import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const mode = process.argv[2] ?? 'server'
if (mode === 'setup' || mode === 'setup-failure') {
  console.log(`setup ${mode}`)
  process.exitCode = mode === 'setup' ? 0 : 17
} else if (mode === 'failure') {
  setTimeout(() => {
    console.error('Intentional development failure')
    process.exit(23)
  }, 300)
} else {
  if (mode === 'tree') {
    const child = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), 'leaf'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      }
    )
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
  }
  if (mode === 'leaf') process.on('SIGTERM', () => {})
  const server = createServer((_request, response) => response.end('Running'))
  server.listen(0, '127.0.0.1', () => {
    console.log(
      JSON.stringify({ pid: process.pid, port: server.address().port, mode })
    )
  })
}
