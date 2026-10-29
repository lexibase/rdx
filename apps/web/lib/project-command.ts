import { createRdxProject } from '@lexibase/rdx-core'
import type { RDXConfig } from '@lexibase/rdx-types'

/** Native Next development uses the same registered plugin commands as rdx. */
export async function runProjectCommand(
  rootDir: string,
  config: RDXConfig,
  command: string,
  args: string[] = []
) {
  if (['prepare', 'check'].includes(command) && args.length)
    throw new Error(`Usage: docs:${command}`)
  const project = await createRdxProject(config, { rootDir, command })
  if (command === 'check') {
    const [
      { checkDocumentation, formatDocumentationCheck },
      { createDocumentation },
    ] = await Promise.all([
      import('@lexibase/rdx-core/check'),
      import('./documentation'),
    ])
    const report = checkDocumentation(
      project,
      createDocumentation(project).checkOptions()
    )
    const output = formatDocumentationCheck(report)
    if (report.diagnostics.length) throw new Error(output)
    console.log(output)
    return project
  }
  if (command !== 'prepare') {
    const entry = project.commands.find((entry) => entry.name === command)
    if (!entry) throw new Error(`Unknown documentation command: ${command}`)
    await entry.run({ rootDir, command, config: project.config, args })
  }
  return project
}
