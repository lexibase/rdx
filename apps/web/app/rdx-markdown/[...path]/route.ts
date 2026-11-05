import { getDocumentation } from '@/lib/docs'

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  return (await getDocumentation()).markdownPaths()
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return (await getDocumentation()).markdownResponse((await params).path)
}
