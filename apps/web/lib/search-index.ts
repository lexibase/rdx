import { buildSearchIndex } from '@lexibase/rdx-core/search'

import config from '@/rdx.config'

import { getDocumentation } from './docs'

export async function searchVersions() {
  return config.search
    ? (await getDocumentation()).editions.map((edition) => ({
        source: edition.id,
      }))
    : []
}

export async function showcaseSearchResponse(source: string) {
  if (
    !config.search ||
    !(await searchVersions()).some((entry) => entry.source === source)
  )
    return new Response(null, { status: 404 })
  const documentation = await getDocumentation()
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
