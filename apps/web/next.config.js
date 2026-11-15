import { fileURLToPath } from 'node:url'

import { readChangelog } from '@lexibase/rdx-core/config'
import { getRdxTracingConfig } from '@lexibase/rdx-next/config'

import { publishedChangelogVersions } from './lib/changelog-publication.mjs'
import {
  officialDocsRoot,
  officialDocumentHrefs,
  shortDocumentRoutes,
} from './lib/documentation-routes.mjs'

/** @type {(phase: string) => Promise<import('next').NextConfig>} */
const nextConfig = async (phase) => ({
  ...(phase === 'phase-production-build' &&
  process.env.VERCEL_ENV === 'production'
    ? {
        env: {
          RDX_VISIBLE_CHANGELOG_VERSIONS: (
            await publishedChangelogVersions(
              readChangelog(fileURLToPath(new URL('.', import.meta.url))).map(
                ({ version }) => version
              )
            )
          ).join(','),
        },
      }
    : {}),
  ...(await getRdxTracingConfig({
    rootDir: fileURLToPath(new URL('.', import.meta.url)),
    captureDocumentDates: phase === 'phase-production-build',
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
})

export default nextConfig
