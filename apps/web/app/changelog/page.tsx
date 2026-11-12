import { ChangelogPage } from '@lexibase/rdx-next/runtime'

import { getProject } from '@/lib/docs'

export const metadata = {
  title: 'Changelog',
  description: 'New features, fixes, and improvements in each RDX release.',
}

export default async function Page() {
  return <ChangelogPage project={await getProject()} showHeader={false} />
}
