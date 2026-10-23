'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import { cn } from '@lexibase/rdx-ui/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  type PopoverActions,
} from './popover'

type Heading = { id: string; title: string; depth: number }
type HeadingNode = Heading & { children: HeadingNode[] }

function headingTree(headings: Heading[]) {
  const roots: HeadingNode[] = []
  const parents: HeadingNode[] = []
  for (const heading of headings) {
    while (
      parents.length &&
      parents[parents.length - 1]!.depth >= heading.depth
    )
      parents.pop()
    const node: HeadingNode = { ...heading, children: [] }
    const siblings = parents[parents.length - 1]?.children ?? roots
    siblings.push(node)
    parents.push(node)
  }
  return roots
}

function HeadingLinks({
  nodes,
  baseDepth,
  activeId,
}: {
  nodes: HeadingNode[]
  baseDepth: number
  activeId: string
}) {
  return (
    <ol className="space-y-0.5">
      {nodes.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${encodeURIComponent(heading.id)}`}
            aria-current={heading.id === activeId ? 'location' : undefined}
            style={{ paddingLeft: 8 + (heading.depth - baseDepth) * 12 }}
            className={cn(
              'block rounded-md py-1.5 pr-2 text-xs leading-5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              heading.id === activeId &&
                'bg-accent/60 font-medium text-foreground'
            )}
          >
            {heading.title}
          </a>
          {heading.children.length > 0 && (
            <HeadingLinks
              nodes={heading.children}
              baseDepth={baseDepth}
              activeId={activeId}
            />
          )}
        </li>
      ))}
    </ol>
  )
}

/** Read the rendered MDX, sharing exactly the IDs used by document links. */
export function DocsToc({ contentId = 'rdx-main' }: { contentId?: string }) {
  const pathname = usePathname()
  return <PageToc key={pathname} contentId={contentId} />
}

function PageToc({ contentId }: { contentId: string }) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')
  const actions = useRef<PopoverActions | null>(null)

  useEffect(() => {
    const content = document.getElementById(contentId)
    if (!content) return
    let elements: HTMLHeadingElement[] = []
    let frame = 0
    let scrollRoot: HTMLElement | null = content.parentElement
    while (
      scrollRoot &&
      !/(auto|scroll)/.test(getComputedStyle(scrollRoot).overflowY)
    ) {
      scrollRoot = scrollRoot.parentElement
    }
    const scrollTarget = scrollRoot ?? window
    function updateActive() {
      frame = 0
      const top = (scrollRoot?.getBoundingClientRect().top ?? 0) + 96
      let current = elements[0]?.id ?? ''
      for (const heading of elements) {
        if (heading.getBoundingClientRect().top > top) break
        current = heading.id
      }
      setActiveId(current)
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(updateActive)
    }
    function collect() {
      if (!window.matchMedia('(min-width: 1280px)').matches)
        actions.current?.close()
      elements = Array.from(
        content!.querySelectorAll<HTMLHeadingElement>(
          'h2[id], h3[id], h4[id], h5[id], h6[id]'
        )
      ).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          !!element.id &&
          !!element.textContent?.trim() &&
          getComputedStyle(element).visibility !== 'hidden'
      )
      setHeadings(
        elements
          .map((element) => ({
            id: element.id,
            title: element.textContent?.trim() ?? '',
            depth: Number(element.tagName.slice(1)),
          }))
          .filter((heading) => heading.title)
      )
      schedule()
    }
    const initialFrame = requestAnimationFrame(collect)
    const observer = new MutationObserver(collect)
    observer.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['hidden', 'style', 'class', 'id'],
    })
    scrollTarget.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', collect)
    const resize = new ResizeObserver(schedule)
    resize.observe(content)
    return () => {
      observer.disconnect()
      resize.disconnect()
      scrollTarget.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', collect)
      cancelAnimationFrame(frame)
      cancelAnimationFrame(initialFrame)
    }
  }, [contentId])

  if (headings.length < 2) return null
  const baseDepth = Math.min(...headings.map((heading) => heading.depth))
  return (
    <aside
      data-rdx-toc
      className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 xl:block"
    >
      <Popover actionsRef={actions}>
        <PopoverTrigger
          openOnHover
          delay={120}
          aria-label="On this page"
          className="flex max-h-[40vh] w-12 flex-col items-end gap-2 overflow-hidden rounded-md p-3 text-muted-foreground/40 outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {headings.map((heading) => (
            <span
              key={heading.id}
              aria-hidden="true"
              className={cn(
                'h-0.5 shrink-0 rounded-full bg-current transition-colors',
                heading.depth === baseDepth ? 'w-5' : 'w-3',
                heading.id === activeId && 'text-foreground'
              )}
            />
          ))}
        </PopoverTrigger>
        <PopoverContent
          side="left"
          sideOffset={0}
          onMouseLeave={(event) => {
            // Base UI keeps click-opened popovers pinned; the TOC instead
            // stays open only while the pointer is over its popup or marks.
            if (
              event.relatedTarget instanceof Element &&
              event.relatedTarget.closest('[data-rdx-toc]')
            )
              return
            actions.current?.close()
          }}
          className="hidden max-h-[min(60vh,var(--available-height))] w-64 overflow-y-auto xl:flex"
        >
          <PopoverTitle className="px-2 pt-1 text-xs text-muted-foreground">
            On this page
          </PopoverTitle>
          <nav aria-label="On this page">
            <HeadingLinks
              nodes={headingTree(headings)}
              baseDepth={baseDepth}
              activeId={activeId}
            />
          </nav>
        </PopoverContent>
      </Popover>
    </aside>
  )
}
