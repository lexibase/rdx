import { getDocumentation } from '@/lib/docs'

export const dynamic = 'force-static'

export async function GET() {
  return (await getDocumentation()).llmIndex()
}
