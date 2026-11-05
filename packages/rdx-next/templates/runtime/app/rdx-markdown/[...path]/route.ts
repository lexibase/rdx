import {
  getMarkdownPaths,
  getMarkdownResponse,
} from '@lexibase/rdx-next/runtime'
import { getProject } from '../../../rdx-project'

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  return getMarkdownPaths(await getProject())
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return getMarkdownResponse(await getProject(), (await params).path)
}
