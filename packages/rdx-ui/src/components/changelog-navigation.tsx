'use client'

import { Check, Link2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '../lib/utils'
import { useMessages } from '../providers/locale-provider'
import { Button } from './button'
import { Separator } from './separator'

export function ChangelogVersions({ versions }: { versions: string[] }) {
  const messages = useMessages()
  const navigation = useRef<HTMLElement>(null)
  const [active, setActive] = useState(versions[0])

  useEffect(() => {
    const main = navigation.current?.closest('main')
    if (!main) return
    const scroller = main
    const releases = versions.flatMap((version) => {
      const element = document.getElementById(`v${version}`)
      return element ? [{ version, element }] : []
    })
    let frame = 0
    let requestedHash = window.location.hash

    function update() {
      frame = 0
      const { top, bottom } = scroller.getBoundingClientRect()
      const atEnd =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      const linked = releases.find(
        ({ version }) => requestedHash === `#v${version}`
      )
      // A deep link can land at the bottom when the remaining notes are short.
      if (linked) {
        const linkedTop = linked.element.getBoundingClientRect().top
        if (atEnd && linkedTop >= top && linkedTop < bottom) {
          setActive(linked.version)
          return
        }
        requestedHash = ''
      }
      let current = releases[0]?.version
      for (const { version, element } of releases) {
        if (element.getBoundingClientRect().top > top + 96) break
        current = version
      }
      if (atEnd && scroller.scrollHeight > scroller.clientHeight + 2)
        current = releases.at(-1)?.version
      setActive(current)
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    function followHash() {
      requestedHash = window.location.hash
      schedule()
    }

    const resize = new ResizeObserver(schedule)
    resize.observe(scroller)
    for (const { element } of releases) resize.observe(element)
    scroller.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('hashchange', followHash)
    schedule()
    return () => {
      resize.disconnect()
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('hashchange', followHash)
    }
  }, [versions])

  return (
    <nav
      ref={navigation}
      aria-label={messages.changelogVersions}
      className="mb-8 self-start md:sticky md:top-6 md:col-start-1 md:row-span-2 md:row-start-1 md:mb-0 md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto"
    >
      <p className="text-sm font-medium md:mb-3 md:flex md:h-14 md:items-end">
        {messages.changelogVersions}
      </p>
      <Separator className="my-3 md:mt-0" />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 md:flex-col">
        {versions.map((version) => (
          <li key={version}>
            <a
              href={`#v${version}`}
              aria-current={active === version ? 'location' : undefined}
              className={cn(
                'block rounded-md px-2 py-1 font-mono text-sm break-all text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring',
                active === version &&
                  'bg-accent/60 font-medium text-rdx-selected'
              )}
            >
              {`v${version}`}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function CopyReleaseLink({ version }: { version: string }) {
  const messages = useMessages()
  const [status, setStatus] = useState<'copied' | 'error'>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      const url = new URL(window.location.href)
      url.search = ''
      url.hash = `v${version}`
      await navigator.clipboard.writeText(url.href)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus(undefined), 1800)
  }

  const Icon = status === 'copied' ? Check : Link2
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`${messages.changelogCopyLink} v${version}`}
        title={messages.changelogCopyLink}
        onClick={copy}
      >
        <Icon aria-hidden="true" />
      </Button>
      <span role="status" className="sr-only">
        {status === 'copied'
          ? messages.changelogLinkCopied
          : status === 'error'
            ? messages.changelogCopyError
            : ''}
      </span>
    </>
  )
}
