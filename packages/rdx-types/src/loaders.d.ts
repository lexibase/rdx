import React from 'react'

export interface MDXLoader {
  filename: string
  version?: string
  staticVersions: string[]
  mdxComponents: Record<string, React.ComponentType<any>>
  docsRoot?: string
}
