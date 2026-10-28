import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from 'react'

import { getMessages } from '../lib/i18n'
import { CodeBlockLine } from './code-block'
import { MdxCodeBlockView } from './mdx-code-block-view'
import { MdxFolderTree } from './mdx-folder-tree'
import { MdxMermaid } from './mdx-mermaid'

function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textOf(child.props.children)
          : ''
    )
    .join('')
}

// Shadcn draws diff markers itself. Strip the original marker from highlighted
// tokens while keeping the original patch as the clipboard value.
function withoutMarker(children: ReactNode): ReactNode {
  let remaining = 1
  function strip(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (node) => {
      if (!remaining) return node
      if (typeof node === 'string') {
        const value = node.slice(remaining)
        remaining = Math.max(0, remaining - node.length)
        return value
      }
      return isValidElement<{ children?: ReactNode }>(node)
        ? cloneElement(node, {}, strip(node.props.children))
        : node
    })
  }
  return strip(children)
}

/** Translate Markdown fences to the complete shadcn Code Block composition. */
export function MdxCodeBlock({
  lang,
  children,
  'data-rdx-code-mode': mode,
  'data-rdx-code-title': title,
  'data-rdx-code-line-numbers': numbered,
  'data-rdx-code-start-line': firstLine,
  ...props
}: ComponentProps<'pre'> & {
  'data-rdx-code-mode'?: 'folder' | 'diff' | 'mermaid'
  'data-rdx-code-title'?: string
  'data-rdx-code-line-numbers'?: string
  'data-rdx-code-start-line'?: string
}) {
  const messages = getMessages(lang)
  const code = Children.toArray(children).find((child) => isValidElement(child))
  const codeProps = isValidElement<{
    className?: string
    children?: ReactNode
  }>(code)
    ? code.props
    : undefined
  const language = codeProps?.className?.match(/(?:^|\s)language-([^\s]+)/)?.[1]
  const value = textOf(codeProps?.children ?? children)
  if (mode === 'mermaid' || language?.toLowerCase() === 'mermaid') {
    return (
      <MdxMermaid
        value={value}
        title={title}
        lineNumbers={numbered === 'true'}
        startLine={firstLine === undefined ? undefined : Number(firstLine)}
        preProps={props}
      />
    )
  }
  const label =
    title ||
    (mode === 'folder' ? messages.folderTree : (language ?? messages.code))
  const lineNumbers = numbered === 'true'
  const raw = codeProps?.children ?? children
  const nodes = Children.toArray(raw)
  type LineProps = {
    children?: ReactNode
    className?: string
    'data-rdx-line-variant'?: string
  }
  const lines = nodes.filter(
    (node) =>
      isValidElement<LineProps>(node) &&
      (node.props['data-rdx-line-variant'] ||
        node.props.className?.split(/\s+/).includes('line'))
  )
  const lastLine = lines.at(-1)
  const content =
    mode === 'folder' ? (
      <MdxFolderTree value={value} />
    ) : (mode === 'diff' || lineNumbers) && typeof raw !== 'string' ? (
      nodes.map((node) => {
        if (lineNumbers && node === '\n') return null
        if (!isValidElement<LineProps>(node)) return node
        const variant = node.props['data-rdx-line-variant']
        if (
          !variant &&
          !(lineNumbers && node.props.className?.split(/\s+/).includes('line'))
        )
          return node
        // A final newline terminates the last source line; intentional blank
        // lines before it still receive the official component's own number.
        if (
          lineNumbers &&
          lines.length > 1 &&
          node === lastLine &&
          value.endsWith('\n') &&
          textOf(node.props.children) === ''
        )
          return null
        return (
          <CodeBlockLine
            key={node.key}
            variant={
              variant === 'added' || variant === 'removed'
                ? variant
                : variant === 'hunk'
                  ? 'highlighted'
                  : 'default'
            }
          >
            {variant === 'added' || variant === 'removed'
              ? withoutMarker(node.props.children)
              : node.props.children}
          </CodeBlockLine>
        )
      })
    ) : (
      raw
    )
  return (
    <MdxCodeBlockView
      label={label}
      mode={mode}
      value={value}
      lineNumbers={lineNumbers}
      startLine={firstLine === undefined ? undefined : Number(firstLine)}
      preProps={{
        ...props,
        className: [props.className, language && `language-${language}`]
          .filter(Boolean)
          .join(' '),
      }}
    >
      {content}
    </MdxCodeBlockView>
  )
}
