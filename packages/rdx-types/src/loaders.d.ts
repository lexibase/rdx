export interface MDXLoader {
  filename: string
  version?: string
  versionsRaw: string[]
  mdxComponents: Record<string, React.ComponentType<any>>
  docsRoot?: string
}

export type DocLink = {
  href: string
  label: string
  description?: string
}

export type DocCategory = {
  title: string
  links: DocLink[]
}
