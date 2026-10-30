import assert from 'node:assert/strict'
import test from 'node:test'
import process from 'node:process'

import { getDocumentation } from '../lib/docs.ts'
import config from '../rdx.config.ts'

const base = process.env.RDX_PUBLIC_TEST_URL

test(
  'deployed website serves every documentation edition, public assets, search and retired-version 404s',
  {
    skip: !base && 'Set RDX_PUBLIC_TEST_URL to check a deployment',
    timeout: 180_000,
  },
  async () => {
    const docs = await getDocumentation()
    const request = (route) =>
      fetch(new URL(route, base), { signal: AbortSignal.timeout(30_000) })
    const home = await request('/')
    assert.equal(home.status, 200)
    assert.match(await home.text(), /<title>RDX<\/title>/)
    const root = await request('/docs')
    assert.equal(root.status, 200)
    assert.equal(new URL(root.url).pathname, '/docs/4.1.0/intro')
    const html = await root.text()
    assert.equal(html.match(/<html[^>]*lang="([^"]+)"/)?.[1], config.lang)
    assert.match(html, /data-rdx-sidebar/)
    assert.match(html, /Introduction \| RDX/)
    assert.doesNotMatch(html, /Version 2\.1\.[01]|mdxRenderDocs/)
    for (const edition of docs.editions) {
      for (const page of docs.pages(edition.id)) {
        const response = await request(`/docs/${edition.id}/${page.slug}`)
        assert.equal(response.status, 200, `${edition.id}/${page.slug}`)
        assert.match(await response.text(), /data-rdx-sidebar/, page.slug)
      }
      const search = await request(`/rdx-search/${edition.id}`)
      assert.equal(search.status, 200)
      const index = await search.json()
      assert.ok(index.entries.length >= docs.pages(edition.id).length)
      assert.ok(
        index.entries.every((entry) =>
          entry.href.startsWith(`/docs/${edition.id}/`)
        )
      )
    }
    for (const asset of [
      '/icons/logo.svg',
      '/favicon.ico',
      '/site.webmanifest',
    ]) {
      assert.equal((await request(asset)).status, 200, asset)
    }
    for (const route of [
      '/docs/canary/not-a-page',
      '/docs/2.1.1/intro',
      '/docs/2.1.0/intro',
      '/rdx-search/2.1.1',
      '/rdx-search/unknown',
    ]) {
      assert.equal((await request(route)).status, 404, route)
    }
  }
)
