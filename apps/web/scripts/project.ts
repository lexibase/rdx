import { fileURLToPath } from 'node:url'

import config from '../rdx.config'
import { runProjectCommand } from '../lib/project-command'

const [command = 'prepare', ...args] = process.argv.slice(2)
try {
  const rootDir = fileURLToPath(new URL('../', import.meta.url))
  await runProjectCommand(rootDir, config, command, args)
  if (command === 'prepare') {
    console.log('RDX documentation sources validated.')
  }
} catch (error) {
  console.error(
    `[RDX] ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
}
