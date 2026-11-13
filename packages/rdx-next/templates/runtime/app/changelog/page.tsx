import { ChangelogPage } from '@lexibase/rdx-next/runtime'

import { getProject } from '../../rdx-project'

export const metadata = { title: 'Changelog' }

export default async function Page() {
  return <ChangelogPage project={await getProject()} />
}
