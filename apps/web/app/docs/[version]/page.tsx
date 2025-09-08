import { redirect } from 'next/navigation'

import { getAllDocs } from '@/lib/docs'

export default async function VersionRoot({
  params,
}: {
  params: Promise<{ version: string }>
}) {
  const { version } = await params
  const categories = getAllDocs(version)
  const firstHref = categories.flatMap((c) => c.links)[0]?.href

  if (firstHref) {
    redirect(firstHref)
  }

  redirect(`/404`)
}
