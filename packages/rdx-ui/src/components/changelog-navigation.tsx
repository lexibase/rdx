'use client'

import { Check, Link2, ListFilter, Rss } from 'lucide-react'
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { cn } from '../lib/utils'
import { useMessages } from '../providers/locale-provider'
import { Badge } from './badge'
import { Button, buttonVariants } from './button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Separator } from './separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'

export function ChangelogFeedLink({ href }: { href: string }) {
  const { changelogFeed } = useMessages()
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={href}
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
              aria-label={changelogFeed}
            />
          }
        >
          <Rss aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent role="tooltip">{changelogFeed}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const changelogBadgeStyles = {
  breaking: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  security: 'bg-red-500/10 text-red-800 dark:text-red-300',
  deprecated: 'bg-violet-500/10 text-violet-800 dark:text-violet-300',
}

type ChangelogBadge = keyof typeof changelogBadgeStyles

const changelogBadgeLabels = {
  breaking: 'changelogBreakingBadge',
  security: 'changelogSecurityBadge',
  deprecated: 'changelogDeprecatedBadge',
} as const

type ChangelogRelease = {
  version: string
  badges: ChangelogBadge[]
  note: ReactNode
}

export function ChangelogContent({
  feedHref,
  releases,
}: {
  feedHref: string
  releases: ChangelogRelease[]
}) {
  const messages = useMessages()
  const [selected, setSelected] = useState<ChangelogBadge[]>([])
  const pendingAnchor = useRef<string | null>(null)
  const options = [...new Set(releases.flatMap(({ badges }) => badges))]
  const versions = useMemo(
    () =>
      releases
        .filter(
          ({ badges }) =>
            !selected.length || selected.some((badge) => badges.includes(badge))
        )
        .map(({ version }) => version),
    [releases, selected]
  )
  const visibleVersions = useMemo(() => new Set(versions), [versions])

  useEffect(() => {
    function revealLinkedRelease() {
      const hash = window.location.hash
      const linked = releases.find(
        ({ version }) =>
          hash === `#v${version}` || hash === `#v${encodeURIComponent(version)}`
      )
      if (linked && !visibleVersions.has(linked.version)) {
        pendingAnchor.current = `v${linked.version}`
        setSelected([])
      }
    }
    window.addEventListener('hashchange', revealLinkedRelease)
    return () => window.removeEventListener('hashchange', revealLinkedRelease)
  }, [releases, visibleVersions])

  useEffect(() => {
    if (pendingAnchor.current && !selected.length) {
      document.getElementById(pendingAnchor.current)?.scrollIntoView()
      pendingAnchor.current = null
    }
  }, [selected])

  return (
    <div className="mx-auto grid max-w-5xl gap-x-10 px-6 py-10 sm:py-14 md:grid-cols-[10rem_minmax(0,1fr)]">
      <div className="mb-8 flex flex-wrap items-center gap-2 md:col-start-2 md:row-start-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {messages.changelog}
          </h1>
          <ChangelogFeedLink href={feedHref} />
        </div>
        {options.length > 0 && (
          <div className="ms-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <ListFilter aria-hidden="true" />
                {messages.changelogFilter}
                {selected.length > 0 && (
                  <span className="text-muted-foreground">
                    ({selected.length})
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {options.map((badge) => (
                  <DropdownMenuCheckboxItem
                    key={badge}
                    checked={selected.includes(badge)}
                    closeOnClick={false}
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked
                          ? [...current, badge]
                          : current.filter((value) => value !== badge)
                      )
                    }
                  >
                    {messages[changelogBadgeLabels[badge]]}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!selected.length}
                  onClick={() => setSelected([])}
                >
                  {messages.changelogClearFilters}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {versions.length > 0 && <ChangelogVersions versions={versions} />}
      <div className="min-w-0 md:col-start-2 md:row-start-2">
        {releases.length === 0 && (
          <p className="text-muted-foreground">{messages.changelogEmpty}</p>
        )}
        {releases.map(({ version, note }) => (
          <article
            key={version}
            id={`v${version}`}
            tabIndex={-1}
            hidden={!visibleVersions.has(version)}
            className="scroll-mt-6 border-t py-7"
          >
            {note}
          </article>
        ))}
      </div>
    </div>
  )
}

export function ChangelogBadges({ badges }: { badges: ChangelogBadge[] }) {
  const messages = useMessages()
  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {badges.map((badge) => (
        <Badge
          key={badge}
          variant="secondary"
          className={changelogBadgeStyles[badge]}
        >
          {messages[changelogBadgeLabels[badge]]}
        </Badge>
      ))}
    </div>
  )
}

function ChangelogVersions({ versions }: { versions: string[] }) {
  const messages = useMessages()
  const navigation = useRef<HTMLElement>(null)
  const [active, setActive] = useState(versions[0])

  function goToRelease(event: MouseEvent<HTMLAnchorElement>, version: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return

    const scroller = navigation.current?.closest('main')
    const target = document.getElementById(`v${version}`)
    if (!scroller || !target) return

    event.preventDefault()
    const hash = `#v${encodeURIComponent(version)}`
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
    if (event.detail === 0) target.focus({ preventScroll: true })

    const margin =
      Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
    const top =
      scroller.scrollTop +
      target.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top -
      scroller.clientTop -
      margin
    scroller.scrollTo({
      top,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }

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
              onClick={(event) => goToRelease(event, version)}
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={<Button type="button" variant="ghost" size="icon-xs" />}
            aria-label={`${messages.changelogCopyLink} v${version}`}
            onClick={copy}
          >
            <Icon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent role="tooltip">
            {messages.changelogCopyLink}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
