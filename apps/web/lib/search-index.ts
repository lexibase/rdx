import { buildSearchIndex } from '@lexibase/rdx-core/search'

import config from '@/rdx.config'
import versions from '@/versions.json'

import { documentation } from './docs'

export function searchVersions() {
  return config.search
    ? ['canary', ...versions.active, ...versions.archived].map((source) => ({
        source,
      }))
    : []
}

export function showcaseSearchResponse(source: string) {
  if (
    !config.search ||
    !searchVersions().some((entry) => entry.source === source)
  )
    return new Response(null, { status: 404 })
  const routes = new Map(
    documentation.pages(source).map((page) => [page.sourcePath, page.slug])
  )
  return Response.json(
    buildSearchIndex(
      documentation.index(source).flatMap((category) =>
        category.pages.map((page) => {
          const document = documentation.document(source, page.slug)!
          const slug = routes.get(page.sourcePath)!
          return {
            title: page.title,
            description: page.description,
            category: category.title,
            href: `/docs/${encodeURIComponent(source)}/${slug.split('/').map(encodeURIComponent).join('/')}`,
            content: document.content,
          }
        })
      )
    )
  )
}
