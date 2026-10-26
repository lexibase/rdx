import rehypeShiki from '@shikijs/rehype'

import { formatFolderTree } from './folder-tree'

type CodeNode = {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: CodeNode[]
  value?: string
}

function prepareFolders(node: CodeNode) {
  const code = node.tagName === 'pre' ? node.children?.[0] : undefined
  const classes = code?.properties?.className
  if (
    code &&
    Array.isArray(classes) &&
    classes.some((name) => /^language-folder$/i.test(String(name)))
  ) {
    node.properties = { ...node.properties, 'data-rdx-code-mode': 'folder' }
    code.properties!.className = classes.filter(
      (name) => !/^language-folder$/i.test(String(name))
    )
    code.children = [
      {
        type: 'text',
        value: formatFolderTree(
          code.children?.map((child) => child.value ?? '').join('') ?? ''
        ),
      },
    ]
    return
  }
  node.children?.forEach(prepareFolders)
}

/** shadcn's Shiki/GitHub palette, applied to MDX on the server. */
export function rehypeDocumentationCode(
  this: ThisParameterType<typeof rehypeShiki>
): ReturnType<typeof rehypeShiki> {
  const diffVariants = new WeakMap<object, string[]>()
  const highlight = rehypeShiki.call(this, {
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
    addLanguageClass: true,
    // Load grammars only when a document uses them, not the whole bundle.
    langs: [],
    lazy: true,
    fallbackLanguage: 'text',
    // The copy button must retain MDX's original trailing newline.
    stripEndNewline: false,
    inline: false,
    transformers: [
      {
        name: 'rdx:diff-lines',
        pre(node) {
          if (this.options.lang === 'diff')
            node.properties['data-rdx-code-mode'] = 'diff'
        },
        preprocess(code) {
          if (this.options.lang === 'diff') {
            let inHunk = false
            diffVariants.set(
              this.meta,
              code.split('\n').map((text) => {
                if (text.startsWith('diff --git ')) inHunk = false
                if (text.startsWith('@@')) {
                  inHunk = true
                  return 'hunk'
                }
                if (!inHunk && /^(\+\+\+|---)(?:\s|$)/.test(text))
                  return 'default'
                return text.startsWith('+')
                  ? 'added'
                  : text.startsWith('-')
                    ? 'removed'
                    : 'default'
              })
            )
          }
        },
        line(node, line) {
          if (this.options.lang !== 'diff') return
          node.properties['data-rdx-line-variant'] =
            diffVariants.get(this.meta)?.[line - 1] ?? 'default'
        },
      },
    ],
  })
  if (typeof highlight !== 'function') return highlight
  // Three named parameters make unified expect a callback instead of a Promise.
  return (tree, ...args) => {
    prepareFolders(tree)
    return highlight(tree, ...args)
  }
}
