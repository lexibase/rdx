import type { DocCategory } from '@lexibase/rdx-types'
import { Button } from '@lexibase/rdx-ui/components/button'
import { Separator } from '@lexibase/rdx-ui/components/separator'

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
          active={pathname.startsWith(link.href)}
          aria-label={link.label}
          href={link.href}
          aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
          className="justify-start text-sm text-primary"
        >
          {link.label}
        </Button>
      ))}
      {showSeparator && <Separator className="my-4" />}
    </div>
  )
}
