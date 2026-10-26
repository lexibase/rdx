'use client'

import { useMessages } from '../providers/locale-provider'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Search } from 'lucide-react'
import { Button } from './button'
import { Kbd } from './kbd'

const SearchDialog = dynamic(
  () =>
    import('./docs-search-dialog').then((module) => module.DocsSearchDialog),
  { ssr: false }
)

/** Only the small trigger/shortcut is loaded until the first search opens. */
export function DocsSearch({
  indexUrl,
  version,
}: {
  indexUrl: string
  version: string
}) {
  const messages = useMessages()
  const [open, setOpen] = useState(false)
  const [activated, setActivated] = useState(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  function show() {
    setActivated(true)
    setOpen(true)
  }
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== 'k' ||
        (!event.ctrlKey && !event.metaKey) ||
        event.altKey ||
        event.isComposing ||
        event.repeat
      )
        return
      event.preventDefault()
      setActivated(true)
      setOpen((value) => !value)
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])
  return (
    <>
      <Button
        ref={trigger}
        data-rdx-search-trigger
        variant="outline"
        size="sm"
        aria-label={messages.searchDocumentation}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
        className="h-8 gap-2 px-2 text-muted-foreground sm:min-w-40 sm:justify-start"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">{messages.search}</span>
        <Kbd
          className="ml-auto hidden h-auto rounded border bg-transparent px-1 text-[10px] text-muted-foreground sm:inline"
          aria-hidden="true"
        >
          ⌘ / Ctrl K
        </Kbd>
      </Button>
      {activated && (
        <SearchDialog
          key={indexUrl}
          indexUrl={indexUrl}
          version={version}
          open={open}
          onOpenChange={setOpen}
          triggerRef={trigger}
        />
      )}
    </>
  )
}
