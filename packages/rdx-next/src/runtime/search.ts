import { getDocsIndex, getDocument, getSourceOptions } from '@lexibase/rdx-core'
import { buildSearchIndex } from '@lexibase/rdx-core/search'
import type { RdxProject } from '@lexibase/rdx-types'

export function getSearchSources(project: RdxProject) {
  return project.config.search
    ? project.sources.map((source) => ({ source: source.routePrefix || '_' }))
    : []
}

export function getSearchResponse(project: RdxProject, key: string) {
  if (!project.config.search) return new Response(null, { status: 404 })
  const source = project.sources.find(
    (entry) => (entry.routePrefix || '_') === key
  )
  if (!source) return new Response(null, { status: 404 })
  const options = getSourceOptions(project, source)
  const documents = getDocsIndex(options).flatMap((category) =>
    category.pages.map((page) => ({
      title: page.title,
      description: page.description,
      category: category.title,
      href: [
        '/docs',
        source.routePrefix,
        page.slug.split('/').map(encodeURIComponent).join('/'),
      ]
        .filter(Boolean)
        .join('/'),
      content: getDocument(page.slug, options)?.content ?? '',
    }))
  )
  return Response.json(buildSearchIndex(documents))
}
