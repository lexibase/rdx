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
  // Edition indexes are generated with the Markdown exports. Rewrites run
  // after static routes, so /docs/llms.txt keeps its own route.
  async rewrites() {
    return [
      {
        source: '/docs/:edition/llms.txt',
        destination: '/rdx-markdown/docs/:edition/llms.txt',
      },
      {
        source: '/:locale/docs/:edition/llms.txt',
        destination: '/rdx-markdown/:locale/docs/:edition/llms.txt',
      },
    ]
  },
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
