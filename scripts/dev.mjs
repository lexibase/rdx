import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { runDevProcesses } from './dev-processes.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)

export function captureTerminalInterrupt(input, interrupt) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') return () => {}
  const wasRaw = Boolean(input.isRaw)
  const wasFlowing = input.readableFlowing === true
  // Own Ctrl+C as input instead of broadcasting it to pnpm's Windows batch shim.
  const onInput = (data) => {
    if (Buffer.from(data).includes(3)) interrupt()
  }
  input.setRawMode(true)
  input.on('data', onInput)
  input.resume()
  return () => {
    input.removeListener('data', onInput)
    input.setRawMode(wasRaw)
    if (!wasFlowing) input.pause()
  }
}

export function developmentPlan() {
  const web = path.join(root, 'apps/web')
  const webRequire = createRequire(path.join(web, 'package.json'))
  const services = [
    'rdx-types',
    'rdx-core',
    'rdx-next',
    'rdx-plugin-versioning',
  ].map((folder) => {
    const cwd = path.join(root, 'packages', folder)
    const pkg = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'))
    const [tool, ...args] = pkg.scripts.dev.split(/\s+/)
    if (tool !== 'node' && tool !== 'tsup')
      throw new Error(`Unsupported development runner in ${pkg.name}: ${tool}`)
    return {
      name: pkg.name,
      cwd,
      args:
        tool === 'tsup'
          ? [require.resolve('tsup/dist/cli-default.js'), ...args]
          : args,
    }
  })
  return {
    setup: [
      {
        name: 'workspace builds',
        cwd: root,
        args: [
          require.resolve('turbo'),
          'run',
          'build',
          '--filter=@lexibase/rdx-next...',
          '--filter=@lexibase/rdx-versioning...',
          '--ui=stream',
        ],
      },
      {
        name: 'documentation prepare',
        cwd: web,
        args: [
          '--import',
          pathToFileURL(webRequire.resolve('tsx')).href,
          'scripts/project.ts',
          'prepare',
        ],
      },
    ],
    services: [
      ...services,
      {
        name: 'web',
        cwd: web,
        args: [webRequire.resolve('next/dist/bin/next'), 'dev'],
      },
    ],
  }
}

export async function main() {
  const controller = new AbortController()
  const interrupt = () => {
    if (!controller.signal.aborted) {
      console.log('\n[RDX] Stopping development processes...')
      controller.abort()
    }
  }
  process.on('SIGINT', interrupt)
  process.on('SIGTERM', interrupt)
  const restoreTerminal = captureTerminalInterrupt(process.stdin, interrupt)
  try {
    if (process.argv.length > 2)
      throw new Error(
        'Run pnpm dev without extra arguments. Use PORT to choose a port.'
      )
    return await runDevProcesses(developmentPlan(), {
      signal: controller.signal,
    })
  } finally {
    restoreTerminal()
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', interrupt)
  }
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    process.exitCode = await main()
  } catch (error) {
    console.error(`[RDX] ${error.stack ?? error}`)
    process.exitCode = 1
  }
}
