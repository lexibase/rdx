import { NotFoundPage } from '@lexibase/rdx-next/runtime'
import { getProject } from '../rdx-project'

export default async function NotFound() {
  const { config } = await getProject()
  return <NotFoundPage config={config} />
}
