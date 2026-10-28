'use client'

import { useMessages } from '../providers/locale-provider'

import { useEffect, useRef, useState } from 'react'
import { SidebarClose, SidebarOpen } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { Button } from './button'
import { Separator } from './separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from './sheet'

export type SidebarCategory = {
  title: string
  links: { href: string; label: string }[]
}

export function DocsSidebar({
  categories,
  pathname,
}: {
  categories: SidebarCategory[]
  pathname: string
}) {
  const messages = useMessages()
  const [isOpen, setOpen] = useState(false)
  const open = useRef(false)
  const actions = useRef<{ close: () => void; unmount: () => void } | null>(
    null
  )
  const previousPath = useRef(pathname)
  const reducedMotion = useReducedMotion()
  const pageOrder = new Map(
    categories
      .flatMap((category) => category.links)
      .map((page, index) => [page.href, index])
  )
  const currentIndex = pageOrder.get(pathname) ?? -1

  // Route changes (including browser history) must use the same closing phase
  // as Escape and the close button, keeping the content mounted until exit ends.
  useEffect(() => {
    if (previousPath.current !== pathname) actions.current?.close()
    previousPath.current = pathname
  }, [pathname])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = () => {
      if (desktop.matches) actions.current?.close()
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])
  const content = (
    <nav aria-label={messages.documentationPages}>
      {categories.map((category, index) => (
        <div
          key={`${index}:${category.title}`}
          className="flex flex-col gap-0.5 mb-3 first:mt-4"
        >
          <p className="text-xs text-ring font-semibold uppercase mb-1">
            {category.title}
          </p>
          {category.links.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              active={pathname === link.href}
              aria-label={link.label}
              href={link.href}
              transitionTypes={
                currentIndex < 0 || link.href === pathname
                  ? undefined
                  : [
                      pageOrder.get(link.href)! < currentIndex
                        ? 'rdx-doc-back'
                        : 'rdx-doc-forward',
                    ]
              }
              onClick={() => actions.current?.close()}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`justify-start text-sm ${pathname === link.href ? 'text-accent-foreground' : 'text-primary'}`}
            >
              {link.label}
            </Button>
          ))}
          {index < categories.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </nav>
  )
  return (
    <Sheet
      open={isOpen}
      actionsRef={actions}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen) details.preventUnmountOnClose()
        open.current = nextOpen
        setOpen(nextOpen)
      }}
    >
      <div className="md:hidden absolute top-2 left-4 z-30">
        <SheetTrigger
          render={<Button variant="ghost" />}
          aria-label={messages.openSidebar}
        >
          <SidebarOpen className="size-4" />
        </SheetTrigger>
      </div>
      <aside
        data-rdx-sidebar
        className="hidden md:block h-full w-40 lg:w-56 shrink-0 border-r border-border overflow-y-auto p-4"
      >
        {content}
      </aside>
      <AnimatePresence>
        {isOpen && (
          <SheetContent
            key="mobile-sidebar"
            side="left"
            showCloseButton={false}
            portalProps={{ keepMounted: true }}
            data-rdx-mobile-sidebar
            className="md:hidden w-full! max-w-none! h-dvh border-0 bg-background text-foreground gap-0 p-4 overflow-y-auto translate-none! opacity-100! transition-none!"
            render={
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  closed: { x: reducedMotion ? 0 : '-100%' },
                  open: { x: 0 },
                }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 300, damping: 30 }
                }
                onAnimationComplete={(phase) => {
                  if (phase === 'closed' && !open.current)
                    actions.current?.unmount()
                }}
              />
            }
          >
            <SheetTitle className="sr-only">
              {messages.documentationNavigation}
            </SheetTitle>
            <div className="flex justify-end mb-4">
              <SheetClose
                render={<Button variant="ghost" />}
                aria-label={messages.closeSidebar}
              >
                <SidebarClose className="size-4" />
              </SheetClose>
            </div>
            {content}
          </SheetContent>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
