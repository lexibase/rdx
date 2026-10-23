import fs from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'
import { docsIndexer } from '@rdx/core'
import { buildSearchIndex } from '@lexibase/rdx-core/search'

import config from '@/rdx.config'
import versions from '@/versions.json'

export function searchVersions() {
  return config.search
    ? ['canary', ...versions.active, ...versions.archived].map((source) => ({
        source,
      }))
    : []
}

export function showcaseSearchResponse(source: string) {
  if (
    !config.search ||
    !searchVersions().some((entry) => entry.source === source)
  )
    return new Response(null, { status: 404 })
  const folder =
    source === 'canary'
      ? '(canary)'
      : versions.active.includes(source)
        ? '(versioned)'
        : '(archived)'
  const base = path.join(
    process.cwd(),
    'app/docs',
    folder,
    source === 'canary' ? '' : `version-${source}`
  )
  const files = new Map<string, string>()
  function walk(directory: string) {
    for (const entry of fs.readdirSync(/* turbopackIgnore: true */ directory, {
      withFileTypes: true,
    })) {
      const full = path.join(/* turbopackIgnore: true */ directory, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        const name = path.basename(entry.name, '.mdx')
        if (files.has(name))
          throw new Error(`Ambiguous documentation search page: ${name}`)
        files.set(name, full)
      }
    }
  }
  walk(base)
  return Response.json(
    buildSearchIndex(
      docsIndexer(source).flatMap((category) =>
        category.links.map((page) => {
          const filename = page.href.split('/').at(-1)!
          const raw = fs.readFileSync(
            /* turbopackIgnore: true */ files.get(filename)!,
            'utf8'
          )
          return {
            title: page.label,
            description: page.description,
            category: category.title,
            href: `/docs/${encodeURIComponent(source)}/${encodeURIComponent(filename)}`,
            content: matter(raw).content,
          }
        })
      )
    )
  )
}
