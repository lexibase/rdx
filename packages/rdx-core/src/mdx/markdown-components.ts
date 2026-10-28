import remarkDirective from 'remark-directive'

type Node = {
  type: string
  name?: string
  value?: string
  depth?: number
  children?: Node[]
  attributes?: Record<string, string | null> | Attribute[]
  position?: { start: { offset?: number }; end: { offset?: number } }
}
type Attribute = { type: 'mdxJsxAttribute'; name: string; value: string | null }

function component(
  name: string,
  attributes: Record<string, string | null>,
  children: Node[],
  inline = false
): Node {
  return {
    type: inline ? 'mdxJsxTextElement' : 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(attributes).map<Attribute>(([name, value]) => ({
      type: 'mdxJsxAttribute',
      name,
      value,
    })),
    children,
  }
}

function label(nodes: Node[]): string {
  return nodes
    .map((node): string => {
      if (
        ![
          'text',
          'inlineCode',
          'emphasis',
          'strong',
          'delete',
          'break',
        ].includes(node.type)
      ) {
        throw new Error(
          '[RDX] Component titles must contain text or inline Markdown formatting.'
        )
      }
      return node.type === 'break'
        ? ' '
        : node.children
          ? label(node.children)
          : (node.value ?? '')
    })
    .join('')
    .trim()
}

function callout(node: Node, source: string): Node | undefined {
  if (node.type !== 'blockquote') return
  const paragraph = node.children?.[0]
  const first = paragraph?.children?.[0]
  if (paragraph?.type !== 'paragraph' || first?.type !== 'text') return
  const match =
    /^\[!(NOTE|TIP|SUCCESS|WARNING|DANGER)\](?=[ \t\r\n]|$)[ \t]*/.exec(
      first.value ?? ''
    )
  if (!match) return
  // The parser unescapes \[ too: only an actual marker in the source opts in.
  const offset = first.position?.start.offset
  if (
    offset === undefined ||
    !source.slice(offset).startsWith(`[!${match[1]}]`)
  )
    return
  const title: Node[] = []
  const body: Node[] = []
  let inBody = false
  for (const [index, child] of (paragraph.children ?? []).entries()) {
    const current =
      index === 0
        ? { ...child, value: child.value!.slice(match[0].length) }
        : child
    if (!inBody && current.type === 'break') {
      inBody = true
    } else if (
      !inBody &&
      current.type === 'text' &&
      current.value?.includes('\n')
    ) {
      const newline = current.value.indexOf('\n')
      title.push({
        ...current,
        value: current.value.slice(0, newline).replace(/\r$/, ''),
      })
      const rest = current.value.slice(newline + 1)
      if (rest) body.push({ ...current, value: rest })
      inBody = true
    } else if (inBody) body.push(current)
    else title.push(current)
  }
  const heading = label(title)
  return component(
    'Callout',
    {
      variant: match[1]!.toLowerCase(),
      ...(heading ? { title: heading } : {}),
    },
    [
      ...(body.length ? [{ type: 'paragraph', children: body }] : []),
      ...(node.children?.slice(1) ?? []),
    ]
  )
}

function container(node: Node, source: string): Node {
  const groups: { title: string; disabled: boolean; children: Node[] }[] = []
  for (const child of node.children ?? []) {
    if (child.type === 'heading' && child.depth === 3) {
      const children = [...(child.children ?? [])]
      const marker = children.at(-1)
      const beforeMarker = children.at(-2)
      // Recognize only the exact literal flag in a tab heading, never arbitrary
      // MDX expressions, inline code, or escaped braces.
      const disabled =
        node.name === 'tabs' &&
        marker?.type === 'mdxTextExpression' &&
        marker.value === 'disabled' &&
        source.slice(
          marker.position?.start.offset,
          marker.position?.end.offset
        ) === '{disabled}' &&
        (!beforeMarker ||
          (beforeMarker.type === 'text' &&
            /\s$/.test(beforeMarker.value ?? '')))
      if (disabled) children.pop()
      const title = label(children)
      if (!title)
        throw new Error(
          `[RDX] :::${node.name} requires a nonempty ### title for each item.`
        )
      groups.push({ title, disabled, children: [] })
    } else {
      const group = groups.at(-1)
      if (!group)
        throw new Error(`[RDX] Start :::${node.name} items with ### Title.`)
      group.children.push(child)
    }
  }
  if (!groups.length)
    throw new Error(
      `[RDX] :::${node.name} requires at least one ### Title and its content.`
    )
  if (node.name === 'tabs') {
    const firstEnabled = groups.findIndex((group) => !group.disabled)
    if (firstEnabled < 0)
      throw new Error('[RDX] :::tabs requires at least one enabled tab.')
    return component('Tabs', { defaultValue: `item-${firstEnabled + 1}` }, [
      component(
        'TabsList',
        {},
        groups.map((group, index) =>
          component(
            'TabsTrigger',
            {
              value: `item-${index + 1}`,
              ...(group.disabled ? { disabled: null } : {}),
            },
            [{ type: 'text', value: group.title }]
          )
        )
      ),
      // Disabled choices have no reachable panel; keep their content out of
      // both rendering and the search index built from this same tree.
      ...groups.flatMap((group, index) =>
        group.disabled
          ? []
          : [
              component(
                'TabsContent',
                { value: `item-${index + 1}` },
                group.children
              ),
            ]
      ),
    ])
  }
  return component(
    'Accordion',
    {},
    groups.map((group, index) =>
      component('AccordionItem', { value: `item-${index + 1}` }, [
        component('AccordionTrigger', {}, [
          { type: 'text', value: group.title },
        ]),
        component('AccordionContent', {}, group.children),
      ])
    )
  )
}

/** Markdown authoring adapters for the shared shadcn/Base UI components. */
export function remarkDocumentationComponents(
  this: ThisParameterType<typeof remarkDirective>
) {
  remarkDirective.call(this)
  return (tree: unknown, file: { value: unknown }) => {
    const source = String(file.value)
    function transform(node: Node): Node {
      const alert = callout(node, source)
      if (alert) return transform(alert)
      if (
        ['containerDirective', 'leafDirective', 'textDirective'].includes(
          node.type
        )
      ) {
        const known = ['tabs', 'accordion', 'kbd'].includes(node.name ?? '')
        if (!known) {
          // Unrecognized directives remain literal Markdown, never arbitrary tags.
          const value = source.slice(
            node.position?.start.offset,
            node.position?.end.offset
          )
          return node.type === 'textDirective'
            ? { type: 'text', value }
            : { type: 'paragraph', children: [{ type: 'text', value }] }
        }
        if (Object.keys(node.attributes ?? {}).length)
          throw new Error(`[RDX] :${node.name} does not accept attributes.`)
        if (node.name === 'kbd') {
          if (node.type !== 'textDirective')
            throw new Error('[RDX] Write keyboard keys as :kbd[Ctrl].')
          const key = label(node.children ?? [])
          if (!key) throw new Error('[RDX] :kbd[...] requires a key name.')
          return component('Kbd', {}, [{ type: 'text', value: key }], true)
        }
        if (node.type !== 'containerDirective')
          throw new Error(
            `[RDX] Write ${node.name} as a :::${node.name} block with ### item titles.`
          )
        return transform(container(node, source))
      }
      if (node.children) node.children = node.children.map(transform)
      return node
    }
    transform(tree as Node)
  }
}
