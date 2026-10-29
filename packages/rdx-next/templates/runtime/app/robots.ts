import { getRdxRobots } from '@lexibase/rdx-next/runtime'
import { getProject } from '../rdx-project'

export default async function robots() {
  return getRdxRobots((await getProject()).config)
}
