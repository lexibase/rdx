/** Public text only: never serialize filesystem paths or raw MDX. */
export interface RdxSearchEntry {
  href: string
  title: string
  category: string
  section: string
  text: string
}

export interface RdxSearchIndex {
  schemaVersion: 1
  entries: RdxSearchEntry[]
}
