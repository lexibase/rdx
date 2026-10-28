import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import {
  remarkDocumentLinks,
  remarkDocumentationComponents,
  rehypeDocumentationHeadings,
  rehypeDocumentationCode,
  type DocumentLinkOptions,
} from '@lexibase/rdx-core/mdx'

export function compileDocumentation(
  source: string,
  components: Parameters<typeof compileMDX>[0]['components'],
  links?: DocumentLinkOptions
) {
  return compileMDX({
    source,
    components,
    options: {
      blockJS: true,
      blockDangerousJS: true,
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          remarkDocumentationComponents,
          [remarkDocumentLinks, links],
        ],
        rehypePlugins: [rehypeDocumentationHeadings, rehypeDocumentationCode],
      },
    },
  })
}
