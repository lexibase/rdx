import type { Metadata } from 'next'
import type { RdxProject, RDXConfig } from '@lexibase/rdx-types'
import { resolveDocsRoute } from '@lexibase/rdx-core'
import { notFound } from 'next/navigation'

/** Read metadata from the same content source and index used by the page. */
export function getDocumentMetadata({
  project,
  slug,
}: {
  project: RdxProject
  slug?: string[]
}): Metadata {
  const route = resolveDocsRoute(project, slug)
  // An empty documentation tree renders the setup page with site metadata.
  if (!route.slug) return {}
  if (!route.document) notFound()
  const page = route.categories
    .flatMap((category) => category.pages)
    .find((page) => page.slug === route.slug)!
  return {
    title: page.title,
    description: page.description || project.config.description,
  }
}

/** Translate the shared configuration through Next's native Metadata API. */
export function getRdxMetadata(config: RDXConfig): Metadata {
  const { metadataBase, ...metadata } = config.metadata
  delete metadata.since
  const name = metadata.applicationName
  return {
    title: { default: name, template: `%s | ${name}` },
    description: config.description,
    ...metadata,
    ...(metadataBase ? { metadataBase: new URL(metadataBase) } : {}),
    ...(metadata.openGraph
      ? {
          openGraph: {
            title: name,
            description: config.description,
            ...metadata.openGraph,
          },
        }
      : {}),
    ...(metadata.twitter
      ? {
          twitter: {
            title: name,
            description: config.description,
            ...metadata.twitter,
          },
        }
      : {}),
  }
}
