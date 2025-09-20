import { docsIndexer } from '@rdx/core'
import { redirect } from 'next/navigation'

export default async function VersionRoot({
  params,
}: {
  params: Promise<{ version: string }>
}) {
  const { version } = await params
  const categories = docsIndexer(version)
  const firstHref = categories.flatMap((c) => c.links)[0]?.href

  if (firstHref) {
    redirect(firstHref)
  }

  redirect(`/404`)
}
