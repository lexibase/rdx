import path from 'node:path'

import { getMessages, formatMessage } from '@lexibase/rdx-ui/lib/i18n'
import {
  getDocument,
  getDocsIndex,
  getRelatedDocumentLinks,
  getSourceOptions,
} from '@lexibase/rdx-core'
import { getEditPageHref } from '@lexibase/rdx-core/config'
import type { RdxDocument, RdxProject } from '@lexibase/rdx-types'
import type { DocumentationCheckOptions } from '@lexibase/rdx-core/check'
import {
  getSourceRobots,
  getRdxSitemap,
  getLlmIndexResponse,
  getMarkdownPaths,
  getChangelogMarkdownResponse,
  getDocumentMarkdownResponse,
  getDocumentLastUpdated,
  parseMarkdownPath,
  markdownNotFound,
} from '@lexibase/rdx-next/runtime'

import {
  canaryCategoryAliases,
  officialDocsRoot,
  officialDocumentHrefs,
  shortDocumentRoutes,
} from './documentation-routes.mjs'

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
    return shortDocumentRoutes(entries)
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
        sourceRoute: officialDocsRoot,
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
          return officialDocumentHrefs(
            officialDocsRoot(entry),
            page.slug,
            routes.get(version)!.get(page.sourcePath)!
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
    relatedLinks(version: string, document: RdxDocument) {
      if (!document.frontmatter.related) return []
      const entries = pages(version)
      const routes = new Map(
        routePages(version, entries).map((page) => [page.sourcePath, page.slug])
      )
      return getRelatedDocumentLinks(
        document.frontmatter.related,
        {
          sourceRoot: source(version)!.docsDir,
          sourcePath: document.sourcePath,
          documents: entries,
        },
        document.slug,
        (page) =>
          `/docs/${version}/${routes.get(page.sourcePath)!.split('/').map(encodeURIComponent).join('/')}`
      )
    },
    lastUpdated(version: string, sourcePath: string) {
      const entry = contentSource(version)
      return entry
        ? getDocumentLastUpdated(project, entry, sourcePath)
        : undefined
    },
    index,
    pages: routePages,
    document,
    categories,
    editions,
    canonicalVersion,
  }
}
