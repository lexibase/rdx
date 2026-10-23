import { searchVersions, showcaseSearchResponse } from '@/lib/search-index'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return searchVersions()
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ source: string }> }
) {
  return showcaseSearchResponse((await params).source)
}
