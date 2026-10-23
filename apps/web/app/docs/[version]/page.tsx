import { notFound, redirect } from 'next/navigation'

import { docsIndexer } from '@/lib/docs'

export default async function VersionRoot({
  params,
}: {
  params: Promise<{ version: string }>
}) {
  const { version } = await params
  const categories = await docsIndexer(version)
  const firstHref = categories.flatMap((c) => c.links)[0]?.href

  if (firstHref) {
    redirect(firstHref)
  }

  notFound()
}
