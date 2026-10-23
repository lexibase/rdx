import type { RdxSearchEntry, RdxSearchIndex } from '@lexibase/rdx-types'

export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function prepareSearch(index: RdxSearchIndex) {
  if (index.schemaVersion !== 1 || !Array.isArray(index.entries))
    throw new Error('Invalid search index')
  return index.entries.map((entry) => {
    if (
      !['href', 'title', 'category', 'section', 'text'].every(
        (field) => typeof entry[field as keyof RdxSearchEntry] === 'string'
      ) ||
      !/^\/docs(?:\/|$)/.test(entry.href)
    )
      throw new Error('Invalid search entry')
    return {
      entry,
      title: normalizeSearch(entry.title),
      section: normalizeSearch(entry.section),
      category: normalizeSearch(entry.category),
      text: normalizeSearch(entry.text),
    }
  })
}

export type PreparedSearch = ReturnType<typeof prepareSearch>

/** Require every query term, favor page/section titles, and bound result count. */
export function searchDocumentation(index: PreparedSearch, query: string) {
  const normalized = normalizeSearch(query.trim().slice(0, 120))
  const terms = [...new Set(normalized.split(/\s+/).filter(Boolean))].slice(
    0,
    8
  )
  if (!terms.length) return []
  return index
    .map((item) => {
      let score = 0
      for (const term of terms) {
        const weight =
          (item.title.includes(term) ? 12 : 0) +
          (item.section.includes(term) ? 10 : 0) +
          (item.category.includes(term) ? 2 : 0) +
          (item.text.includes(term) ? 1 : 0)
        if (!weight) return { item, score: 0 }
        score += weight
      }
      if (item.title === normalized) score += 30
      if (item.section === normalized) score += 25
      return { item, score }
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.item.entry.href.localeCompare(b.item.entry.href)
    )
    .slice(0, 12)
    .map(({ item }) => {
      const term = terms.find((term) => item.text.includes(term))
      const offset = term ? Math.max(0, item.text.indexOf(term) - 50) : 0
      return {
        ...item.entry,
        excerpt: `${offset ? '…' : ''}${item.entry.text.slice(offset, offset + 170)}${item.entry.text.length > offset + 170 ? '…' : ''}`,
      }
    })
}
