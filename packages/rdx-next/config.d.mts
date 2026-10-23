/** Explicit deployment files for a native Next.js application using RDX. */
export function getRdxTracingConfig(options: {
  rootDir: string
  appDir?: string
}): Promise<{ outputFileTracingIncludes: Record<string, string[]> }>
