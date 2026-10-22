'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { mergeStateClassName } from '../lib/utils'
import { Button } from './button'

// Keep document structure and code whitespace, excluding interactive UI chrome.
function panelText(node: Node): string {
  if (node.nodeType === 3) {
    const text = node.textContent ?? ''
    return text.includes('\n') && !text.trim() ? '' : text
  }
  if (!(node instanceof HTMLElement)) return ''
  if (
    node.hidden ||
    node.inert ||
    node.getAttribute('aria-hidden') === 'true' ||
    node.matches(
      'button, [role="status"], [data-slot="tabs-header"], script, style'
    )
  )
    return ''
  if (node.matches('[data-rdx-code-block]')) {
    return `${node.querySelector('pre')?.textContent ?? ''}\n`
  }
  if (node.tagName === 'PRE') return `${node.textContent ?? ''}\n`
  if (node.tagName === 'BR') return '\n'
  const text = Array.from(node.childNodes, panelText).join('')
  if (!text) return ''
  if (
    node.matches('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, div, aside')
  ) {
    return text.endsWith('\n\n')
      ? text
      : text + (text.endsWith('\n') ? '\n' : '\n\n')
  }
  if (node.matches('li, tr')) return `${text}\n`
  if (node.matches('th, td')) return `${text}\t`
  return text
}

function CopyTabButton() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const pending = useRef(false)
  const mounted = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])

  async function copy(button: HTMLButtonElement) {
    if (pending.current) return
    pending.current = true
    clearTimeout(timer.current)
    try {
      const root = button.closest('[data-slot="tabs"]')
      const panel = Array.from(
        root?.querySelectorAll<HTMLElement>('[role="tabpanel"]') ?? []
      ).find(
        (element) =>
          element.closest('[data-slot="tabs"]') === root &&
          !element.hidden &&
          !element.inert
      )
      if (!panel || !navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(
        panelText(panel).replace(/^\n+|\n+$/g, '')
      )
      if (mounted.current) {
        setStatus('copied')
        timer.current = setTimeout(() => setStatus('idle'), 2000)
      }
    } catch {
      if (mounted.current) setStatus('error')
    } finally {
      pending.current = false
    }
  }

  const Icon = status === 'copied' ? Check : Copy
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Copy active tab"
        title={
          status === 'error'
            ? 'Could not copy. Select the tab content and copy it manually.'
            : status === 'copied'
              ? 'Copied!'
              : 'Copy active tab'
        }
        data-status={status}
        className="mr-1.5 size-7 shrink-0 text-muted-foreground hover:text-foreground data-[status=copied]:text-emerald-700 dark:data-[status=copied]:text-emerald-400 data-[status=error]:text-amber-600 [&>svg]:size-3.5"
        onClick={(event) => copy(event.currentTarget)}
      >
        <Icon aria-hidden="true" />
      </Button>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {status === 'copied'
          ? 'Tab content copied to clipboard.'
          : status === 'error'
            ? 'Could not copy. Select the tab content and copy it manually.'
            : ''}
      </span>
    </>
  )
}

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={mergeStateClassName(
        'my-6 min-w-0 max-w-full rounded-lg border border-border bg-muted/20 text-foreground',
        className
      )}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <div
      data-slot="tabs-header"
      className="flex min-w-0 items-center rounded-t-lg border-b border-border bg-muted/30"
    >
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={mergeStateClassName(
          'flex min-w-0 flex-1 gap-0.5 overflow-x-auto p-1.5 data-[orientation=vertical]:flex-col',
          className
        )}
        {...props}
      />
      <CopyTabButton />
    </div>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={mergeStateClassName(
        'relative shrink-0 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-active:border-border data-active:bg-background data-active:text-foreground data-active:shadow-xs data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-transparent data-disabled:hover:text-muted-foreground motion-reduce:transition-none',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={mergeStateClassName(
        'min-w-0 rounded-b-lg p-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&>[data-rdx-code-block]]:my-3 [&_[data-rdx-code-block]>pre]:p-3',
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
