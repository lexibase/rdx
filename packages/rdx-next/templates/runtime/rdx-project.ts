import path from 'node:path'

import { createRdxProject } from '@lexibase/rdx-next/runtime'

import config from '../rdx.config'

export function getProject() {
  // The CLI starts at the project root; serverless Next workers start in .rdx.
  // Keep project-owned content outside the generated application in both cases.
  const cwd = process.cwd()
  const rootDir = path.basename(cwd) === '.rdx' ? path.dirname(cwd) : cwd
  return createRdxProject(config, { rootDir })
}
