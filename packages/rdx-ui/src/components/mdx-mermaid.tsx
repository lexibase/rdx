'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { useTheme } from 'next-themes'
import {
  CodeXml,
  Eye,
  Maximize2,
  RotateCw,
  Workflow,
  WrapText,
} from 'lucide-react'

import { renderMermaid } from '../lib/mermaid'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog'

/** A Mermaid fence adapts the existing shadcn Code Block and Dialog. */
export function MdxMermaid({
  value,
  title,
  lineNumbers,
  startLine,
  preProps,
}: {
  value: string
  title?: string
  lineNumbers?: boolean
  startLine?: number
  preProps: ComponentProps<'pre'>
}) {
  const messages = useMessages()
  const { resolvedTheme } = useTheme()
  const block = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [sourceView, setSourceView] = useState(false)
  const [wrap, setWrap] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    source: string
    theme: string
    svg?: string
    error?: boolean
  }>()
  const current =
    result?.source === value && result.theme === resolvedTheme
      ? result
      : undefined
  const svg = current?.svg
  const error = current?.error
  const image = svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    : undefined
  const description = useMemo(() => {
    if (!svg) return title || messages.diagram
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    return [
      title || document.querySelector('title')?.textContent || messages.diagram,
      document.querySelector('desc')?.textContent,
    ]
      .filter(Boolean)
      .join('. ')
  }, [svg, title, messages.diagram])
  const label = title || 'Mermaid'
  const showSource = sourceView || !svg

  useEffect(() => {
    const element = block.current
    if (!element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !resolvedTheme) return
    let active = true
    const theme = resolvedTheme
    void renderMermaid(value, theme === 'dark', () => active).then(
      (svg) => {
        if (active && svg) setResult({ source: value, theme, svg })
      },
      () => {
        if (active) setResult({ source: value, theme, error: true })
      }
    )
    return () => {
      active = false
    }
  }, [value, resolvedTheme, visible, attempt])

  return (
    <CodeBlock
      ref={block}
      size="sm"
      data-rdx-code-block
      data-rdx-code-mode="mermaid"
      data-rdx-code-value={value}
      className="my-4 max-w-full"
    >
      <CodeBlockHeader>
        <CodeBlockTitle title={label}>
          <Workflow aria-hidden="true" /> {label}
        </CodeBlockTitle>
        <CodeBlockActions>
          {svg && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={
                sourceView ? messages.showDiagram : messages.showDiagramSource
              }
              title={
                sourceView ? messages.showDiagram : messages.showDiagramSource
              }
              aria-pressed={sourceView}
              onClick={() => setSourceView(!sourceView)}
            >
              {sourceView ? (
                <Eye aria-hidden="true" />
              ) : (
                <CodeXml aria-hidden="true" />
              )}
            </Button>
          )}
          {image && (
            <Dialog>
              <DialogTrigger
                render={<Button variant="ghost" size="icon-xs" />}
                aria-label={messages.enlargeDiagram}
                title={messages.enlargeDiagram}
              >
                <Maximize2 aria-hidden="true" />
              </DialogTrigger>
              <DialogContent
                data-rdx-mermaid-dialog
                className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-2 sm:max-w-6xl"
              >
                <DialogTitle className="pr-8">
                  {title || messages.diagram}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {messages.imagePreviewDescription}
                </DialogDescription>
                <div
                  role="region"
                  aria-label={messages.diagram}
                  tabIndex={0}
                  className="min-h-0 overflow-auto rounded-md p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={image}
                    alt={description}
                    className="mx-auto h-auto max-w-none"
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
          {error && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={messages.tryAgain}
              title={messages.tryAgain}
              onClick={() => setAttempt(attempt + 1)}
            >
              <RotateCw aria-hidden="true" />
            </Button>
          )}
          {showSource && (
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
          )}
          <CodeBlockCopyButton value={value} />
        </CodeBlockActions>
      </CodeBlockHeader>
      {error && (
        <p role="status" className="px-3 pt-2 text-xs text-muted-foreground">
          {messages.diagramError}
        </p>
      )}
      {!current && visible && (
        <p role="status" className="px-3 pt-2 text-xs text-muted-foreground">
          {messages.diagramLoading}
        </p>
      )}
      {showSource ? (
        <CodeBlockContent
          {...preProps}
          wrap={wrap}
          lineNumbers={lineNumbers}
          startLine={startLine}
        >
          {value}
        </CodeBlockContent>
      ) : (
        <div
          role="region"
          aria-label={title || messages.diagram}
          tabIndex={0}
          data-rdx-mermaid-preview
          className="min-w-0 overflow-auto p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <img
            src={image}
            alt={description}
            className="mx-auto h-auto max-w-full"
          />
        </div>
      )}
    </CodeBlock>
  )
}
