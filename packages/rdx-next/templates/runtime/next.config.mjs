import { fileURLToPath } from 'node:url'

import { getRdxTracingConfig } from '@lexibase/rdx-next/config'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const appDir = fileURLToPath(new URL('.', import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(await getRdxTracingConfig({ rootDir, appDir })),
  outputFileTracingRoot: rootDir,
  agentRules: false,
  turbopack: {
    root: fileURLToPath(new URL('..', import.meta.url)),
  },
  transpilePackages: [
    '@lexibase/rdx-core',
    '@lexibase/rdx-next',
    '@lexibase/rdx-ui',
    'next-mdx-remote',
  ],
}

export default nextConfig
