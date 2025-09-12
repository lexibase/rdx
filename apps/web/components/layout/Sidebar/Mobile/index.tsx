import Link from 'next/link'
import { SidebarClose } from 'lucide-react'
// import { motion, AnimatePresence } from 'motion/react'
import type { DocCategory } from '@rdx/types/loaders'
import { Button } from '@rdx/ui/components/button'
import { Separator } from '@rdx/ui/components/separator'

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
  return (
    <section className="fixed top-0 left-0 w-full h-full p-4 border-r border-border z-50 bg-background overflow-y-auto">
      {/* <AnimatePresence>
        {isOpen && (
          <>
            <motion.section
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 w-full h-full p-4 border-r border-border z-50 bg-background overflow-y-auto"
            > */}
      <div className="fixed top-2 right-5">
        <Button variant="ghost" onClick={onClose}>
          <SidebarClose className="size-4" />
        </Button>
      </div>

      {categories.map((category, index) => (
        <div key={category.title} className="flex flex-col gap-0.5 mb-3 mt-4">
          <p className="text-xs text-ring font-semibold uppercase mb-1">
            {category.title}
          </p>
          {category.links.map((link) => (
            <Button
              key={link.href}
              asChild
              active={pathname.startsWith(link.href)}
              className="justify-start"
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              <Link className="text-sm text-primary" href={link.href}>
                {link.label}
              </Link>
            </Button>
          ))}

          {index < categories.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
      {/* </motion.section>
          </>
        )}
      </AnimatePresence> */}
    </section>
  )
}
