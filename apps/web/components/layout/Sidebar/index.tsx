'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { DocCategory } from '@rdx/types/loaders'

import { DesktopSidebar } from './Desktop'
import { MobileSidebar } from './Mobile'
import { SidebarToggle } from './toggle'

export const Sidebar = ({ categories }: { categories: DocCategory[] }) => {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <SidebarToggle onToggle={() => setIsOpen(!isOpen)} />

      <aside className="h-screen w-auto md:w-40 lg:w-56 flex-shrink-0 transition-all">
        <div className="h-full hidden md:block">
          <DesktopSidebar pathname={pathname} categories={categories} />
        </div>
        <div className="w-full md:hidden block relative hidden">
          <MobileSidebar
            pathname={pathname}
            categories={categories}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </aside>
    </>
  )
}
