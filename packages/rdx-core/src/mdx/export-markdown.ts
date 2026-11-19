import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { hasDisabledTabMarker } from './tab-marker'

import {
  remarkDocumentLinks,
  type DocumentLinkOptions,
} from '../content/document-links'

type Node = {
  type: string
  name?: string
  depth?: number
  value?: string
  position?: { start: { offset?: number }; end: { offset?: number } }
  children?: Node[]
  attributes?: unknown
}
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
      function strip(node: Node, parent?: Node) {
        const disabled =
          node.type === 'heading' &&
          node.depth === 3 &&
          parent?.type === 'containerDirective' &&
          parent.name === 'tabs' &&
          hasDisabledTabMarker(node.children ?? [], content)
        const marker = disabled ? node.children?.at(-1) : undefined
        node.children = node.children?.filter(
          (child) =>
            child === marker ||
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
        node.children?.forEach((child) => strip(child, node))
      }
      strip(tree)
    })
    .use(remarkDocumentLinks, links)
  return String(exporter.processSync(content))
}
