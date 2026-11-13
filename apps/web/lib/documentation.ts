import path from 'node:path'

import { getMessages, formatMessage } from '@lexibase/rdx-ui/lib/i18n'
import { getDocument, getDocsIndex, getSourceOptions } from '@lexibase/rdx-core'
import { getEditPageHref } from '@lexibase/rdx-core/config'
import type { RdxProject } from '@lexibase/rdx-types'
import type { DocumentationCheckOptions } from '@lexibase/rdx-core/check'
import {
  getSourceRobots,
  getRdxSitemap,
  getLlmIndexResponse,
  getMarkdownPaths,
  getChangelogMarkdownResponse,
  getDocumentMarkdownResponse,
  parseMarkdownPath,
  markdownNotFound,
} from '@lexibase/rdx-next/runtime'

const canaryCategoryAliases = new Map([
  ['cat-01', 'documentation'],
  ['cat-02', 'getting-started'],
  ['cat-03', 'writing-documentation'],
  ['cat-04', 'features'],
  ['cat-05', 'guides'],
])

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
  function contentSource(version: string) {
    return project.sources.find((entry) =>
      version === 'canary'
        ? entry.id === 'current'
        : entry.id !== 'current' && entry.routePrefix === version
    )
  }

  function source(version: string) {
    const entry = contentSource(version)
    return entry ? getSourceOptions(project, entry) : null
  }

  function index(version: string) {
    const options = source(version)
    return options ? getDocsIndex(options) : []
  }

  function pages(version: string) {
    return index(version).flatMap((category) => category.pages)
  }

  function routePages(version: string, entries = pages(version)) {
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
    const [category, ...segments] = slug.split('/')
    const renamed =
      version === 'canary' && segments.length > 0
        ? canaryCategoryAliases.get(category!)
        : undefined
    const fullSlug = renamed ? [renamed, ...segments].join('/') : slug
    const exact = entries.find((page) => page.slug === fullSlug)
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
        label: page.navTitle ?? page.title,
        ...(page.highlighting ? { highlighting: page.highlighting } : {}),
        description: page.description,
        href: `/docs/${canonicalVersion(version)}/${routes.get(page.sourcePath)}`,
      })),
    }))
  }

  function documentPaths() {
    const routes = new Map<string, Map<string, string>>()
    return (
      entry: RdxProject['sources'][number],
      page: { sourcePath: string }
    ) => {
      const version = entry.id === 'current' ? 'canary' : entry.routePrefix
      if (!routes.has(version)) {
        routes.set(
          version,
          new Map(
            routePages(version).map((page) => [page.sourcePath, page.slug])
          )
        )
      }
      const slug = routes.get(version)!.get(page.sourcePath)!
      return `/docs/${version}/${slug.split('/').map(encodeURIComponent).join('/')}`
    }
  }

  return {
    syntaxGrammars: project.syntaxGrammars,
    syntaxThemes: project.config.syntaxHighlighting?.themes,
    checkOptions(): DocumentationCheckOptions {
      const published =
        editions.find((edition) => edition.kind === 'version') ?? editions[0]!
      const routes = new Map<string, Map<string, string>>()
      return {
        sourceRoute: (entry) =>
          `/docs/${entry.id === 'current' ? 'canary' : entry.routePrefix}`,
        documentRoutes(entry, page, entries) {
          const version = entry.id === 'current' ? 'canary' : entry.routePrefix
          if (!routes.has(version))
            routes.set(
              version,
              new Map(
                routePages(version, [...entries]).map((page) => [
                  page.sourcePath,
                  page.slug,
                ])
              )
            )
          const slugs = [routes.get(version)!.get(page.sourcePath)!, page.slug]
          if (version === 'canary') {
            const [category, ...segments] = page.slug.split('/')
            for (const [alias, current] of canaryCategoryAliases) {
              if (category === current && segments.length)
                slugs.push([alias, ...segments].join('/'))
            }
          }
          return slugs.map(
            (slug) =>
              `/docs/${version}/${slug.split('/').map(encodeURIComponent).join('/')}`
          )
        },
        redirects: { '/docs': published.href },
      }
    },
    robots(version: string) {
      const entry = contentSource(version)
      return entry
        ? getSourceRobots(project, entry)
        : { index: false, follow: true }
    },
    sitemap() {
      return getRdxSitemap(project, { documentPath: documentPaths() })
    },
    llmIndex() {
      return getLlmIndexResponse(project, documentPaths())
    },
    markdownPaths() {
      return getMarkdownPaths(project, documentPaths())
    },
    markdownResponse(path: string[]) {
      const segments = parseMarkdownPath(path)
      if (segments?.[0] === 'changelog')
        return getChangelogMarkdownResponse(project, segments.slice(1))
      if (!segments || segments[0] !== 'docs' || segments.length < 3)
        return markdownNotFound()
      const [, version, ...slug] = segments
      const entry = contentSource(version!)
      if (!entry || entry.redirectTo !== undefined) return markdownNotFound()
      const canonical = routePages(version!).find(
        (page) => page.slug === slug.join('/')
      )
      if (!canonical) return markdownNotFound()
      const original = document(version!, canonical.slug)
      return original
        ? getDocumentMarkdownResponse(
            project,
            entry,
            original.slug,
            documentPaths()
          )
        : markdownNotFound()
    },
    source,
    editPageHref(version: string, sourcePath: string) {
      return getEditPageHref(project, contentSource(version), sourcePath)
    },
    index,
    pages: routePages,
    document,
    categories,
    editions,
    canonicalVersion,
  }
}
