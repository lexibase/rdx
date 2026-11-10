import path from 'node:path'
import { slugFromRelativePath } from './filenames'

export interface DocumentLinkOptions {
  sourceRoot: string
  sourcePath: string
  routePrefix?: string
  basePath?: string
  /** Resolve missing translated files against the effective primary inventory. */
  virtualPaths?: boolean
  documents: readonly { sourcePath: string; slug: string }[]
  documentHref?: (slug: string) => string
  /** Map resolved links and root-relative assets to their public URLs. */
  publicHref?: (href: string) => string
}

export class RdxDocumentLinkError extends Error {
  constructor(
    sourcePath: string,
    href: string,
    readonly reason: string
  ) {
    super(`[RDX] Invalid document link "${href}" in ${sourcePath}: ${reason}`)
    this.name = 'RdxDocumentLinkError'
  }
}

/** Resolve only explicit relative Markdown links within the current content source. */
export function createDocumentLinkResolver(options: DocumentLinkOptions) {
  const root = path.resolve(options.sourceRoot)
  const current = path.resolve(options.sourcePath)
  const documents = new Map(
    options.documents.flatMap((page) => [
      [path.resolve(page.sourcePath), page.slug] as const,
      ...(options.virtualPaths
        ? [
            [
              path.resolve(
                root,
                `${page.slug}${path.extname(page.sourcePath)}`
              ),
              page.slug,
            ] as const,
          ]
        : []),
    ])
  )
  const routeCounts = new Map<string, number>()
  for (const page of options.documents)
    routeCounts.set(page.slug, (routeCounts.get(page.slug) ?? 0) + 1)

  return (href: string): string => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i.test(href)) return href
    const suffixAt = href.search(/[?#]/)
    const pathname = suffixAt < 0 ? href : href.slice(0, suffixAt)
    const suffix = suffixAt < 0 ? '' : href.slice(suffixAt)
    let decoded: string
    try {
      decoded = decodeURIComponent(pathname)
    } catch {
      if (/\.mdx?$/i.test(pathname))
        throw new RdxDocumentLinkError(
          current,
          href,
          'the path contains invalid URL encoding.'
        )
      return href
    }
    if (!/\.mdx?$/.test(decoded)) return href
    const fail = (reason: string): never => {
      throw new RdxDocumentLinkError(current, href, reason)
    }
    if (
      path.isAbsolute(decoded) ||
      decoded.includes('\\') ||
      decoded.includes('\0')
    )
      fail('use forward-slash relative paths without null characters.')
    const target = path.resolve(path.dirname(current), decoded)
    const relative = path.relative(root, target)
    if (
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      fail('the destination escapes this documentation source.')
    const slug =
      documents.get(target) ??
      (options.virtualPaths
        ? documents.get(
            path.resolve(
              root,
              `${slugFromRelativePath(relative)}${path.extname(relative)}`
            )
          )
        : undefined) ??
      fail(
        `"${relative}" does not exist in this documentation source${options.routePrefix ? ` (${options.routePrefix})` : ''}.`
      )
    if ((routeCounts.get(slug) ?? 0) > 1)
      fail('the destination has an ambiguous documentation route.')
    const route =
      options.documentHref?.(slug) ??
      [
        options.basePath ?? '/docs',
        options.routePrefix && encodeURIComponent(options.routePrefix),
        ...slug.split('/').map(encodeURIComponent),
      ]
        .filter(Boolean)
        .join('/')
    return route + suffix
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

/** A remark adapter shared by generated sites and the development website. */
export function remarkDocumentLinks(options?: DocumentLinkOptions) {
  if (!options) return
  const resolve = createDocumentLinkResolver(options)
  const publicHref = options.publicHref ?? ((href: string) => href)
  return (tree: unknown) => {
    const definitions = new Map<string, Record<string, unknown>>()
    const identifier = (value: string) =>
      value.trim().replace(/\s+/g, ' ').toLowerCase()
    const visit = (
      node: unknown,
      action: (node: Record<string, unknown>) => void
    ) => {
      if (!record(node)) return
      action(node)
      if (Array.isArray(node.children))
        for (const child of node.children) visit(child, action)
    }
    visit(tree, (node) => {
      if (node.type === 'definition' && typeof node.identifier === 'string') {
        const key = identifier(node.identifier)
        if (!definitions.has(key)) definitions.set(key, node)
      }
    })
    visit(tree, (node) => {
      if (node.type === 'link' && typeof node.url === 'string')
        node.url = publicHref(resolve(node.url))
      if (
        node.type === 'linkReference' &&
        typeof node.identifier === 'string'
      ) {
        const definition = definitions.get(identifier(node.identifier))
        if (typeof definition?.url === 'string') {
          node.type = 'link'
          node.url = publicHref(resolve(definition.url))
          node.title = definition.title ?? null
          delete node.identifier
          delete node.referenceType
          delete node.label
        }
      }
      if (
        (node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement') &&
        Array.isArray(node.attributes)
      ) {
        for (const attribute of node.attributes) {
          if (
            record(attribute) &&
            attribute.type === 'mdxJsxAttribute' &&
            typeof attribute.value === 'string'
          ) {
            if (node.name === 'a' && attribute.name === 'href')
              attribute.value = publicHref(resolve(attribute.value))
            else if (
              (attribute.name === 'src' &&
                ['img', 'video', 'audio', 'source', 'track', 'iframe'].includes(
                  String(node.name)
                )) ||
              (attribute.name === 'poster' && node.name === 'video')
            )
              attribute.value = publicHref(attribute.value)
          }
        }
      }
    })
    if (options.publicHref)
      visit(tree, (node) => {
        if (
          (node.type === 'image' || node.type === 'definition') &&
          typeof node.url === 'string'
        )
          node.url = publicHref(node.url)
      })
  }
}
