'use client'

import { useState, type ComponentProps, type ReactNode } from 'react'
import { CodeXml, FolderTree, GitCompareArrows, WrapText } from 'lucide-react'

import { useMessages } from '../providers/locale-provider'
import { Button } from './button'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from './code-block'

/** The wrap action follows shadcn's stateful Code Block composition. */
export function MdxCodeBlockView({
  label,
  mode,
  value,
  preProps,
  children,
}: {
  label: string
  mode?: 'folder' | 'diff'
  value: string
  preProps: ComponentProps<'pre'>
  children: ReactNode
}) {
  const [wrap, setWrap] = useState(false)
  const messages = useMessages()
  const Icon =
    mode === 'folder'
      ? FolderTree
      : mode === 'diff'
        ? GitCompareArrows
        : CodeXml
  return (
    <CodeBlock
      size="sm"
      data-rdx-code-block
      data-rdx-code-mode={mode}
      data-rdx-code-value={value}
      className="my-4 max-w-full"
    >
      <CodeBlockHeader>
        <CodeBlockTitle>
          <Icon aria-hidden="true" /> {label}
        </CodeBlockTitle>
        <CodeBlockActions>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={messages.wrapCode}
            title={messages.wrapCode}
            aria-pressed={wrap}
            onClick={() => setWrap(!wrap)}
          >
            <WrapText aria-hidden="true" />
          </Button>
          <CodeBlockCopyButton value={value} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent
        {...preProps}
        wrap={wrap}
        className={[preProps.className, 'data-wrap:wrap-anywhere']
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </CodeBlockContent>
    </CodeBlock>
  )
}
