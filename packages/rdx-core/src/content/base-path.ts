/** Convert an app-relative URL for consumers that do not use the Next router. */
export function withBasePath(href: string, basePath?: string): string {
  if (!basePath || !href.startsWith('/') || href.startsWith('//')) return href
  return (
    basePath + (href === '/' || /^\/[?#]/.test(href) ? href.slice(1) : href)
  )
}
