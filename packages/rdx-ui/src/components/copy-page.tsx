'use client'

import { Check, ChevronDown, CircleAlert, Copy, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useMessages } from '../providers/locale-provider'
import { Button } from './button'
import { ButtonGroup } from './button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

export function CopyPage({ href }: { href: string }) {
  const messages = useMessages()
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>(
    'idle'
  )
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const request = useRef<AbortController | undefined>(undefined)

  useEffect(
    () => () => {
      request.current?.abort()
      clearTimeout(timer.current)
    },
    []
  )

  async function copyPage() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    clearTimeout(timer.current)
    setStatus('copying')

    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      const markdown = fetch(href, { signal: controller.signal }).then(
        (response) => {
          if (
            !response.ok ||
            !response.headers.get('content-type')?.startsWith('text/markdown')
          )
            throw new Error('Markdown unavailable')
          return response.text()
        }
      )
      if (navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        // Initiate the write inside the click's activation, even while fetching.
        const blob = markdown.then(
          (text) => new Blob([text], { type: 'text/plain' })
        )
        // ClipboardItem construction can fail before the browser consumes the blob.
        void blob.catch(() => {})
        await Promise.all([
          blob,
          navigator.clipboard.write([
            new ClipboardItem({ 'text/plain': blob }),
          ]),
        ])
      } else {
        await navigator.clipboard.writeText(await markdown)
      }
      if (controller.signal.aborted) return
      setStatus('copied')
      timer.current = setTimeout(() => setStatus('idle'), 1800)
    } catch {
      if (!controller.signal.aborted) setStatus('error')
      controller.abort()
    } finally {
      request.current = undefined
    }
  }

  const Icon =
    status === 'copied' ? Check : status === 'error' ? CircleAlert : Copy

  return (
    <ButtonGroup
      aria-label={messages.copyPageOptions}
      className="ms-auto shrink-0"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copyPage}
        aria-busy={status === 'copying'}
        title={status === 'error' ? messages.copyPageError : undefined}
      >
        <Icon aria-hidden="true" />
        {messages.copyThisPage}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={messages.copyPageOptions}
          render={<Button type="button" variant="outline" size="icon-sm" />}
        >
          <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLinkItem
            render={<a href={href} target="_blank" rel="noopener noreferrer" />}
            closeOnClick
          >
            <FileText aria-hidden="true" />
            {messages.viewMarkdown}
            <span className="sr-only"> ({messages.opensInNewTab})</span>
          </DropdownMenuLinkItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span role="status" className="sr-only">
        {status === 'copied'
          ? messages.pageCopied
          : status === 'error'
            ? messages.copyPageError
            : ''}
      </span>
    </ButtonGroup>
  )
}
