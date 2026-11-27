import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const agentRulesStart = '<!-- BEGIN:rdx-agent-rules -->'
export const agentRulesEnd = '<!-- END:rdx-agent-rules -->'

/** Prefer the stable install path agents can open over a package-manager store path. */
async function docsLocation(projectRoot, docsDir) {
  const installed = path.join(
    projectRoot,
    'node_modules',
    '@lexibase',
    'rdx',
    'dist',
    'docs'
  )
  try {
    await access(path.join(installed, 'index.md'))
    return 'node_modules/@lexibase/rdx/dist/docs'
  } catch {
    return path.relative(projectRoot, docsDir).split(path.sep).join('/')
  }
}

export function formatAgentRules({ version, docs }) {
  // Formatted as Prettier formats Markdown, so formatters and RDX agree.
  return [
    agentRulesStart,
    '',
    '# This project uses RDX',
    '',
    `This documentation project uses RDX ${version}. Its configuration, Markdown components and commands may differ from what you know. Before changing \`rdx.config.ts\`, pages or customizations, read the relevant guide in \`${docs}/\`; \`${docs}/index.md\` lists every page.`,
    '',
    'Run the `check` script (`rdx check`) after editing documentation.',
    agentRulesEnd,
  ].join('\n')
}

/**
 * Refresh the managed block of AGENTS.md. Projects opt out by deleting the file
 * or the markers; text outside the markers belongs to the project.
 */
export async function refreshAgentRules(projectRoot, { version, docsDir }) {
  const file = path.join(projectRoot, 'AGENTS.md')
  let current
  try {
    current = await readFile(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
  const start = current.indexOf(agentRulesStart)
  const end = current.indexOf(agentRulesEnd, start)
  if (start === -1 || end === -1) return false
  const newline = current.includes('\r\n') ? '\r\n' : '\n'
  const block = formatAgentRules({
    version,
    docs: await docsLocation(projectRoot, docsDir),
  }).replaceAll('\n', newline)
  const next =
    current.slice(0, start) + block + current.slice(end + agentRulesEnd.length)
  if (next === current) return false
  await writeFile(file, next)
  return true
}
