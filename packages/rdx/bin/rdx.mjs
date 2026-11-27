#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { runRdxCli } from '@lexibase/rdx-next/cli'

const { version } = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
)

await runRdxCli({
  templateDir: fileURLToPath(new URL('../dist/templates/', import.meta.url)),
  agentRules: {
    version,
    docsDir: fileURLToPath(new URL('../dist/docs/', import.meta.url)),
  },
})
