import type { RdxContentSource, RdxDocPage } from '@lexibase/rdx-types'

export function readRedirectFrom(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value))
    throw new Error('redirectFrom must be a list of /docs/ paths.')
  return value.map((entry, index) => {
    if (
      typeof entry === 'string' &&
      /^\/docs(?:\/[A-Za-z0-9._~-]+)+$/.test(entry) &&
      !entry.split('/').some((segment) => segment === '.' || segment === '..')
    )
      return entry
    throw new Error(
      `redirectFrom[${index}] must be a /docs/ path without a trailing slash, query, or fragment.`
    )
  })
}

export type PageRedirectSource = {
  source: RdxContentSource
  root: string
  pages: { page: RdxDocPage; hrefs: string[] }[]
}

const routeKey = (href: string) => decodeURIComponent(href)

export function collectPageRedirects(
  sources: PageRedirectSource[],
  onError: (error: Error, file: string) => void = (error) => {
    throw error
  }
) {
  const occupied = new Set(
    sources.flatMap(({ root, pages }) => [
      routeKey(root),
      ...pages.flatMap(({ hrefs }) => hrefs.map(routeKey)),
    ])
  )
  const aliases = new Map<string, string>()
  const redirects: { source: string; destination: string; permanent: true }[] =
    []
  for (const { source, root, pages } of sources) {
    if (source.redirectTo !== undefined) continue
    for (const { page, hrefs } of pages) {
      for (const former of page.redirectFrom ?? []) {
        const old = `${root}${former.slice('/docs'.length)}`
        const key = routeKey(old)
        const destination = hrefs[0]!
        const reserved = sources.some(
          (other) =>
            other.root !== root &&
            key.startsWith(`${routeKey(other.root)}/`) &&
            routeKey(other.root).startsWith(`${routeKey(root)}/`)
        )
        const builtIn =
          key === '/docs/llms.txt' || key === `${source.basePath}/llms.txt`
        if (occupied.has(key) || reserved || builtIn || aliases.has(key)) {
          onError(
            new Error(
              `redirectFrom path "${old}" conflicts with ${aliases.has(key) ? `a redirect to "${aliases.get(key)}"` : 'an existing documentation route'}.`
            ),
            page.sourcePath
          )
          continue
        }
        aliases.set(key, destination)
        redirects.push({
          source: key.split('/').map(encodeURIComponent).join('/'),
          destination,
          permanent: true,
        })
      }
    }
  }
  return redirects
}
