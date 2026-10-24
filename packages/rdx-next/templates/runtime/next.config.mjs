import { fileURLToPath } from 'node:url'

import { getRdxBuildRoot, getRdxTracingConfig } from '@lexibase/rdx-next/config'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const appDir = fileURLToPath(new URL('.', import.meta.url))
const buildRoot = await getRdxBuildRoot(rootDir)

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(await getRdxTracingConfig({ rootDir, appDir })),
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
}

export default nextConfig
