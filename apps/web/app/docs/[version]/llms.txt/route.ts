import { getDocumentation } from '@/lib/docs'

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  return (await getDocumentation())
    .llmEditions()
    .map((version) => ({ version }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ version: string }> }
) {
  return (await getDocumentation()).editionLlmIndex((await params).version)
}
