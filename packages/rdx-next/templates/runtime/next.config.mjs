import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
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
