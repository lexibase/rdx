import {
  getDocsIndex,
  getDocument,
  getSourceOptions,
  getDocsHref,
} from '@lexibase/rdx-core'
import { buildSearchIndex } from '@lexibase/rdx-core/search'
import type { RdxProject } from '@lexibase/rdx-types'

export function getSearchSources(project: RdxProject) {
  return project.config.search
    ? project.sources
        .filter((source) => source.redirectTo === undefined)
        .map((source) => ({ source: source.routePrefix || '_' }))
    : []
}

export function getSearchResponse(project: RdxProject, key: string) {
  const headers = { 'X-Robots-Tag': 'noindex, follow' }
  if (!project.config.search)
    return new Response(null, { status: 404, headers })
  const source = project.sources.find(
    (entry) =>
      entry.redirectTo === undefined && (entry.routePrefix || '_') === key
  )
  if (!source) return new Response(null, { status: 404, headers })
  // Index only authored translations, never fallback bodies from another language.
  const { docsDir } = getSourceOptions(project, source)
  const options = { docsDir }
  const documents = getDocsIndex(options).flatMap((category) =>
    category.pages.map((page) => ({
      title: page.title,
      description: page.description,
      category: category.title,
      href: getDocsHref(project, source, page.slug),
      content: getDocument(page.slug, options)?.content ?? '',
    }))
  )
  return Response.json(buildSearchIndex(documents), { headers })
}
