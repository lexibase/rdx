/** Run the adapter CLI with an optional prepared runtime template directory. */
export function runRdxCli(options?: {
  templateDir?: string
  /** Refresh the managed RDX block of the project's AGENTS.md. */
  agentRules?: { version: string; docsDir: string }
}): Promise<void>
