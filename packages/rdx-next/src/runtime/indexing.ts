import type { MetadataRoute } from 'next'
import type {
  RdxContentSource,
  RdxDocPage,
  RdxProject,
  RDXConfig,
} from '@lexibase/rdx-types'
import { getDocsIndex, getSourceOptions } from '@lexibase/rdx-core'

/** Published editions replace live development content in search results. */
export function getSourceRobots(project: RdxProject, source: RdxContentSource) {
  const published = project.sources.some(
    (entry) =>
      entry.id !== 'current' &&
      entry.redirectTo === undefined &&
      entry.badge !== 'Archived'
  )
  return {
    index:
      source.redirectTo === undefined &&
      source.badge !== 'Archived' &&
      (source.id !== 'current' || !published),
    follow: true,
  }
}

/** Use the configured public URL only; development hosts are never inferred. */
export function getRdxRobots(config: RDXConfig): MetadataRoute.Robots {
  return {
    // Do not disallow noindex pages: crawlers must read their HTML directive.
    rules: { userAgent: '*', allow: '/' },
    ...(config.metadata.metadataBase
      ? { sitemap: new URL('/sitemap.xml', config.metadata.metadataBase).href }
      : {}),
  }
}

/** Share the indexing policy while allowing host applications to map their URLs. */
export function getRdxSitemap(
  project: RdxProject,
  {
    documentPath = (source, page) =>
      [
        '/docs',
        source.routePrefix,
        page.slug.split('/').map(encodeURIComponent).join('/'),
      ]
        .filter(Boolean)
        .join('/'),
  }: {
    documentPath?: (source: RdxContentSource, page: RdxDocPage) => string
  } = {}
): MetadataRoute.Sitemap {
  const base = project.config.metadata.metadataBase
  if (!base) return []
  const urls = new Set<string>()
  if (project.config.homepage?.enabled) urls.add(new URL('/', base).href)
  for (const source of project.sources) {
    if (!getSourceRobots(project, source).index) continue
    for (const category of getDocsIndex(getSourceOptions(project, source))) {
      for (const page of category.pages) {
        urls.add(new URL(documentPath(source, page), base).href)
      }
    }
  }
  return [...urls].map((url) => ({ url }))
}
