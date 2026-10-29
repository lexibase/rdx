import { getRdxRobots } from '@lexibase/rdx-next/runtime'

import config from '@/rdx.config'

export default function robots() {
  return getRdxRobots(config)
}
