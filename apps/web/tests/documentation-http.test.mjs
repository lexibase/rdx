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
  { timeout: 120_000 },
  async () => {
    const docs = await getDocumentation()
    await withProductionServer(
      require.resolve('next/dist/bin/next'),
      root,
      async (base) => {
        for (const version of [
          'canary',
          ...versions.active,
          ...versions.archived,
        ]) {
          const response = await fetch(`${base}/docs/${version}/intro`)
          assert.equal(response.status, 200, version)
          const introHtml = await response.text()
          assert.match(introHtml, /data-rdx-sidebar/)
          assert.match(introHtml, /Introduction \| RDX/)
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
          '/docs/2.0.0/intro',
          '/rdx-search/2.1.1',
          '/rdx-search/2.1.0',
          '/rdx-search/2.0.0',
        ]) {
          assert.equal((await fetch(`${base}${route}`)).status, 404, route)
        }
      },
      { readyPath: '/docs/canary/intro' }
    )
  }
)
