import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { withProductionServer } from '../../../scripts/production-server.mjs'
import { createDocumentation } from '../lib/documentation.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const versions = require('../versions.json')

test(
  'showcase serves historical URLs, shared MDX and version-scoped search through the public core',
  { timeout: 120_000 },
  async () => {
    const docs = createDocumentation(root, versions)
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
          assert.match(await response.text(), /data-rdx-sidebar/)
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
        assert.match(html, /data-rdx-callout="warning"/)
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
        ]) {
          assert.equal((await fetch(`${base}${route}`)).status, 404, route)
        }
      },
      { readyPath: '/docs/canary/intro' }
    )
  }
)
