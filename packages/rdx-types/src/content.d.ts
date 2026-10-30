export type RdxDocFrontmatter = {
  title?: string
  description?: string
  link_position?: number
  [key: string]: unknown
}

export type RdxDocPage = {
  slug: string
  title: string
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
