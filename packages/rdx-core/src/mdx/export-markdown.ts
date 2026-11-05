import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

import {
  remarkDocumentLinks,
  type DocumentLinkOptions,
} from '../content/document-links'

type Node = { type: string; children?: Node[]; attributes?: unknown }
type Attribute = { type: string; value?: { type?: string } | string | null }

/** Serialize document content without evaluating or publishing MDX JavaScript. */
export function exportMarkdownBody(
  content: string,
  links: DocumentLinkOptions
) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
  if (links.sourcePath.endsWith('.mdx')) processor.use(remarkMdx)
  const exporter = processor
    .use(remarkStringify)
    .use(() => (tree) => {
      function strip(node: Node) {
        node.children = node.children?.filter(
          (child) =>
            !['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression'].includes(
              child.type
            )
        )
        if (Array.isArray(node.attributes))
          node.attributes = (node.attributes as Attribute[]).filter(
            (attribute) =>
              attribute.type !== 'mdxJsxExpressionAttribute' &&
              (typeof attribute.value !== 'object' ||
                attribute.value?.type !== 'mdxJsxAttributeValueExpression')
          )
        node.children?.forEach(strip)
      }
      strip(tree)
    })
    .use(remarkDocumentLinks, links)
  return String(exporter.processSync(content))
}
