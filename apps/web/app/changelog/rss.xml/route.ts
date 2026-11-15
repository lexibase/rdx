import { getChangelogFeedResponse } from '@lexibase/rdx-next/runtime'

import { visibleChangelogVersions } from '@/lib/changelog-publication.mjs'
import { getProject } from '@/lib/docs'

export async function GET(request: Request) {
  return getChangelogFeedResponse(
    await getProject(),
    request,
    visibleChangelogVersions()
  )
}
