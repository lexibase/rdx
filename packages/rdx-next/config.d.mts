import type { RdxContentSource, RdxDocPage } from '@lexibase/rdx-types'

/** Common build root for the documentation project and its installed Next.js. */
export function getRdxBuildRoot(rootDir: string): Promise<string>

/** Explicit deployment files and historical route redirects for a native Next.js application. */
export function getRdxTracingConfig(options: {
  rootDir: string
  appDir?: string
  pageRoutes?: (
    source: RdxContentSource,
    pages: RdxDocPage[]
  ) => {
    source: RdxContentSource
    root: string
    pages: { page: RdxDocPage; hrefs: string[] }[]
  }
}): Promise<{
  basePath?: string
  outputFileTracingIncludes: Record<string, string[]>
  redirects?: () => Promise<
    { source: string; destination: string; permanent: boolean }[]
  >
}>
