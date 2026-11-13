/** @param {import('@lexibase/rdx-types').RdxDocPage[]} pages */
export function shortDocumentRoutes(pages) {
  const counts = new Map()
  const basename = (slug) => slug.split('/').at(-1)
  for (const { slug } of pages) {
    const name = basename(slug)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return pages.map((page) => {
    const name = basename(page.slug)
    return { ...page, slug: counts.get(name) === 1 ? name : page.slug }
  })
}

/** @param {import('@lexibase/rdx-types').RdxContentSource} source */
export function officialDocsRoot(source) {
  return `/docs/${source.id === 'current' ? 'canary' : source.routePrefix}`
}
export const canaryCategoryAliases = new Map([
  ['cat-01', 'documentation'],
  ['cat-02', 'getting-started'],
  ['cat-03', 'writing-documentation'],
  ['cat-04', 'features'],
  ['cat-05', 'guides'],
])

/** @param {string} root @param {string} slug @param {string} shortSlug */
export function officialDocumentHrefs(root, slug, shortSlug) {
  const slugs = [shortSlug, slug]
  if (root === '/docs/canary') {
    const [category, ...segments] = slug.split('/')
    for (const [alias, current] of canaryCategoryAliases) {
      if (category === current && segments.length)
        slugs.push([alias, ...segments].join('/'))
    }
  }
  return slugs.map(
    (entry) => `${root}/${entry.split('/').map(encodeURIComponent).join('/')}`
  )
}
