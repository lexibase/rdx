import {
  getContentSources,
  getDocsHref,
  getDocsIndex,
  getDocument,
  getLocalizedProject,
  getSourceOptions,
  isFallbackPage,
} from '@lexibase/rdx-core'
import { exportMarkdownBody } from '@lexibase/rdx-core/mdx'
import {
  createDocumentDateReader,
  getSnapshotDocumentDate,
} from '@lexibase/rdx-core/config'
import type {
  RdxContentSource,
  RdxDocPage,
  RdxProject,
} from '@lexibase/rdx-types'

type DocumentPath = (
  source: RdxContentSource,
  page: Pick<RdxDocPage, 'slug' | 'sourcePath'>
) => string

function publicUrl(project: RdxProject, path: string) {
  const base = project.config.metadata.metadataBase
  return base ? new URL(path, base).href : path
}

function indexPath(project: RdxProject) {
  return `${project.locale ? `/${project.locale.path}` : ''}/docs/llms.txt`
}

function defaultLocale(project: RdxProject) {
  const locale = project.localization?.locales.find(
    (entry) => entry.code === project.localization!.defaultLocale
  )
  return !project.locale && locale
    ? getLocalizedProject(project, locale.path)
    : project
}

function text(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_[\]<>]/g, '\\$&')
}

export function getMarkdownHref(htmlPath: string) {
  return `/rdx-markdown${htmlPath}.md`
}

function response(body: string | null, type: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': `${type}; charset=utf-8`,
      'X-Robots-Tag': 'noindex, follow',
    },
  })
}

export function getLlmIndexResponse(
  project: RdxProject,
  documentPath?: DocumentPath
) {
  project = defaultLocale(project)
  const source =
    project.sources.find(
      (entry) =>
        entry.id !== 'current' &&
        entry.redirectTo === undefined &&
        entry.badge !== 'Archived'
    ) ?? project.sources[0]
  const { metadata, description } = project.config
  const lines = [`# ${text(metadata.applicationName)} Documentation`, '']
  if (description) lines.push(`> ${text(description)}`, '')
  if (source) {
    for (const category of getDocsIndex(getSourceOptions(project, source))) {
      const pages = category.pages.filter(
        (page) => !isFallbackPage(project, source, page.sourcePath)
      )
      if (!pages.length) continue
      lines.push(`## ${text(category.title)}`, '')
      for (const page of pages) {
        const href =
          documentPath?.(source, page) ??
          getDocsHref(project, source, page.slug)
        lines.push(
          `- [${text(page.title)}](<${publicUrl(project, getMarkdownHref(href))}>)${page.description ? `: ${text(page.description)}` : ''}`
        )
      }
      lines.push('')
    }
  }
  return response(lines.join('\n'), 'text/plain')
}

export function getMarkdownPaths(
  project: RdxProject,
  documentPath?: DocumentPath
) {
  const paths = new Set<string>()
  for (const source of getContentSources(project)) {
    if (source.redirectTo !== undefined) continue
    for (const category of getDocsIndex(getSourceOptions(project, source))) {
      for (const page of category.pages) {
        if (isFallbackPage(project, source, page.sourcePath)) continue
        const href =
          documentPath?.(source, page) ??
          getDocsHref(project, source, page.slug)
        paths.add(`${href.slice(1)}.md`)
      }
    }
  }
  return [...paths].map((path) => ({
    path: path.split('/').map(decodeURIComponent),
  }))
}

export function parseMarkdownPath(path: string[]) {
  const last = path.at(-1)
  return last?.endsWith('.md') && last.length > 3
    ? [...path.slice(0, -1), last.slice(0, -3)]
    : undefined
}

export function getMarkdownResponse(project: RdxProject, path: string[]) {
  const segments = parseMarkdownPath(path)
  if (!segments) return markdownNotFound()
  if (project.localization) {
    const locale = segments.shift()
    if (!project.localization.locales.some((entry) => entry.path === locale))
      return markdownNotFound()
    project = getLocalizedProject(project, locale!)
  }
  if (segments.shift() !== 'docs' || !segments.length) return markdownNotFound()
  const edition = project.sources.find(
    (source) => source.routePrefix && source.routePrefix === segments[0]
  )
  if (edition) segments.shift()
  return getDocumentMarkdownResponse(
    project,
    edition ?? project.sources[0],
    segments.join('/')
  )
}

export function markdownNotFound() {
  return response(null, 'text/markdown', 404)
}

export function getDocumentMarkdownResponse(
  project: RdxProject,
  source: RdxContentSource | undefined,
  slug: string,
  documentPath?: DocumentPath
) {
  if (!source || !slug || source.redirectTo !== undefined)
    return markdownNotFound()
  const options = getSourceOptions(project, source)
  const document = getDocument(slug, options)
  if (!document || isFallbackPage(project, source, document.sourcePath))
    return markdownNotFound()
  const pages = getDocsIndex(options).flatMap((category) => category.pages)
  const bySlug = new Map(pages.map((page) => [page.slug, page]))
  const href = (page: Pick<RdxDocPage, 'slug' | 'sourcePath'>) =>
    publicUrl(
      project,
      documentPath?.(source, page) ?? getDocsHref(project, source, page.slug)
    )
  const page = bySlug.get(document.slug)!
  const lastUpdated = source.version
    ? getSnapshotDocumentDate(options.docsDir, document.sourcePath)
    : createDocumentDateReader(project.rootDir)(document.sourcePath)
  const frontmatter = {
    title: page.title,
    ...(page.description ? { description: page.description } : {}),
    url: href(document),
    docs_index: publicUrl(project, indexPath(project)),
    ...(lastUpdated ? { lastUpdated } : {}),
  }
  const fields = Object.entries(frontmatter).map(
    ([key, value]) => `${key}: ${JSON.stringify(value)}`
  )
  const body = exportMarkdownBody(document.content, {
    sourceRoot: options.docsDir,
    sourcePath: document.sourcePath,
    virtualPaths: !!options.fallbackDocsDir,
    documents: pages,
    documentHref: (slug) => href(bySlug.get(slug)!),
  })
  return response(`---\n${fields.join('\n')}\n---\n\n${body}`, 'text/markdown')
}
