import { HomePage } from '@lexibase/rdx-next/runtime'

import { getProject } from '../rdx-project'

export default async function Home() {
  return <HomePage project={await getProject()} />
}
