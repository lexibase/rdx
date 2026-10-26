'use client'

import { useMessages } from '@lexibase/rdx-ui/providers/locale-provider'
import { SidebarClose } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { DocCategory } from '@lexibase/rdx-types'
import { Button } from '@lexibase/rdx-ui/components/button'

import { SidebarCategory } from '../category'

export function MobileSidebar({
  pathname,
  categories,
  isOpen,
  onClose,
}: {
  pathname: string
  categories: DocCategory[]
  isOpen: boolean
  onClose: () => void
}) {
  const messages = useMessages()
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 w-full h-full p-4 border-r border-border z-50 bg-background overflow-y-auto"
        >
          <div className="fixed top-2 right-5">
            <Button
              variant="ghost"
              onClick={onClose}
              title={messages.close}
              aria-label={messages.closeSidebar}
            >
              <SidebarClose className="size-4" />
            </Button>
          </div>

          {categories.map((category, index) => (
            <SidebarCategory
              key={category.title}
              category={category}
              pathname={pathname}
              showSeparator={index < categories.length - 1}
            />
          ))}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
