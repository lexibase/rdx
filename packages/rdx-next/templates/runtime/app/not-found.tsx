import { NotFoundPage } from '@lexibase/rdx-next/runtime'
import { getProject } from '../rdx-project'

export default async function NotFound() {
  const project = await getProject()
  return <NotFoundPage project={project} />
}
