#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const supportedCommands = new Set(['dev', 'build', 'start'])
const command = process.argv[2]
const commandArgs = process.argv.slice(3)
const projectRoot = process.cwd()
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const runtimeTemplate = path.join(packageRoot, 'templates', 'runtime')
const runtimeDirectory = path.join(projectRoot, '.rdx')

async function prepareRuntime() {
  await mkdir(runtimeDirectory, { recursive: true })
  await cp(runtimeTemplate, runtimeDirectory, { force: true, recursive: true })
}

if (command === 'prepare') {
  await prepareRuntime()
  console.log('RDX runtime prepared in .rdx/')
  process.exit(0)
}

if (!command || !supportedCommands.has(command)) {
  console.error('Usage: rdx <dev|build|start|prepare>')
  process.exit(1)
}

await prepareRuntime()

const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
const nextCli = projectRequire.resolve('next/dist/bin/next')
const child = spawn(
  process.execPath,
  [nextCli, command, runtimeDirectory, ...commandArgs],
  { cwd: projectRoot, stdio: 'inherit' }
)

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
