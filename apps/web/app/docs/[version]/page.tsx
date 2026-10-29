import { notFound, redirect, permanentRedirect } from 'next/navigation'

import { getDocumentation } from '@/lib/docs'

export default async function VersionRoot({
  params,
}: {
  params: Promise<{ version: string }>
}) {
  const { version } = await params
  const documentation = await getDocumentation()
  const canonical = documentation.canonicalVersion(version)
  if (canonical !== version) permanentRedirect(`/docs/${canonical}`)
  const categories = documentation.categories(version)
  const firstHref = categories.flatMap((c) => c.links)[0]?.href

  if (firstHref) {
    redirect(firstHref)
  }

  notFound()
}
