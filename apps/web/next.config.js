import { fileURLToPath } from 'node:url'

import { getRdxTracingConfig } from '@lexibase/rdx-next/config'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(await getRdxTracingConfig({
    rootDir: fileURLToPath(new URL('.', import.meta.url)),
  })),
  agentRules: false,
  // Browser integration scripts are development tools, never server assets.
  outputFileTracingExcludes: { '/*': ['./tests/**/*'] },
  transpilePackages: ['@lexibase/rdx-ui', 'next-mdx-remote'],
}

export default nextConfig
