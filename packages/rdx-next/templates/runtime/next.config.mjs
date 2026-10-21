/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: [
    '@lexibase/rdx-core',
    '@lexibase/rdx-next',
    '@lexibase/rdx-ui',
    'next-mdx-remote',
  ],
}

export default nextConfig
