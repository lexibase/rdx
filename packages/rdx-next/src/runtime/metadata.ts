import type { Metadata } from 'next'
import type { RdxDocPage, RdxProject, RDXConfig } from '@lexibase/rdx-types'
import {
  resolveDocsRoute,
  getLocalizedProject,
  getDocsHref,
  isFallbackPage,
  getDocument,
  getSourceOptions,
} from '@lexibase/rdx-core'
import { notFound } from 'next/navigation'

import { getSourceRobots } from './indexing'

/** Read metadata from the same content source and index used by the page. */
export function getDocumentMetadata({
  project,
  slug,
}: {
  project: RdxProject
  slug?: string[]
}): Metadata {
  if (project.localization && !project.locale)
    return { robots: { index: false, follow: true } }
  const route = resolveDocsRoute(project, slug)
  // The page owns the redirect. Throwing it here too can duplicate Location headers.
  if (route.source.redirectTo !== undefined)
    return { robots: getSourceRobots(project, route.source) }
  // An empty documentation tree renders the setup page with site metadata.
  if (!route.slug) return { robots: { index: false, follow: true } }
  if (!route.document) notFound()
  const page = route.categories
    .flatMap((category) => category.pages)
    .find((page) => page.slug === route.slug)!
  const fallback = isFallbackPage(project, route.source, page.sourcePath)
  const primary = project.localization?.locales.find(
    (locale) => locale.code === project.localization!.defaultLocale
  )
  const canonicalProject = fallback
    ? getLocalizedProject(project, primary!.path)
    : project
  const base = project.config.metadata.metadataBase
  const languages =
    project.localization && base
      ? Object.fromEntries(
          project.localization.locales.flatMap((locale) => {
            const view = getLocalizedProject(project, locale.path)
            const source = view.sources.find(
              (entry) => entry.id === route.source.id
            )!
            return getDocument(page.slug, {
              docsDir: getSourceOptions(view, source).docsDir,
            })
              ? [
                  [
                    locale.code,
                    new URL(getDocsHref(view, source, page.slug), base).href,
                  ],
                ]
              : []
          })
        )
      : undefined
  return {
    ...getPageMetadata(project.config, page),
    robots: fallback
      ? { index: false, follow: true }
      : getSourceRobots(project, route.source),
    ...(project.localization && base
      ? {
          alternates: {
            canonical: new URL(
              getDocsHref(
                canonicalProject,
                canonicalProject.sources.find(
                  (entry) => entry.id === route.source.id
                ),
                page.slug
              ),
              base
            ).href,
            ...(fallback ? {} : { languages }),
          },
        }
      : {}),
  }
}

/** Keep page previews in sync while retaining the site's social images and options. */
export function getPageMetadata(
  config: RDXConfig,
  page: Pick<RdxDocPage, 'title' | 'description'>
): Metadata {
  const title = page.title
  const description = page.description || config.description
  return {
    title,
    description,
    openGraph: { ...config.metadata.openGraph, title, description },
    twitter: { ...config.metadata.twitter, title, description },
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
    robots: { index: true, follow: true },
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
