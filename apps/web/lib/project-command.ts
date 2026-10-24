import { createRdxProject } from '@lexibase/rdx-core'
import type { RDXConfig } from '@lexibase/rdx-types'

/** Native Next development uses the same registered plugin commands as rdx. */
export async function runProjectCommand(
  rootDir: string,
  config: RDXConfig,
  command: string,
  args: string[] = []
) {
  if (command === 'prepare' && args.length)
    throw new Error('Usage: docs:prepare')
  const project = await createRdxProject(config, { rootDir, command })
  if (command !== 'prepare') {
    const entry = project.commands.find((entry) => entry.name === command)
    if (!entry) throw new Error(`Unknown documentation command: ${command}`)
    await entry.run({ rootDir, command, config: project.config, args })
  }
  return project
}
