import path from 'node:path'

import { getDocument, getDocsIndex } from '@lexibase/rdx-core'

type Versions = { active: string[]; archived: string[] }

/** The showcase keeps its historical storage and URLs, not its own indexer. */
export function createDocumentation(rootDir: string, versions: Versions) {
  function source(version: string) {
    const folder =
      version === 'canary'
        ? '(canary)'
        : versions.active.includes(version)
          ? '(versioned)'
          : versions.archived.includes(version)
            ? '(archived)'
            : null
    if (!folder) return null
    return {
      docsDir: path.join(
        rootDir,
        'app/docs',
        folder,
        version === 'canary' ? '' : `version-${version}`
      ),
    }
  }

  function index(version: string) {
    const options = source(version)
    return options ? getDocsIndex(options) : []
  }

  function pages(version: string) {
    return index(version).flatMap((category) => category.pages)
  }

  function routePages(version: string) {
    const entries = pages(version)
    const counts = new Map<string, number>()
    for (const page of entries) {
      const name = path.posix.basename(page.slug)
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return entries.map((page) => {
      const name = path.posix.basename(page.slug)
      // Existing short URLs remain stable; duplicate names use the full path.
      return { ...page, slug: counts.get(name) === 1 ? name : page.slug }
    })
  }

  function document(version: string, slug: string) {
    const options = source(version)
    if (!options) return null
    const entries = pages(version)
    const exact = entries.find((page) => page.slug === slug)
    const matches = entries.filter(
      (page) => path.posix.basename(page.slug) === slug
    )
    const page = exact ?? (matches.length === 1 ? matches[0] : undefined)
    return page ? getDocument(page.slug, options) : null
  }

  function categories(version: string) {
    const routes = new Map(
      routePages(version).map((page) => [page.sourcePath, page.slug])
    )
    return index(version).map((category) => ({
      title: category.title,
      links: category.pages.map((page) => ({
        label: page.title,
        description: page.description,
        href: `/docs/${version}/${routes.get(page.sourcePath)}`,
      })),
    }))
  }

  return { source, index, pages: routePages, document, categories }
}
