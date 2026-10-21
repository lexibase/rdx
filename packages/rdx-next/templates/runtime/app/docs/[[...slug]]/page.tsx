import { DocsPage, getProjectDocsPaths } from '@lexibase/rdx-next/runtime'

import { getProject } from '../../../rdx-project'

export async function generateStaticParams() {
  return getProjectDocsPaths(await getProject()).map((slug) => ({
    slug: slug.split('/'),
  }))
}

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params

  return <DocsPage slug={slug} project={await getProject()} />
}
