import { redirect } from 'next/navigation'

import { getDocumentation } from '@/lib/docs'

export default async function DocsRoot() {
  const { editions } = await getDocumentation()
  const current =
    editions.find((edition) => edition.kind === 'version') ?? editions[0]!
  redirect(current.href)
}
