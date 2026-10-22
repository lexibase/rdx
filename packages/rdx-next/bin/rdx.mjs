#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { access, cp, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

import { createRdxProject } from '@lexibase/rdx-core/config'
import { createJiti } from 'jiti'

import { preparePublicAssets } from './public-assets.mjs'

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
  await preparePublicAssets(projectRoot, runtimeDirectory)
  await cp(runtimeTemplate, runtimeDirectory, { force: true, recursive: true })
}

async function main() {
  if (!command || command === 'help' || command === '--help') {
    console.log('Usage: rdx <dev|build|start|prepare|plugin-command>')
    console.log(
      'Plugin commands are registered through plugins in rdx.config.ts.'
    )
    return
  }

  const configPath = path.join(projectRoot, 'rdx.config.ts')
  try {
    await access(configPath)
  } catch {
    throw new Error(
      `Missing ${configPath}. Run rdx from the documentation project root.`
    )
  }

  const jiti = createJiti(import.meta.url, {
    moduleCache: false,
    fsCache: false,
    jsx: { runtime: 'automatic' },
  })
  let input
  try {
    input = await jiti.import(configPath, { default: true })
  } catch (error) {
    const hint =
      error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND'
        ? ' If a configured plugin cannot be resolved, install its package in this project.'
        : ''
    throw new Error(`Could not load rdx.config.ts: ${error.message}${hint}`)
  }

  const project = await createRdxProject(input, {
    rootDir: projectRoot,
    command,
  })
  if (command === 'prepare') {
    await prepareRuntime()
    console.log('RDX runtime prepared in .rdx/')
    return
  }
  if (!supportedCommands.has(command)) {
    const pluginCommand = project.commands.find(
      (entry) => entry.name === command
    )
    if (!pluginCommand)
      throw new Error(
        `Unknown command "${command}". Available: dev, build, start, prepare${project.commands.map((entry) => `, ${entry.name}`).join('')}. Install and configure the plugin that provides this command.`
      )
    await pluginCommand.run({
      rootDir: projectRoot,
      config: project.config,
      command,
      args: commandArgs,
    })
    return
  }

  await prepareRuntime()
  const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
  const nextCli = projectRequire.resolve('next/dist/bin/next')
  const child = spawn(
    process.execPath,
    [nextCli, command, runtimeDirectory, ...commandArgs],
    { cwd: projectRoot, stdio: 'inherit' }
  )
  child.on('error', (error) => {
    console.error(`[RDX] Could not start Next.js: ${error.message}`)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 1)
  })
}

try {
  await main()
} catch (error) {
  console.error(`[RDX] ${error.message}`)
  process.exitCode = 1
}
