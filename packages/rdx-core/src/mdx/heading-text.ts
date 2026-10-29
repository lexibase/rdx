type HeadingNode = { type: string; value?: string; children?: HeadingNode[] }

/** Match rehype-slug: image alt, breaks and unevaluated MDX are not heading text. */
export function headingText(node: HeadingNode): string {
  if (['image', 'imageReference', 'break'].includes(node.type)) return ''
  if (node.children) return node.children.map(headingText).join('')
  if (
    ['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'html'].includes(
      node.type
    )
  )
    return ''
  return node.value ?? ''
}
