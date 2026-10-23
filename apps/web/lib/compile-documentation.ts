import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import {
  remarkDocumentLinks,
  rehypeDocumentationHeadings,
  rehypeDocumentationCode,
} from '@lexibase/rdx-core/mdx'

import { documentation } from './docs'

export async function compileDocument(
  version: string,
  slug: string,
  components: Parameters<typeof compileMDX>[0]['components'],
  docs = documentation
) {
  const document = docs.document(version, slug)
  const source = docs.source(version)
  if (!document || !source) return null
  return compileMDX({
    source: document.content,
    components,
    options: {
      blockJS: true,
      blockDangerousJS: true,
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          [
            remarkDocumentLinks,
            {
              sourceRoot: source.docsDir,
              sourcePath: document.sourcePath,
              routePrefix: version,
              documents: docs.pages(version),
            },
          ],
        ],
        rehypePlugins: [rehypeDocumentationHeadings, rehypeDocumentationCode],
      },
    },
  })
}
