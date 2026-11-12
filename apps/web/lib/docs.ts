import { createRdxProject } from '@lexibase/rdx-core'

import config from '../rdx.config'

import { createDocumentation } from './documentation'

export function getProject(rootDir = process.cwd()) {
  return createRdxProject(config, { rootDir })
}

export async function getDocumentation(rootDir = process.cwd()) {
  return createDocumentation(await getProject(rootDir))
}

export async function docsIndexer(version: string) {
  return (await getDocumentation()).categories(version)
}
