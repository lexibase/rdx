'use client'

import { DocsSidebar } from '@lexibase/rdx-ui/components/docs-sidebar'
import type { DocCategory } from '@rdx/types/loaders'
import { usePathname } from 'next/navigation'

export function Sidebar({ categories }: { categories: DocCategory[] }) {
  return <DocsSidebar categories={categories} pathname={usePathname()} />
}
