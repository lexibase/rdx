'use client'

import { useMessages } from '../providers/locale-provider'

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Languages,
  Menu,
  SidebarClose,
  SidebarOpen,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { formatMessage } from '../lib/i18n'
import { useMobileNavigationEntries } from '../lib/mobile-navigation'

import { Button } from './button'
import { DocsSidebarNavigation } from './docs-sidebar'
import { Separator } from './separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from './sheet'
import {
  VersionIcon,
  versionIconColor,
  type VersionOption,
} from './version-dropdown'

type Panel = 'main' | 'docs' | 'versions' | 'languages'

// Deeper panels enter from the right; returning to the menu slides back.
const depth: Record<Panel, number> = {
  main: 0,
  docs: 1,
  versions: 1,
  languages: 1,
}

// A calm deceleration without overshoot, shared by the drawer and its panels.
const easeOut = [0.32, 0.72, 0, 1] as const

const rowClassName =
  'h-11 w-full min-w-0 justify-start gap-3 px-2 text-base font-normal'

/**
 * Narrow-screen navigation. Documentation pages open straight into the page
 * tree; the main menu holds the version, language, site links and actions.
 */
export function MobileNavigation({
  links,
  actions,
}: {
  links?: ReactNode
  actions?: ReactNode
}) {
  const messages = useMessages()
  const { docs, versions, languages } = useMobileNavigationEntries()
  const [isOpen, setOpen] = useState(false)
  const open = useRef(false)
  const sheet = useRef<{ close: () => void; unmount: () => void } | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<Panel>('main')
  const [direction, setDirection] = useState(1)
  const moveFocus = useRef(false)
  const reducedMotion = useReducedMotion()
  const pathname = usePathname()
  const previousPath = useRef(pathname)
  const close = () => sheet.current?.close()

  // Route changes (including browser history) must use the same closing phase
  // as Escape and the close button, keeping the content mounted until exit ends.
  useEffect(() => {
    if (previousPath.current !== pathname) sheet.current?.close()
    previousPath.current = pathname
  }, [pathname])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = () => {
      if (desktop.matches) sheet.current?.close()
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])
  // Keyboard and screen reader users land at the top of the panel they opened.
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    content.current
      ?.querySelector<HTMLElement>(
        `[data-rdx-mobile-panel="${panel}"] :is(button, a):not([data-rdx-mobile-close])`
      )
      ?.focus()
  }, [panel])

  const go = (next: Panel) => {
    setDirection(depth[next] >= depth[panel] ? 1 : -1)
    moveFocus.current = true
    setPanel(next)
  }

  const currentVersion =
    versions?.options.find((option) => option.id === versions.currentId) ??
    versions?.options[0]
  const currentLanguage = languages?.options.find(
    (option) => option.code === languages.current
  )
  const closeLabel = docs ? messages.closeSidebar : messages.closeMenu

  const header = (start: ReactNode) => (
    <div className="flex min-h-10 items-center justify-between gap-2">
      {start}
      <SheetClose
        render={<Button variant="ghost" size="icon" />}
        aria-label={closeLabel}
        data-rdx-mobile-close
      >
        {docs ? (
          <SidebarClose className="size-4" aria-hidden="true" />
        ) : (
          <X className="size-4" aria-hidden="true" />
        )}
      </SheetClose>
    </div>
  )
  const back = (label: string, to: Panel) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ms-2 gap-1"
      onClick={() => go(to)}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Button>
  )
  const drill = (
    to: Panel,
    icon: ReactNode,
    text: string,
    accessibleName?: string
  ) => (
    <Button
      variant="ghost"
      className={rowClassName}
      aria-label={accessibleName}
      onClick={() => go(to)}
      data-rdx-mobile-drill={to}
    >
      {icon}
      <span className="min-w-0 truncate">{text}</span>
      <ChevronRight
        className="ms-auto size-4 text-muted-foreground"
        aria-hidden="true"
      />
    </Button>
  )

  const versionItem = (option: VersionOption) => {
    const selected = option.id === currentVersion?.id
    const label = (
      <>
        <span className={versionIconColor(option.kind)}>
          <VersionIcon kind={option.kind} />
        </span>
        <span
          className={`min-w-0 truncate capitalize ${option.kind === 'archived' ? 'text-muted-foreground line-through' : ''}`}
        >
          {option.label}
        </span>
        {selected && <Check className="ms-auto size-4" aria-hidden="true" />}
      </>
    )
    const className = `${rowClassName} ${selected ? 'bg-accent/30' : ''}`
    return versions?.onSelect ? (
      <Button
        key={option.id}
        variant="ghost"
        className={className}
        aria-current={selected ? 'true' : undefined}
        onClick={() => {
          versions.onSelect!(option.id)
          close()
        }}
      >
        {label}
      </Button>
    ) : (
      <Button
        key={option.id}
        variant="ghost"
        className={className}
        href={option.href}
        aria-current={selected ? 'true' : undefined}
        onClick={close}
      >
        {label}
      </Button>
    )
  }

  const panels: Record<Panel, () => ReactNode> = {
    docs: () =>
      docs && (
        <>
          {header(back(messages.mainMenu, 'main'))}
          <DocsSidebarNavigation
            categories={docs.categories}
            pathname={docs.pathname}
            onNavigate={close}
          />
        </>
      ),
    main: () => (
      <>
        {header(
          <p className="px-0.5 text-xs font-semibold uppercase text-ring">
            {messages.mainMenu}
          </p>
        )}
        {(docs || currentVersion || currentLanguage) && (
          <div className="mt-2 flex flex-col gap-1">
            {docs &&
              drill(
                'docs',
                <SidebarOpen className="size-4" aria-hidden="true" />,
                messages.documentationPages
              )}
            {currentVersion &&
              drill(
                'versions',
                <span className={versionIconColor(currentVersion.kind)}>
                  <VersionIcon kind={currentVersion.kind} />
                </span>,
                currentVersion.label,
                formatMessage(messages.documentationVersion, {
                  version: currentVersion.label,
                })
              )}
            {currentLanguage &&
              drill(
                'languages',
                <Languages className="size-4" aria-hidden="true" />,
                currentLanguage.label,
                `${messages.documentationLanguage}: ${currentLanguage.label}`
              )}
          </div>
        )}
        {links && (
          <>
            <Separator className="my-3" />
            <div
              data-rdx-mobile-links
              className="flex flex-col items-stretch gap-1 [&_a]:h-11 [&_a]:w-full [&_a]:justify-start [&_a]:px-2 [&_a]:text-base"
            >
              {links}
            </div>
          </>
        )}
        {actions && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center gap-2">{actions}</div>
          </>
        )}
      </>
    ),
    versions: () =>
      versions && (
        <>
          {header(back(messages.back, 'main'))}
          <div className="mt-2 flex flex-col gap-1">
            {versions.options
              .filter((option) => option.kind === 'live')
              .map(versionItem)}
            {versions.options
              .filter((option) => option.kind === 'version')
              .map(versionItem)}
            {versions.options.some((option) => option.kind === 'archived') && (
              <>
                <Separator className="my-2" />
                <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                  {messages.archived}
                </p>
                {versions.options
                  .filter((option) => option.kind === 'archived')
                  .map(versionItem)}
              </>
            )}
          </div>
        </>
      ),
    languages: () =>
      languages && (
        <>
          {header(back(messages.back, 'main'))}
          <div className="mt-2 flex flex-col gap-1">
            {languages.options.map((option) => {
              const selected = option.code === languages.current
              return (
                <Button
                  key={option.code}
                  variant="ghost"
                  className={`${rowClassName} ${selected ? 'bg-accent/30' : ''}`}
                  nativeButton={false}
                  // A new document lets the locale layout initialize its theme script.
                  render={<a href={option.href} hrefLang={option.code} />}
                  aria-current={selected ? 'true' : undefined}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected && (
                    <Check className="ms-auto size-4" aria-hidden="true" />
                  )}
                </Button>
              )
            })}
            {languages.contributionUrl && (
              <>
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  className={rowClassName}
                  nativeButton={false}
                  render={
                    <a
                      href={languages.contributionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  data-rdx-help-translate
                >
                  {messages.helpTranslate}
                  <ExternalLink
                    className="ms-auto size-3.5"
                    aria-hidden="true"
                  />
                  <span className="sr-only"> ({messages.opensInNewTab})</span>
                </Button>
              </>
            )}
          </div>
        </>
      ),
  }

  return (
    <Sheet
      open={isOpen}
      actionsRef={sheet}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) {
          setPanel(docs ? 'docs' : 'main')
          setDirection(1)
        } else details.preventUnmountOnClose()
        open.current = nextOpen
        setOpen(nextOpen)
      }}
    >
      <SheetTrigger
        render={<Button variant="ghost" size="icon" />}
        data-rdx-menu-trigger
      >
        {/* The server already knows whether this page has a sidebar. */}
        <span className="contents [body:has([data-rdx-sidebar])_&]:hidden">
          <Menu className="size-4" aria-hidden="true" />
          <span className="sr-only">{messages.openMenu}</span>
        </span>
        <span className="hidden [body:has([data-rdx-sidebar])_&]:contents">
          <SidebarOpen className="size-4" aria-hidden="true" />
          <span className="sr-only">{messages.openSidebar}</span>
        </span>
      </SheetTrigger>
      <AnimatePresence>
        {isOpen && (
          <SheetContent
            key="mobile-navigation"
            side="right"
            showCloseButton={false}
            portalProps={{ keepMounted: true }}
            data-rdx-mobile-sidebar
            data-rdx-mobile-navigation
            className="md:hidden w-full! max-w-none! h-dvh border-0 bg-background text-foreground gap-0 p-4 overflow-y-auto scrollbar-none translate-none! opacity-100! transition-none!"
            render={
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  closed: { x: reducedMotion ? 0 : '100%' },
                  open: { x: 0 },
                }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'tween', ease: easeOut, duration: 0.35 }
                }
                onAnimationComplete={(phase) => {
                  if (phase === 'closed' && !open.current)
                    sheet.current?.unmount()
                }}
              />
            }
          >
            <SheetTitle className="sr-only">
              {docs
                ? messages.documentationNavigation
                : messages.mainNavigation}
            </SheetTitle>
            <div ref={content} className="relative flex-1 overflow-x-clip">
              <AnimatePresence
                initial={false}
                mode="popLayout"
                custom={direction}
              >
                <motion.div
                  key={panel}
                  data-rdx-mobile-panel={panel}
                  custom={direction}
                  variants={{
                    enter: (side: number) => ({
                      x: reducedMotion ? 0 : `${side * 100}%`,
                    }),
                    center: { x: 0 },
                    leave: (side: number) => ({
                      x: reducedMotion ? 0 : `${side * -100}%`,
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="leave"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'tween', ease: easeOut, duration: 0.3 }
                  }
                  className="w-full"
                >
                  {(panels[panel]() || panels.main()) as ReactNode}
                </motion.div>
              </AnimatePresence>
            </div>
          </SheetContent>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
