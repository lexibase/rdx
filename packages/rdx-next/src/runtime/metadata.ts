import type { Metadata } from 'next'
import type { RdxDocPage, RdxProject, RDXConfig } from '@lexibase/rdx-types'
import {
  resolveDocsRoute,
  getLocalizedProject,
  getDocsHref,
  isFallbackPage,
  getDocument,
  getSourceOptions,
  withBasePath,
} from '@lexibase/rdx-core'
import { notFound } from 'next/navigation'

import { getSourceRobots } from './indexing'

function openGraphAssets(
  social: RDXConfig['metadata']['openGraph'],
  basePath?: string
) {
  if (!basePath || !social?.images) return social
  return {
    ...social,
    images: social.images.map((image) => ({
      ...image,
      url: withBasePath(image.url, basePath),
    })),
  }
}

function twitterAssets(
  social: RDXConfig['metadata']['twitter'],
  basePath?: string
) {
  if (!basePath || !social?.images) return social
  return {
    ...social,
    images: social.images.map((image) => withBasePath(image, basePath)),
  }
}

export function getHomepageMetadata({
  project,
  locale,
  translatedLocales,
  metadata,
}: {
  project: RdxProject
  locale?: string
  translatedLocales?: ReadonlySet<string>
  metadata?: unknown
}): Metadata {
  const { config, localization } = project
  if (!config.homepage?.enabled || (!localization && !config.basePath))
    return {}
  const selected = localization?.locales.find((entry) => entry.path === locale)
  if (locale && (!selected || selected.code === localization?.defaultLocale))
    return {}

  const base = config.metadata.metadataBase
  const primaryUrl = base
    ? new URL(withBasePath('/', config.basePath), base).href
    : undefined
  if (locale && !translatedLocales?.has(locale)) {
    // A legacy custom component can translate its own content using lang.
    if (config.homepage.component) return {}
    return {
      robots: { index: false, follow: true },
      ...(primaryUrl ? { alternates: { canonical: primaryUrl } } : {}),
    }
  }

  const url =
    base &&
    new URL(withBasePath(locale ? `/${locale}` : '/', config.basePath), base)
      .href
  const site = getRdxMetadata(config)
  const fields = metadata && typeof metadata === 'object' ? metadata : {}
  const title =
    'title' in fields && typeof fields.title === 'string'
      ? fields.title.trim()
      : ''
  const description =
    'description' in fields && typeof fields.description === 'string'
      ? fields.description.trim()
      : ''
  const defaults = {
    title: config.metadata.applicationName,
    description: config.description,
  }
  const social = {
    ...(title ? { title: { absolute: title } } : {}),
    ...(description ? { description } : {}),
  }
  return {
    ...social,
    ...(site.openGraph || title || description || (config.basePath && url)
      ? {
          openGraph: {
            ...defaults,
            ...site.openGraph,
            ...social,
            ...(url ? { url } : {}),
          },
        }
      : {}),
    ...(site.twitter || title || description
      ? { twitter: { ...defaults, ...site.twitter, ...social } }
      : {}),
    ...(base && url && primaryUrl
      ? {
          alternates: {
            canonical: url,
            ...(localization
              ? {
                  languages: {
                    [localization.defaultLocale]: primaryUrl,
                    'x-default': primaryUrl,
                    ...Object.fromEntries(
                      localization.locales
                        .filter((entry) => translatedLocales?.has(entry.path))
                        .map((entry) => [
                          entry.code,
                          new URL(
                            withBasePath(`/${entry.path}`, config.basePath),
                            base
                          ).href,
                        ])
                    ),
                  },
                }
              : {}),
          },
        }
      : {}),
  }
}

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
  const prefix = project.config.basePath
  const languages =
    project.localization && base
      ? Object.fromEntries(
          project.localization.locales.flatMap((locale) => {
            const view = getLocalizedProject(project, locale.path)
            const source = view.sources.find(
              (entry) => entry.id === route.source.id
            )!
            return !source.fallbackOnly &&
              getDocument(page.slug, {
                docsDir: getSourceOptions(view, source).docsDir,
              })
              ? [
                  [
                    locale.code,
                    new URL(
                      withBasePath(
                        getDocsHref(view, source, page.slug),
                        prefix
                      ),
                      base
                    ).href,
                  ],
                ]
              : []
          })
        )
      : undefined
  return {
    ...getPageMetadata(
      project.config,
      page,
      getDocsHref(project, route.source, page.slug)
    ),
    robots: fallback
      ? { index: false, follow: true }
      : getSourceRobots(project, route.source),
    ...((project.localization || prefix) && base
      ? {
          alternates: {
            canonical: new URL(
              withBasePath(
                getDocsHref(
                  canonicalProject,
                  canonicalProject.sources.find(
                    (entry) => entry.id === route.source.id
                  ),
                  page.slug
                ),
                prefix
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
  page: Pick<RdxDocPage, 'title' | 'description'>,
  href?: string
): Metadata {
  const title = page.title
  const description = page.description || config.description
  const url =
    config.basePath && config.metadata.metadataBase && href
      ? new URL(
          withBasePath(href, config.basePath),
          config.metadata.metadataBase
        ).href
      : undefined
  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      ...openGraphAssets(config.metadata.openGraph, config.basePath),
      title,
      description,
      ...(url ? { url } : {}),
    },
    twitter: {
      ...twitterAssets(config.metadata.twitter, config.basePath),
      title,
      description,
    },
  }
}

/** Translate the shared configuration through Next's native Metadata API. */
export function getRdxMetadata(config: RDXConfig): Metadata {
  const { metadataBase, ...metadata } = config.metadata
  delete metadata.since
  const name = metadata.applicationName
  const prefix = config.basePath
  const asset = (value?: string) =>
    value === undefined ? undefined : withBasePath(value, prefix)
  const icons = metadata.icons
  return {
    title: { default: name, template: `%s | ${name}` },
    description: config.description,
    ...metadata,
    ...(prefix && icons
      ? {
          icons: {
            icon: Array.isArray(icons.icon)
              ? icons.icon.map((icon) => ({
                  ...icon,
                  url: withBasePath(icon.url, prefix),
                }))
              : asset(icons.icon),
            shortcut: asset(icons.shortcut),
            apple: asset(icons.apple),
          },
        }
      : {}),
    ...(prefix && metadata.manifest
      ? { manifest: asset(metadata.manifest) }
      : {}),
    robots: { index: true, follow: true },
    ...(metadataBase ? { metadataBase: new URL(metadataBase) } : {}),
    ...(metadata.openGraph
      ? {
          openGraph: {
            title: name,
            description: config.description,
            ...openGraphAssets(metadata.openGraph, prefix),
          },
        }
      : {}),
    ...(metadata.twitter
      ? {
          twitter: {
            title: name,
            description: config.description,
            ...twitterAssets(metadata.twitter, prefix),
          },
        }
      : {}),
  }
}
