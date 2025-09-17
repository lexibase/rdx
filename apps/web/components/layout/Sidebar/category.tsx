import type { DocCategory } from '@rdx/types/loaders'
import { Button } from '@rdx/ui/components/button'
import { Separator } from '@rdx/ui/components/separator'
import Link from 'next/link'

export function SidebarCategory({
  category,
  pathname,
  showSeparator,
}: {
  category: DocCategory
  pathname: string
  showSeparator: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 mb-3 first:mt-4">
      <p className="text-xs text-ring font-semibold uppercase mb-1">
        {category.title}
      </p>
      {category.links.map((link) => (
        <Button
          key={link.href}
          variant="ghost"
          size="sm"
          className="justify-start"
          active={pathname.startsWith(link.href)}
          asChild
        >
          <Link
            className="text-sm text-primary"
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        </Button>
      ))}
      {showSeparator && <Separator className="my-4" />}
    </div>
  )
}
