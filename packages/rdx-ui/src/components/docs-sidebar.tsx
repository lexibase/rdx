'use client'

import { useEffect, useRef, useState } from 'react'
import { SidebarClose, SidebarOpen } from 'lucide-react'
import Link from 'next/link'

import { Button } from './button'
import { Separator } from './separator'

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
  const [openPath, setOpenPath] = useState<string | null>(null)
  const isOpen = openPath === pathname
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (isOpen && !dialog.current?.open) dialog.current?.showModal()
    if (!isOpen && dialog.current?.open) dialog.current?.close()
  }, [isOpen])
  const content = (
    <nav aria-label="Documentation pages">
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
              className="justify-start"
              active={pathname === link.href}
              asChild
              aria-label={link.label}
            >
              <Link
                className="text-sm text-primary"
                href={link.href}
                onClick={() => setOpenPath(null)}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </Button>
          ))}
          {index < categories.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </nav>
  )
  return (
    <>
      <div className="md:hidden absolute top-2 left-4 z-30">
        <Button
          variant="ghost"
          onClick={() => setOpenPath(pathname)}
          aria-label="Open sidebar"
        >
          <SidebarOpen className="size-4" />
        </Button>
      </div>
      <aside
        data-rdx-sidebar
        className="hidden md:block h-full w-40 lg:w-56 shrink-0 border-r border-border overflow-y-auto p-4"
      >
        {content}
      </aside>
      <dialog
        ref={dialog}
        aria-label="Documentation navigation"
        onClose={() => setOpenPath(null)}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-background text-foreground border-0 p-4 backdrop:bg-black/40"
      >
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            onClick={() => setOpenPath(null)}
            aria-label="Close sidebar"
          >
            <SidebarClose className="size-4" />
          </Button>
        </div>
        {isOpen && content}
      </dialog>
    </>
  )
}
