'use client'

import { useMessages } from '../providers/locale-provider'

import { useMemo } from 'react'
import type { RdxPageHighlight } from '@lexibase/rdx-types'

import { useRegisterMobileNavigation } from '../lib/mobile-navigation'

import { Button } from './button'
import { HighlightDot } from './highlight-dot'
import { Separator } from './separator'

export type SidebarCategory = {
  title: string
  links: { href: string; label: string; highlighting?: RdxPageHighlight }[]
}

/** The documentation tree shared by the wide sidebar and the mobile menu. */
export function DocsSidebarNavigation({
  categories,
  pathname,
  onNavigate,
}: {
  categories: SidebarCategory[]
  pathname: string
  onNavigate?: () => void
}) {
  const messages = useMessages()
  const pageOrder = new Map(
    categories
      .flatMap((category) => category.links)
      .map((page, index) => [page.href, index])
  )
  const currentIndex = pageOrder.get(pathname) ?? -1
  return (
    <nav aria-label={messages.documentationPages}>
      {categories.map((category, index) => (
        <div
          key={`${index}:${category.title}`}
          className="flex min-w-0 flex-col gap-0.5 mb-3 first:mt-4"
        >
          <p className="text-xs text-ring font-semibold uppercase mb-1 [overflow-wrap:anywhere]">
            {category.title}
          </p>
          {category.links.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              active={pathname === link.href}
              aria-label={
                link.highlighting
                  ? `${link.label} (${link.highlighting === 'important' ? messages.sidebarImportant : messages.sidebarNew})`
                  : link.label
              }
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
              onClick={onNavigate}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`h-auto min-h-8 w-full min-w-0 justify-start whitespace-normal py-1.5 text-left text-sm [overflow-wrap:anywhere] ${pathname === link.href ? 'text-accent-foreground' : 'text-primary'}`}
            >
              {link.label}
              {link.highlighting && (
                <HighlightDot
                  kind={link.highlighting}
                  data-rdx-sidebar-highlight={link.highlighting}
                  className="ms-auto"
                />
              )}
            </Button>
          ))}
          {index < categories.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </nav>
  )
}

/**
 * Wide screens show the tree beside the page. Narrow screens open the same tree
 * from the navbar menu, which reads it from the mobile navigation registry.
 */
export function DocsSidebar({
  categories,
  pathname,
}: {
  categories: SidebarCategory[]
  pathname: string
}) {
  const docs = useMemo(() => ({ categories, pathname }), [categories, pathname])
  useRegisterMobileNavigation('docs', docs)
  return (
    <aside
      data-rdx-sidebar
      className="hidden md:block h-full w-40 lg:w-56 shrink-0 border-r border-border overflow-y-auto scrollbar-none p-4"
    >
      <DocsSidebarNavigation categories={categories} pathname={pathname} />
    </aside>
  )
}
