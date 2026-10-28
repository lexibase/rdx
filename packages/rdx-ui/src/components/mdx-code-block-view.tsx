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
import { motion } from 'motion/react'

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

// Keep native pre events separate from Motion's gesture event props.
const AnimatedCodeBlockContent = motion.create(function PreviewContent({
  preProps,
  ...props
}: ComponentProps<typeof CodeBlockContent> & {
  preProps: ComponentProps<'pre'>
}) {
  return <CodeBlockContent {...preProps} {...props} />
})

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
  const [fullHeight, setFullHeight] = useState(0)
  const [animateSize, setAnimateSize] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)
  const generatedId = useId()
  const contentId = preProps.id ?? generatedId
  const collapsed = previewHeight !== null && !expanded
  const contentStyle: CSSProperties = {
    ...preProps.style,
    ...(previewHeight !== null && {
      height: 'var(--rdx-code-preview-height)',
    }),
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
      const height = code.getBoundingClientRect().height + padding
      setFullHeight(height)
      setPreviewHeight(height > limit + 1 ? limit : null)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const updateViewport = () => {
      setAnimateSize(false)
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
            onClick={() => {
              setAnimateSize(false)
              setWrap(!wrap)
            }}
          >
            <WrapText aria-hidden="true" />
          </Button>
          <CodeBlockCopyButton value={value} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <AnimatedCodeBlockContent
        preProps={preProps}
        initial={false}
        animate={{
          '--rdx-code-preview-height': `${previewHeight === null ? 0 : expanded ? fullHeight : previewHeight}px`,
        }}
        transition={{
          duration: animateSize ? 0.28 : 0,
          ease: [0.22, 1, 0.36, 1],
        }}
        id={contentId}
        style={contentStyle}
        wrap={wrap}
        lineNumbers={lineNumbers}
        startLine={startLine}
        className={[
          preProps.className,
          'data-wrap:wrap-anywhere',
          previewHeight !== null && 'overflow-y-hidden',
          collapsed && 'scroll-fade-y',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </AnimatedCodeBlockContent>
      {previewHeight !== null && (
        <CodeBlockFooter className="justify-center md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => {
              setAnimateSize(
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
              )
              setExpanded(!expanded)
            }}
          >
            {expanded ? messages.showLess : messages.showMore}
          </Button>
        </CodeBlockFooter>
      )}
    </CodeBlock>
  )
}
