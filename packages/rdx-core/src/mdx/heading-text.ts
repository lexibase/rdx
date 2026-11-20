import GithubSlugger from 'github-slugger'

type HeadingNode = {
  type: string
  value?: string
  identifier?: string
  children?: HeadingNode[]
}

/** Match rehype-slug: image alt, breaks and unevaluated MDX are not heading text. */
function headingText(
  node: HeadingNode,
  footnotes: WeakMap<HeadingNode, string>
): string {
  if (node.type === 'footnoteReference') return footnotes.get(node) ?? ''
  if (['image', 'imageReference', 'break'].includes(node.type)) return ''
  if (node.children)
    return node.children.map((child) => headingText(child, footnotes)).join('')
  if (
    ['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'html'].includes(
      node.type
    )
  )
    return ''
  return node.value ?? ''
}

/** Match rendered heading order: main content, then only referenced footnotes. */
export function getHeadingIds(tree: HeadingNode) {
  const definitions = new Map<string, HeadingNode>()
  function collect(node: HeadingNode) {
    if (node.type === 'footnoteDefinition' && node.identifier) {
      const id = node.identifier.toUpperCase()
      if (!definitions.has(id)) definitions.set(id, node)
    }
    node.children?.forEach(collect)
  }
  collect(tree)
  function walk(node: HeadingNode, visit: (node: HeadingNode) => void) {
    if (node.type === 'footnoteDefinition') return
    visit(node)
    node.children?.forEach((child) => walk(child, visit))
  }
  const order: string[] = []
  const numbers = new Map<string, string>()
  const footnotes = new WeakMap<HeadingNode, string>()
  function reference(node: HeadingNode) {
    if (node.type !== 'footnoteReference' || !node.identifier) return
    const id = node.identifier.toUpperCase()
    if (!numbers.has(id)) {
      order.push(id)
      numbers.set(id, String(order.length))
    }
    footnotes.set(node, numbers.get(id)!)
  }
  walk(tree, reference)
  // Footnote bodies can themselves reference another footnote.
  for (const id of order)
    definitions.get(id)?.children?.forEach((child) => walk(child, reference))
  const ids = new WeakMap<HeadingNode, string>()
  const slugger = new GithubSlugger()
  function heading(node: HeadingNode) {
    if (node.type === 'heading')
      ids.set(node, slugger.slug(headingText(node, footnotes)))
  }
  walk(tree, heading)
  for (const id of order)
    definitions.get(id)?.children?.forEach((child) => walk(child, heading))
  return ids
}
