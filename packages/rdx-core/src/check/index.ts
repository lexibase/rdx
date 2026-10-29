import fs from 'node:fs'
import path from 'node:path'
import GithubSlugger from 'github-slugger'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type {
  RdxContentSource,
  RdxDocPage,
  RdxProject,
} from '@lexibase/rdx-types'
import { getDocsIndex } from '../content/index'
import { parseStaticDocument } from '../content/static-source'
import {
  createDocumentLinkResolver,
  RdxDocumentLinkError,
} from '../content/document-links'
import { getSourceOptions } from '../project/index'
import { headingText } from '../mdx/heading-text'
import { remarkDocumentationComponents } from '../mdx/markdown-components'

type Position = { start: { line: number; column: number } }
type Node = {
  type: string
  name?: string
  value?: string
  url?: string
  identifier?: string
  children?: Node[]
  position?: Position
  attributes?: { name?: string; value?: unknown }[]
}
type Reference = { href: string; image: boolean; position?: Position }
type Parsed = {
  anchors: Set<string>
  references: Reference[]
  dynamicIds: boolean
}
type Document = {
  page: RdxDocPage
  source: RdxContentSource
  href: string
  parsed?: Parsed
  lineOffset: number
}

export type DocumentationDiagnostic = {
  file: string
  line: number
  column: number
  code: 'page' | 'anchor' | 'asset' | 'syntax'
  message: string
}
export type DocumentationCheck = {
  checkedPages: number
  diagnostics: DocumentationDiagnostic[]
}

/** Host adapters can describe aliases without changing the project's authoring API. */
export type DocumentationCheckOptions = {
  documentRoutes?: (
    source: RdxContentSource,
    page: RdxDocPage,
    pages: readonly RdxDocPage[]
  ) => string[]
  sourceRoute?: (source: RdxContentSource) => string
  redirects?: Readonly<Record<string, string>>
}

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMdx)
  .use(remarkDocumentationComponents)
const sourceRoute = (source: RdxContentSource) =>
  ['/docs', source.routePrefix].filter(Boolean).join('/')
const documentRoute = (source: RdxContentSource, page: RdxDocPage) =>
  `${sourceRoute(source)}/${page.slug.split('/').map(encodeURIComponent).join('/')}`
const identifier = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase()

