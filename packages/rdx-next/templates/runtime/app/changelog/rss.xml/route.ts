import { getChangelogFeedResponse } from '@lexibase/rdx-next/runtime'

import { getProject } from '../../../rdx-project'

export async function GET(request: Request) {
  return getChangelogFeedResponse(await getProject(), request)
}
