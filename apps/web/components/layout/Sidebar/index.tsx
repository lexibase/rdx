'use client'

import { useState } from 'react'
import { SidebarOpen } from 'lucide-react'
import { Button } from '@rdx/ui/components/button'
import { usePathname } from 'next/navigation'
import type { DocCategory } from '@rdx/types/loaders'

import { DesktopSidebar } from './Desktop'
import { MobileSidebar } from './Mobile'

export const Sidebar = ({ categories }: { categories: DocCategory[] }) => {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="md:hidden absolute top-2 left-4 z-50">
        <Button variant="ghost" onClick={() => setIsOpen(!isOpen)}>
          <SidebarOpen className="size-4" />
        </Button>
      </div>

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
