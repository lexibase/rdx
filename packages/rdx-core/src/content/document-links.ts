import path from 'node:path'

export interface DocumentLinkOptions {
  sourceRoot: string
  sourcePath: string
  routePrefix?: string
  documents: readonly { sourcePath: string; slug: string }[]
}

export class RdxDocumentLinkError extends Error {
  constructor(sourcePath: string, href: string, reason: string) {
    super(`[RDX] Invalid document link "${href}" in ${sourcePath}: ${reason}`)
    this.name = 'RdxDocumentLinkError'
  }
}

/** Resolve only explicit relative MDX links within the current content source. */
export function createDocumentLinkResolver(options: DocumentLinkOptions) {
  const root = path.resolve(options.sourceRoot)
  const current = path.resolve(options.sourcePath)
  const documents = new Map(
    options.documents.map((page) => [path.resolve(page.sourcePath), page.slug])
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
      if (/\.mdx$/i.test(pathname))
        throw new RdxDocumentLinkError(
          current,
          href,
          'the path contains invalid URL encoding.'
        )
      return href
    }
    if (!decoded.endsWith('.mdx')) return href
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
      fail(
        `"${relative}" does not exist in this documentation source${options.routePrefix ? ` (${options.routePrefix})` : ''}.`
      )
    if ((routeCounts.get(slug) ?? 0) > 1)
      fail('the destination has an ambiguous documentation route.')
    const route = [
      '/docs',
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
        node.url = resolve(node.url)
      if (
        node.type === 'linkReference' &&
        typeof node.identifier === 'string'
      ) {
        const definition = definitions.get(identifier(node.identifier))
        if (typeof definition?.url === 'string') {
          node.type = 'link'
          node.url = resolve(definition.url)
          node.title = definition.title ?? null
          delete node.identifier
          delete node.referenceType
          delete node.label
        }
      }
      if (
        (node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement') &&
        node.name === 'a' &&
        Array.isArray(node.attributes)
      ) {
        for (const attribute of node.attributes) {
          if (
            record(attribute) &&
            attribute.type === 'mdxJsxAttribute' &&
            attribute.name === 'href' &&
            typeof attribute.value === 'string'
          )
            attribute.value = resolve(attribute.value)
        }
      }
    })
  }
}
