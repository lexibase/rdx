'use client'

import { Check, Hash } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'

import { useMessages } from '../providers/locale-provider'

export function HeadingPermalink({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  const messages = useMessages()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const href = `#${encodeURIComponent(id)}`

  async function copy(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      !navigator.clipboard?.writeText
    )
      return

    try {
      await navigator.clipboard.writeText(event.currentTarget.href)
    } catch {
      // The native link still takes the reader to the section.
      return
    }

    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }

  const Icon = copied ? Check : Hash

  return (
    <>
      <a
        href={href}
        onClick={copy}
        title={messages.sectionPermalink}
        className="rounded-sm text-inherit no-underline underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {children}
      </a>
      <span
        aria-hidden="true"
        className="pointer-events-none ms-1 inline-flex size-6 items-center justify-center align-middle text-muted-foreground pointer-fine:opacity-0 pointer-fine:group-hover/mdx-heading:opacity-100 pointer-fine:group-focus-within/mdx-heading:opacity-100"
      >
        <Icon className="size-4" />
      </span>
      <span role="status" className="sr-only">
        {copied ? messages.sectionLinkCopied : ''}
      </span>
    </>
  )
}