function walk(node: Node, visit: (node: Node) => void) {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

function parse(content: string): Parsed {
  const tree = parser.runSync(parser.parse(content), { value: content }) as Node
  const anchors = new Set<string>()
  const references: Reference[] = []
  const definitions = new Map<string, string>()
  const slugger = new GithubSlugger()
  let dynamicIds = false
  walk(tree, (node) => {
    if (
      node.type === 'definition' &&
      node.identifier &&
      node.url &&
      !definitions.has(identifier(node.identifier))
    )
      definitions.set(identifier(node.identifier), node.url)
  })
  walk(tree, (node) => {
    if (node.type === 'heading') anchors.add(slugger.slug(headingText(node)))
    if (node.type === 'link' || node.type === 'image') {
      if (typeof node.url === 'string')
        references.push({
          href: node.url,
          image: node.type === 'image',
          position: node.position,
        })
    }
    if (
      (node.type === 'linkReference' || node.type === 'imageReference') &&
      node.identifier
    ) {
      const href = definitions.get(identifier(node.identifier))
      if (href)
        references.push({
          href,
          image: node.type === 'imageReference',
          position: node.position,
        })
    }
    if (!node.type.startsWith('mdxJsx')) return
    for (const attribute of node.attributes ?? []) {
      if (
        attribute.name === 'id' ||
        (node.name === 'a' && attribute.name === 'name')
      ) {
        if (typeof attribute.value === 'string') anchors.add(attribute.value)
        else if (attribute.value) dynamicIds = true
      }
      if (
        ((node.name === 'a' && attribute.name === 'href') ||
          (node.name === 'img' && attribute.name === 'src')) &&
        typeof attribute.value === 'string'
      ) {
        references.push({
          href: attribute.value,
          image: node.name === 'img',
          position: node.position,
        })
      }
    }
  })
  return { anchors, references, dynamicIds }
}

/** Read static MDX only. Never build Next, evaluate document JS or request URLs. */
export function checkDocumentation(
  project: RdxProject,
  options: DocumentationCheckOptions = {}
): DocumentationCheck {
  const diagnostics: DocumentationDiagnostic[] = []
  const documents: Document[] = []
  const routes = new Map<string, Document>()
  const coreRoutes = new Map<string, Document>()
  const roots = new Set<string>(['/robots.txt', '/sitemap.xml'])
  const prefixes: [string, string][] = []
  const redirects = new Map(Object.entries(options.redirects ?? {}))
  const failed = new Set<string>()
  const origin = project.config.metadata.metadataBase
    ? new URL(project.config.metadata.metadataBase).origin
    : 'https://rdx.invalid'
  const key = (href: string) =>
    decodeURIComponent(new URL(href, origin).pathname).replace(/\/$/, '') || '/'
  const rootFor = options.sourceRoute ?? sourceRoute
  const relativeFile = (file: string) =>
    path.relative(project.rootDir, file).split(path.sep).join('/') || '.'
  function syntax(error: unknown, file: string, offset = 0) {
    const value = error as {
      message?: string
      line?: number
      column?: number
      mark?: { line: number; column: number }
    }
    diagnostics.push({
      file: relativeFile(file),
      line: value.mark ? value.mark.line + 1 : (value.line ?? 1) + offset,
      column: value.column ?? (value.mark ? value.mark.column + 1 : 1),
      code: 'syntax',
      message: value.message ?? String(error),
    })
  }
  for (const source of project.sources) {
    if (source.redirectTo !== undefined) {
      const destination = project.sources.find(
        (entry) => entry.routePrefix === source.redirectTo
      )!
      prefixes.push([key(rootFor(source)), key(rootFor(destination))])
      continue
    }
    let pages: RdxDocPage[]
    try {
      pages = getDocsIndex(getSourceOptions(project, source), (error, file) => {
        syntax(error, file)
        failed.add(file)
      }).flatMap((category) => category.pages)
    } catch (error) {
      syntax(error, getSourceOptions(project, source).docsDir)
      continue
    }
    roots.add(key(rootFor(source)))
    if (project.config.search)
      roots.add(`/rdx-search/${source.routePrefix || '_'}`)
    for (const page of pages) {
      const hrefs = options.documentRoutes?.(source, page, pages) ?? [
        documentRoute(source, page),
      ]
      const document: Document = {
        page,
        source,
        href: hrefs[0]!,
        lineOffset: 0,
      }
      documents.push(document)
      for (const href of hrefs) routes.set(key(href), document)
      coreRoutes.set(key(documentRoute(source, page)), document)
      if (page === pages[0]) {
        routes.set(key(rootFor(source)), document)
        if (source === project.sources[0]) routes.set('/docs', document)
      }
    }
  }
  if (project.config.homepage?.enabled) roots.add('/')
  else redirects.set('/', '/docs')
  for (const document of documents) {
    if (failed.has(document.page.sourcePath)) continue
    try {
      const raw = fs.readFileSync(document.page.sourcePath, 'utf8')
      const content = parseStaticDocument(raw).content
      document.lineOffset = (
        raw.slice(0, raw.length - content.length).match(/\n/g) ?? []
      ).length
      document.parsed = parse(content)
    } catch (error) {
      syntax(error, document.page.sourcePath, document.lineOffset)
    }
  }
  function redirectRoute(pathname: string) {
    const seen = new Set<string>()
    while (!seen.has(pathname)) {
      seen.add(pathname)
      const exact = redirects.get(pathname)
      const prefix = prefixes.find(
        ([from]) => pathname === from || pathname.startsWith(`${from}/`)
      )
      const next = exact
        ? key(exact)
        : prefix
          ? prefix[1] + pathname.slice(prefix[0].length)
          : pathname
      if (next === pathname) return pathname
      pathname = next
    }
    throw new Error('The destination contains a redirect loop.')
  }
  for (const document of documents) {
    const parsed = document.parsed
    if (!parsed) continue
    const resolve = createDocumentLinkResolver({
      sourceRoot: getSourceOptions(project, document.source).docsDir,
      sourcePath: document.page.sourcePath,
      routePrefix: document.source.routePrefix,
      documents: documents
        .filter((entry) => entry.source === document.source)
        .map((entry) => entry.page),
    })
    for (const reference of parsed.references) {
      let code: DocumentationDiagnostic['code'] = reference.image
        ? 'asset'
        : 'page'
      try {
        const url = new URL(reference.href, `${origin}${document.href}`)
        if (!['http:', 'https:'].includes(url.protocol)) continue
        if (url.origin !== origin) continue
        // Absolute links are local only when a real public domain was configured.
        if (
          !project.config.metadata.metadataBase &&
          /^(?:[a-z][\w+.-]*:|\/\/)/i.test(reference.href)
        )
          continue
        let target: Document | undefined
        let pathname: string
        const explicitMdx =
          !reference.image &&
          !/^(?:[a-z][\w+.-]*:|\/|#|\?)/i.test(reference.href) &&
          /\.mdx(?:[?#]|$)/.test(decodeURIComponent(reference.href))
        if (explicitMdx) {
          const resolved = resolve(reference.href)
          pathname = key(resolved)
          target = coreRoutes.get(pathname)
        } else {
          pathname = redirectRoute(key(url.href))
          if (!reference.image) target = routes.get(pathname)
        }
        if (target) {
          if (url.hash) {
            code = 'anchor'
            const anchor = decodeURIComponent(url.hash.slice(1))
            if (
              target.parsed &&
              !target.parsed.dynamicIds &&
              !target.parsed.anchors.has(anchor)
            )
              throw new Error(
                `Section "#${anchor}" does not exist in ${relativeFile(target.page.sourcePath)}.`
              )
          }
          continue
        }
        if (!reference.image && roots.has(pathname)) continue
        code =
          reference.image || !/^\/docs(?:\/|$)/.test(pathname)
            ? 'asset'
            : 'page'
        if (pathname.includes('\\') || pathname.includes('\0'))
          throw new Error('Use a valid URL with forward slashes.')
        const publicRoot = path.resolve(project.rootDir, 'public')
        const asset = path.resolve(publicRoot, `.${pathname}`)
        const relative = path.relative(publicRoot, asset)
        if (
          relative === '..' ||
          relative.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relative)
        )
          throw new Error('The destination escapes public/.')
        let exists = false
        try {
          exists = fs.statSync(asset).isFile()
        } catch {
          /* Missing assets are reported below. */
        }
        if (!exists)
          throw new Error(
            code === 'page'
              ? `Documentation page "${pathname}" does not exist.`
              : `Local file "${pathname}" does not exist in public/.`
          )
      } catch (error) {
        const value =
          error instanceof RdxDocumentLinkError
            ? error.reason
            : error instanceof Error
              ? error.message
              : String(error)
        diagnostics.push({
          file: relativeFile(document.page.sourcePath),
          line: (reference.position?.start.line ?? 1) + document.lineOffset,
          column: reference.position?.start.column ?? 1,
          code,
          message: `"${reference.href}": ${value}`,
        })
      }
    }
  }
  diagnostics.sort(
    (a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column
  )
  return { checkedPages: documents.length, diagnostics }
}

export function formatDocumentationCheck(report: DocumentationCheck): string {
  const lines = report.diagnostics.map(
    (entry) =>
      `${entry.file}:${entry.line}:${entry.column} [${entry.code}] ${entry.message}`
  )
  lines.push(
    `RDX check ${report.diagnostics.length ? 'failed' : 'passed'}: ${report.checkedPages} ${report.checkedPages === 1 ? 'page' : 'pages'} checked, ${report.diagnostics.length} ${report.diagnostics.length === 1 ? 'problem' : 'problems'}.`
  )
  return lines.join('\n')
}
