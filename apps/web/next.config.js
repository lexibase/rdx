/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  // Documentation sources select version folders at runtime. Trace their content
  // explicitly instead of letting dynamic filesystem calls include the repo.
  outputFileTracingIncludes: {
    '/docs/**': [
      './app/docs/**/*.mdx',
      './app/docs/**/_category.json',
      './versions.json',
    ],
  },
  transpilePackages: ['@lexibase/rdx-ui', 'next-mdx-remote'],
}

export default nextConfig
