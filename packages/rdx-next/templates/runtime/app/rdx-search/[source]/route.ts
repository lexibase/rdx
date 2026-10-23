import { getSearchResponse, getSearchSources } from '@lexibase/rdx-next/runtime'
import { getProject } from '../../../rdx-project'

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  return getSearchSources(await getProject())
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ source: string }> }
) {
  return getSearchResponse(await getProject(), (await params).source)
}
