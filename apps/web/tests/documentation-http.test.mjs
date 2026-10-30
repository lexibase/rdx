import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { withProductionServer } from '../../../scripts/production-server.mjs'
import { getDocumentation } from '../lib/docs.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const versions = require('../versions.json')

test(
  'website serves live and released documentation, shared MDX and isolated search',
  // Every added major is another complete tree of HTTP assertions on Windows.
  {
    timeout: Math.max(
      120_000,
      30_000 * (1 + versions.active.length + versions.archived.length)
    ),
  },
  async () => {
    const docs = await getDocumentation()
    await withProductionServer(
      require.resolve('next/dist/bin/next'),
      root,
      async (base) => {
        const sitemapResponse = await fetch(`${base}/sitemap.xml`)
        assert.equal(sitemapResponse.status, 200)
        const sitemap = await sitemapResponse.text()
        for (const { url } of docs.sitemap()) {
          assert.ok(sitemap.includes(`<loc>${url}</loc>`), url)
        }
        assert.doesNotMatch(sitemap, /\/canary\/|\/rdx-search\//)
        const robots = await (await fetch(`${base}/robots.txt`)).text()
        assert.match(robots, /Sitemap: https:\/\/[^\s]+\/sitemap\.xml/)
        assert.doesNotMatch(robots, /Disallow:/)
        for (const version of [
          'canary',
          ...versions.active,
          ...versions.archived,
        ]) {
          const response = await fetch(`${base}/docs/${version}/intro`)
          assert.equal(response.status, 200, version)
          const introHtml = await response.text()
          assert.ok(
            introHtml.includes(
              `<meta name="robots" content="${docs.robots(version).index ? 'index' : 'noindex'}, follow"`
            )
          )
          assert.match(introHtml, /data-rdx-sidebar/)
          assert.match(introHtml, /Introduction \| RDX/)
          assert.match(
            introHtml,
            /<meta property="og:title" content="Introduction"/
          )
          assert.match(
            introHtml,
            /<meta name="twitter:title" content="Introduction"/
          )
          const description = introHtml.match(
            /<meta name="description" content="([^"]*)"/
          )?.[1]
          assert.ok(description)
          assert.ok(
            introHtml.includes(
              `<meta property="og:description" content="${description}"`
            )
          )
          assert.ok(
            introHtml.includes(
              `<meta name="twitter:description" content="${description}"`
            )
          )
          assert.match(
            introHtml,
            /<meta property="og:image" content="https:\/\/[^"]+\/icons\/favicon-96x96.png"/
          )
          assert.match(introHtml, /<meta name="twitter:card" content="summary"/)
          const search = await fetch(`${base}/rdx-search/${version}`)
          assert.equal(search.status, 200, version)
          const index = await search.json()
          assert.ok(index.entries.length > 0, version)
          assert.ok(
            index.entries.every((entry) =>
              entry.href.startsWith(`/docs/${version}/`)
            )
          )
          for (const page of docs.pages(version)) {
            const result = await fetch(`${base}/docs/${version}/${page.slug}`)
            assert.equal(result.status, 200, `${version}/${page.slug}`)
            await result.arrayBuffer()
          }
        }
        for (const [from, to] of Object.entries(versions.redirects ?? {})) {
          for (const suffix of ['', '/intro', '/intro?from=old']) {
            const response = await fetch(`${base}/docs/${from}${suffix}`, {
              redirect: 'manual',
            })
            assert.equal(response.status, 308)
            assert.equal(
              response.headers.get('location'),
              `/docs/${to}${suffix}`
            )
          }
          assert.equal((await fetch(`${base}/rdx-search/${from}`)).status, 404)
        }
        const example = await fetch(`${base}/docs/canary/mdx-components`)
        const html = await example.text()
        assert.match(html, /Markdown \| RDX/)
        assert.doesNotMatch(html, /data-rdx-callout="warning"/)
        const callouts = await fetch(`${base}/docs/canary/callouts`)
        assert.equal(callouts.status, 200)
        assert.match(await callouts.text(), /data-rdx-callout="warning"/)
        assert.match(html, /data-slot="mdx-table-scroll"/)
        assert.match(html, /data-rdx-code-block/)
        assert.equal(
          (await fetch(`${base}/docs/canary/cat-01/intro`)).status,
          200
        )
        for (const route of [
          '/docs/unknown/intro',
          '/docs/canary/invented/intro',
          '/docs/canary/not-a-page',
          '/rdx-search/unknown',
          '/docs/2.1.1/intro',
          '/docs/2.1.0/intro',
          '/rdx-search/2.1.1',
          '/rdx-search/2.1.0',
        ]) {
          assert.equal((await fetch(`${base}${route}`)).status, 404, route)
        }
      },
      { readyPath: '/docs/canary/intro' }
    )
  }
)
