import { fileURLToPath } from 'node:url'

import { getRdxBuildRoot, getRdxTracingConfig } from '@lexibase/rdx-next/config'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const appDir = fileURLToPath(new URL('.', import.meta.url))
const buildRoot = await getRdxBuildRoot(rootDir)

/** @type {(phase: string) => Promise<import('next').NextConfig>} */
const nextConfig = async (phase) => ({
  ...(await getRdxTracingConfig({
    rootDir,
    appDir,
    captureDocumentDates: phase === 'phase-production-build',
  })),
  outputFileTracingRoot: buildRoot,
  agentRules: false,
  turbopack: {
    root: buildRoot,
  },
  transpilePackages: [
    '@lexibase/rdx-core',
    '@lexibase/rdx-next',
    '@lexibase/rdx-ui',
    'next-mdx-remote',
  ],
})

export default nextConfig
