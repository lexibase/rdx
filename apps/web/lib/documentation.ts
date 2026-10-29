import path from 'node:path'

import { getMessages, formatMessage } from '@lexibase/rdx-ui/lib/i18n'
import { getDocument, getDocsIndex, getSourceOptions } from '@lexibase/rdx-core'
import type { RdxProject } from '@lexibase/rdx-types'

/** Only the official site's historical URL aliases differ from installed sites. */
export function createDocumentation(project: RdxProject) {
  const messages = getMessages(project.config.lang)
  const editions = project.sources
    .filter((source) => source.redirectTo === undefined)
    .map((source) => ({
      id: source.id === 'current' ? 'canary' : source.routePrefix,
      label:
        source.id === 'current'
          ? 'Canary'
          : formatMessage(messages.version, { version: source.label }),
      kind:
        source.id === 'current'
          ? ('live' as const)
          : source.badge === 'Archived'
            ? ('archived' as const)
            : ('version' as const),
      href: `/docs/${source.id === 'current' ? 'canary' : source.routePrefix}`,
    }))
  function canonicalVersion(version: string) {
    return (
      project.sources.find((entry) => entry.routePrefix === version)
        ?.redirectTo ?? version
    )
  }
  function source(version: string) {
    const entry = project.sources.find((entry) =>
      version === 'canary'
        ? entry.id === 'current'
        : entry.id !== 'current' && entry.routePrefix === version
    )
    return entry ? getSourceOptions(project, entry) : null
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
        href: `/docs/${canonicalVersion(version)}/${routes.get(page.sourcePath)}`,
      })),
    }))
  }

  return {
    source,
    index,
    pages: routePages,
    document,
    categories,
    editions,
    canonicalVersion,
  }
}
