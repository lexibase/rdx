#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { runRdxCli } from '@lexibase/rdx-next/cli'

await runRdxCli({
  templateDir: fileURLToPath(new URL('../dist/templates/', import.meta.url)),
})
