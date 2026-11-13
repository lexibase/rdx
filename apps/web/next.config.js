import { fileURLToPath } from 'node:url'

import { getRdxTracingConfig } from '@lexibase/rdx-next/config'

import {
  officialDocsRoot,
  officialDocumentHrefs,
  shortDocumentRoutes,
} from './lib/documentation-routes.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(await getRdxTracingConfig({
    rootDir: fileURLToPath(new URL('.', import.meta.url)),
    pageRoutes(source, pages) {
      const root = officialDocsRoot(source)
      const shortRoutes = shortDocumentRoutes(pages)
      return {
        source,
        root,
        pages: pages.map((page, index) => ({
          page,
          hrefs: officialDocumentHrefs(
            root,
            page.slug,
            shortRoutes[index].slug
          ),
        })),
      }
    },
  })),
  agentRules: false,
  // Browser integration scripts are development tools, never server assets.
  outputFileTracingExcludes: { '/*': ['./tests/**/*'] },
  transpilePackages: ['@lexibase/rdx-ui', 'next-mdx-remote'],
}

export default nextConfig
