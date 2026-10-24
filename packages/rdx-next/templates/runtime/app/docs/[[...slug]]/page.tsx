import type { Metadata } from 'next'
import {
  DocsPage,
  getDocumentMetadata,
  getProjectDocsPaths,
} from '@lexibase/rdx-next/runtime'

import { getProject } from '../../../rdx-project'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  return getDocumentMetadata({ project: await getProject(), slug })
}

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
