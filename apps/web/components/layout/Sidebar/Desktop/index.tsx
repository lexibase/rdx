import type { DocCategory } from '@rdx/types/loaders'
import { Button } from '@rdx/ui/components/button'
import { Separator } from '@rdx/ui/components/separator'
import Link from 'next/link'

export function DesktopSidebar({
  pathname,
  categories,
}: {
  pathname: string
  categories: DocCategory[]
}) {
  return (
    <div className="w-full h-full p-4 pt-0 border-r border-border relative">
      {categories.map((category, index) => (
        <div key={category.title} className="flex flex-col gap-0.5 mb-3 mt-4">
          <p className="text-xs text-ring font-semibold uppercase mb-1">
            {category.title}
          </p>
          {category.links.map((link) => (
            <Button
              key={link.href}
              asChild
              // active={pathname.startsWith(link.href)}
              className="justify-start"
              size="sm"
              variant="ghost"
            >
              <Link className="text-sm text-primary" href={link.href}>
                {link.label}
              </Link>
            </Button>
          ))}

          {index < categories.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  )
}
