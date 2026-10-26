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
  ...props
}: ComponentProps<'pre'> & { 'data-rdx-code-mode'?: 'folder' | 'diff' }) {
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
  const label =
    mode === 'folder' ? messages.folderTree : (language ?? messages.code)
  const content =
    mode === 'diff'
      ? Children.map(codeProps?.children, (node) => {
          if (
            !isValidElement<{
              children?: ReactNode
              'data-rdx-line-variant'?: string
            }>(node)
          )
            return node
          const variant = node.props['data-rdx-line-variant']
          if (!variant) return node
          return (
            <CodeBlockLine
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
      : (codeProps?.children ?? children)
  return (
    <MdxCodeBlockView
      label={label}
      mode={mode}
      value={value}
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
