'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react'
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
  CodeBlockFooter,
} from './code-block'

/** The wrap action follows shadcn's stateful Code Block composition. */
export function MdxCodeBlockView({
  label,
  mode,
  value,
  lineNumbers,
  startLine,
  preProps,
  children,
}: {
  label: string
  mode?: 'folder' | 'diff'
  value: string
  lineNumbers?: boolean
  startLine?: number
  preProps: ComponentProps<'pre'>
  children: ReactNode
}) {
  const [wrap, setWrap] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [previewHeight, setPreviewHeight] = useState<number | null>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const generatedId = useId()
  const contentId = preProps.id ?? generatedId
  const collapsed = previewHeight !== null && !expanded
  const contentStyle: CSSProperties & { '--rdx-code-preview-height'?: string } =
    {
      ...preProps.style,
      '--rdx-code-preview-height': collapsed ? `${previewHeight}px` : undefined,
    }
  const messages = useMessages()

  useEffect(() => {
    const pre = blockRef.current?.querySelector<HTMLElement>(
      '[data-slot="code-block-content"]'
    )
    const code = pre?.querySelector('code')
    if (!pre || !code) return
    const desktop = window.matchMedia('(min-width: 768px)')
    let frame = 0
    let observer: ResizeObserver | undefined
    const measure = () => {
      if (desktop.matches) return
      const style = getComputedStyle(pre)
      const lineHeight = parseFloat(style.lineHeight)
      const padding =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      if (!Number.isFinite(lineHeight)) return
      const limit = lineHeight * 12 + padding
      setPreviewHeight(
        code.getBoundingClientRect().height + padding > limit + 1 ? limit : null
      )
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const updateViewport = () => {
      observer?.disconnect()
      cancelAnimationFrame(frame)
      if (desktop.matches) {
        setPreviewHeight(null)
        return
      }
      observer = new ResizeObserver(schedule)
      observer.observe(code)
      observer.observe(pre)
      schedule()
    }
    updateViewport()
    desktop.addEventListener('change', updateViewport)
    return () => {
      observer?.disconnect()
      cancelAnimationFrame(frame)
      desktop.removeEventListener('change', updateViewport)
    }
  }, [value])
  const Icon =
    mode === 'folder'
      ? FolderTree
      : mode === 'diff'
        ? GitCompareArrows
        : CodeXml
  return (
    <CodeBlock
      size="sm"
      ref={blockRef}
      data-rdx-code-block
      data-rdx-code-mode={mode}
      data-rdx-code-value={value}
      data-rdx-code-collapsed={collapsed || undefined}
      className="my-4 max-w-full"
    >
      <CodeBlockHeader>
        <CodeBlockTitle title={label}>
          <Icon aria-hidden="true" /> {label}
        </CodeBlockTitle>
        <CodeBlockActions>
          <Button
            variant="ghost"
            size="icon-xs"
            className="md:hidden"
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
        id={contentId}
        style={contentStyle}
        wrap={wrap}
        lineNumbers={lineNumbers}
        startLine={startLine}
        className={[
          preProps.className,
          'data-wrap:wrap-anywhere',
          collapsed &&
            'max-h-[var(--rdx-code-preview-height)] overflow-y-hidden scroll-fade-y md:max-h-none md:overflow-y-auto',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </CodeBlockContent>
      {previewHeight !== null && (
        <CodeBlockFooter className="justify-center md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? messages.showLess : messages.showMore}
          </Button>
        </CodeBlockFooter>
      )}
    </CodeBlock>
  )
}
