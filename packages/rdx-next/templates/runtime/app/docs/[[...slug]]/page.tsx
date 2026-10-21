import { DocsPage, getDocsPaths } from '@lexibase/rdx-next/runtime'

export function generateStaticParams() {
  return getDocsPaths().map((slug) => ({ slug: slug.split('/') }))
}

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params

  return <DocsPage slug={slug} />
}
