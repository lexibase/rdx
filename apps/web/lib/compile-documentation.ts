import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { withBasePath } from '@lexibase/rdx-core'
import {
  remarkDocumentLinks,
  remarkDocumentationComponents,
  rehypeDocumentationHeadings,
  rehypeDocumentationCode,
} from '@lexibase/rdx-core/mdx'

import { basePath } from '@/rdx.config'

import { getDocumentation } from './docs'

export async function compileDocument(
  version: string,
  slug: string,
  components: Parameters<typeof compileMDX>[0]['components'],
  docs?: Awaited<ReturnType<typeof getDocumentation>>
) {
  docs ??= await getDocumentation()
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
        format: document.sourcePath.endsWith('.md') ? 'md' : 'mdx',
        remarkPlugins: [
          remarkGfm,
          remarkDocumentationComponents,
          [
            remarkDocumentLinks,
            {
              sourceRoot: source.docsDir,
              sourcePath: document.sourcePath,
              routePrefix: version,
              documents: docs.pages(version),
              ...(basePath
                ? { publicHref: (href: string) => withBasePath(href, basePath) }
                : {}),
            },
          ],
        ],
        rehypePlugins: [
          rehypeDocumentationHeadings,
          [rehypeDocumentationCode, docs.syntaxGrammars, docs.syntaxThemes],
        ],
      },
    },
  })
}
