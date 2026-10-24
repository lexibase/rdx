/** Common build root for the documentation project and its installed Next.js. */
export function getRdxBuildRoot(rootDir: string): Promise<string>

/** Explicit deployment files for a native Next.js application using RDX. */
export function getRdxTracingConfig(options: {
  rootDir: string
  appDir?: string
}): Promise<{ outputFileTracingIncludes: Record<string, string[]> }>
