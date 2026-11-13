export type RdxPageHighlight = 'important' | 'new'

export type RdxDocFrontmatter = {
  title?: string
  description?: string
  order?: number
  navTitle?: string
  /** Relative Markdown file paths to related pages in this documentation source. */
  related?: string[]
  /** Former documentation paths, written from /docs within the current edition and language. */
  redirectFrom?: string[]
  /** Show a semantic highlight next to the page in the sidebar. */
  highlighting?: RdxPageHighlight
  /** @deprecated Use order. */
  link_position?: number
  [key: string]: unknown
}

export type RdxDocPage = {
  slug: string
  title: string
  navTitle?: string
  redirectFrom?: string[]
  highlighting?: RdxPageHighlight
  description: string
  position: number
  sourcePath: string
}

export type RdxDocCategory = {
  id: string
  title: string
  position: number
  pages: RdxDocPage[]
}

export type RdxDocument = {
  slug: string
  sourcePath: string
  content: string
  frontmatter: RdxDocFrontmatter
}

export type RdxDocsOptions = {
  docsDir?: string
  /** Internal overlay: missing translated pages use this primary tree. */
  fallbackDocsDir?: string
  fallbackOnly?: boolean
}
