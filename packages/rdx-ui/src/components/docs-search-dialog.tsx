'use client'

import { useMessages } from '../providers/locale-provider'

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FileText, Hash, LoaderCircle } from 'lucide-react'
import type { RdxSearchIndex } from '@lexibase/rdx-types'
import {
  prepareSearch,
  searchDocumentation,
  type PreparedSearch,
} from '../lib/docs-search'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'
import { formatMessage } from '../lib/i18n'

import { Button } from './button'

const cache = new Map<string, PreparedSearch>()

export function DocsSearchDialog({
  indexUrl,
  version,
  open,
  onOpenChange,
  triggerRef,
}: {
  indexUrl: string
  version: string
  open: boolean
  onOpenChange: (value: boolean) => void
  triggerRef: RefObject<HTMLButtonElement | null>
}) {
  const messages = useMessages()
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [state, setState] = useState<{
    entries?: PreparedSearch
    error?: boolean
  }>({})
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    async function load() {
      try {
        const cached =
          process.env.NODE_ENV === 'production'
            ? cache.get(indexUrl)
            : undefined
        let entries = cached
        if (!entries) {
          const response = await fetch(indexUrl, {
            signal: controller.signal,
            cache: 'no-store',
          })
          if (!response.ok) throw new Error('Search unavailable')
          entries = prepareSearch((await response.json()) as RdxSearchIndex)
          if (process.env.NODE_ENV === 'production') {
            if (cache.size >= 3) cache.delete(cache.keys().next().value!)
            cache.set(indexUrl, entries)
          }
        }
        if (!controller.signal.aborted) setState({ entries })
      } catch {
        if (!controller.signal.aborted) setState({ error: true })
      }
    }
    void load()
    return () => controller.abort()
  }, [open, indexUrl, retry])
  const results = useMemo(
    () => searchDocumentation(state.entries ?? [], deferred),
    [state.entries, deferred]
  )
  const loading = !state.entries && !state.error
  function select(href: string) {
    onOpenChange(false)
    setQuery('')
    // Native fragment navigation also scrolls when already on the target page.
    const url = new URL(href, window.location.origin)
    if (url.pathname === pathname && url.hash) window.location.assign(url.hash)
    else router.push(href)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        finalFocus={triggerRef}
        closeLabel={messages.closeSearch}
        overlayClassName="bg-black/30"
        className="top-[20%] w-[calc(100%-2rem)] max-w-lg translate-y-0 p-1 shadow-lg sm:max-w-lg"
      >
        <DialogTitle className="sr-only">
          {messages.searchDocumentation}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {formatMessage(messages.searchDescription, { version })}
        </DialogDescription>
        <Command shouldFilter={false} label={messages.searchDocumentation}>
          <CommandInput
            aria-label={messages.searchDocumentation}
            placeholder={messages.searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            maxLength={120}
          />
          <div className="px-2 pt-2 pb-1 text-[11px] text-muted-foreground">
            {version}
          </div>
          <CommandList
            aria-busy={loading}
            aria-label={messages.searchDocumentation}
          >
            {loading ? (
              <div
                role="status"
                className="flex justify-center gap-2 p-6 text-sm text-muted-foreground"
              >
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                {messages.loadingSearch}
              </div>
            ) : state.error ? (
              <div
                role="status"
                className="p-4 text-center text-sm text-muted-foreground"
              >
                {messages.searchUnavailable}{' '}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setState({})
                    setRetry((value) => value + 1)
                  }}
                >
                  {messages.tryAgain}
                </Button>
              </div>
            ) : !query.trim() ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {messages.typeToSearch}
              </div>
            ) : (
              <>
                <CommandEmpty>{messages.noResults}</CommandEmpty>
                {results.map((entry) => (
                  <CommandItem
                    key={entry.href}
                    value={entry.href}
                    onSelect={() => select(entry.href)}
                  >
                    {entry.section ? (
                      <Hash className="size-4 shrink-0 self-start mt-1 text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 shrink-0 self-start mt-1 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">
                        {entry.category}
                        {entry.section && ` · ${entry.title}`}
                      </div>
                      <div className="font-medium leading-5">
                        {entry.section || entry.title}
                      </div>
                      {entry.excerpt && (
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {entry.excerpt}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
          <div className="border-t px-2 py-2 text-[10px] text-muted-foreground">
            ↑ ↓ {messages.navigate}{' '}
            <span className="mx-2">↵ {messages.open}</span> Esc {messages.close}
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
