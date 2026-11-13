import { getChangelogFeedResponse } from '@lexibase/rdx-next/runtime'

import { getProject } from '@/lib/docs'

export async function GET(request: Request) {
  return getChangelogFeedResponse(await getProject(), request)
}
