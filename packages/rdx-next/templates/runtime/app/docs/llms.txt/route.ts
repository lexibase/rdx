import { getLlmIndexResponse } from '@lexibase/rdx-next/runtime'
import { getProject } from '../../../rdx-project'

export const dynamic = 'force-static'

export async function GET() {
  return getLlmIndexResponse(await getProject())
}
