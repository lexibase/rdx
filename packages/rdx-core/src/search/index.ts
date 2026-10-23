import GithubSlugger from 'github-slugger'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { RdxSearchIndex } from '@lexibase/rdx-types'

type Node = {
  type: string
  value?: string
  name?: string
  alt?: string
  depth?: number
  children?: Node[]
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMdx)

function text(node: Node): string {
  if (node.type === 'break') return ' '
  if (
    ['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'html'].includes(
      node.type
    )
  )
    return ''
  if (node.name && ['script', 'style', 'svg'].includes(node.name.toLowerCase()))
    return ''
  if (node.type === 'image') return node.alt ?? ''
  if (node.children)
    return node.children
      .map(text)
      .join(
        [
          'paragraph',
          'heading',
          'link',
          'emphasis',
          'strong',
          'delete',
          'mdxJsxTextElement',
        ].includes(node.type)
          ? ''
          : ' '
      )
  return node.value ?? ''
}

function plain(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

// rehype-slug reads rendered heading text: image alt and <br> are not text nodes.
function headingText(node: Node): string {
  if (['image', 'imageReference', 'break'].includes(node.type)) return ''
  if (node.children) return node.children.map(headingText).join('')
  return text(node)
}

export interface SearchDocument {
  title: string
  description?: string
  category: string
  href: string
  content: string
}

/** Parse text/sections without compiling MDX, evaluating JS, or exposing paths. */
export function buildSearchIndex(documents: SearchDocument[]): RdxSearchIndex {
  const entries: RdxSearchIndex['entries'] = []
  for (const document of documents) {
    const firstEntry = entries.length
    const slugger = new GithubSlugger()
    const tree = parser.parse(document.content) as Node
    let current = {
      href: document.href,
      title: document.title,
      category: document.category,
      section: '',
      text: document.description ?? '',
    }
    entries.push(current)
    function visit(node: Node, interactive = false) {
      if (node.type === 'heading') {
        const title = plain(text(node))
        const id = slugger.slug(headingText(node))
        if (!title) return
        // Hidden tabs/accordion panels may not be mounted in the page. Index
        // their text under the enclosing section, not an unreachable anchor.
        if (interactive) {
          current.text += ` ${title}`
          return
        }
        current = {
          href: `${document.href}#${encodeURIComponent(id)}`,
          title: document.title,
          category: document.category,
          section: title,
          text: '',
        }
        entries.push(current)
      } else if (
        [
          'mdxJsxFlowElement',
          'root',
          'blockquote',
          'list',
          'listItem',
        ].includes(node.type)
      ) {
        if (
          node.name &&
          ['script', 'style', 'svg'].includes(node.name.toLowerCase())
        )
          return
        const nestedInteractive =
          interactive ||
          node.name === 'TabsContent' ||
          node.name === 'AccordionContent'
        node.children?.forEach((child) => visit(child, nestedInteractive))
      } else {
        current.text += ` ${text(node)}`
      }
    }
    tree.children?.forEach((child) => visit(child))
    for (const entry of entries.slice(firstEntry)) {
      entry.text = plain(entry.text)
    }
  }
  return { schemaVersion: 1, entries }
}
