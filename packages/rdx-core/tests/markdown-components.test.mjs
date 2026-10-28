import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import {
  remarkDocumentationComponents,
  remarkDocumentLinks,
} from '../dist/mdx/index.js'

function parse(source, links) {
  const parser = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkDocumentationComponents)
  if (links) parser.use(remarkDocumentLinks, links)
  return parser.runSync(parser.parse(source), { value: source })
}
function nodes(tree, name) {
  return [
    ...(tree.name === name ? [tree] : []),
    ...(tree.children ?? []).flatMap((child) => nodes(child, name)),
  ]
}

test('nested groups keep all panels, literal labels, and independent values', () => {
  const tree = parse(
    '::::accordion\n\n### Commands\n\n:::tabs\n\n### pnpm\n\nFirst\n\n### npm\n\nSecond\n\n:::\n\n### Next question\n\nAnswer\n\n::::'
  )
  assert.equal(nodes(tree, 'AccordionItem').length, 2)
  assert.equal(nodes(tree, 'TabsTrigger').length, 2)
  assert.equal(nodes(tree, 'TabsContent').length, 2)
  assert.equal(
    nodes(tree, 'TabsContent')[1].children[0].children[0].value,
    'Second'
  )
  assert.equal(
    nodes(tree, 'AccordionTrigger')[1].children[0].value,
    'Next question'
  )
  assert.equal(JSON.stringify(tree).includes('"type":"heading"'), false)
  const duplicate = parse(':::tabs\n### Same\nFirst\n### Same\nSecond\n:::')
  assert.deepEqual(
    nodes(duplicate, 'TabsContent').map((node) => node.attributes[0].value),
    ['item-1', 'item-2']
  )
})

test('relative document links inside natural components keep the source version', () => {
  const root = path.resolve('fixtures/markdown-components')
  const tree = parse(
    ':::tabs\n### Guide\n[Next](./next.mdx)\n### Other\n> [!NOTE]\n> [Next](./next.mdx)\n:::',
    {
      sourceRoot: root,
      sourcePath: path.join(root, 'intro.mdx'),
      routePrefix: '1.0.0',
      documents: [{ slug: 'next', sourcePath: path.join(root, 'next.mdx') }],
    }
  )
  const links = []
  function walk(node) {
    if (node.type === 'link') links.push(node.url)
    node.children?.forEach(walk)
  }
  walk(tree)
  assert.deepEqual(links, ['/docs/1.0.0/next', '/docs/1.0.0/next'])
})
