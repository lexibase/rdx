import { createRdxProject } from '@lexibase/rdx-next/runtime'

import config from '../rdx.config'

export function getProject() {
  return createRdxProject(config)
}
