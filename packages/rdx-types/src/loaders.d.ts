export interface VersionsRaw {
  active: string[]
  archived: string[]
}

export interface MDXLoader {
  filename: string
  version?: string
  versionsRaw: VersionsRaw
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
