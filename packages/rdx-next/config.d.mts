/** Common build root for the documentation project and its installed Next.js. */
export function getRdxBuildRoot(rootDir: string): Promise<string>

/** Explicit deployment files and historical route redirects for a native Next.js application. */
export function getRdxTracingConfig(options: {
  rootDir: string
  appDir?: string
}): Promise<{
  outputFileTracingIncludes: Record<string, string[]>
  redirects?: () => Promise<
    { source: string; destination: string; permanent: boolean }[]
  >
}>
