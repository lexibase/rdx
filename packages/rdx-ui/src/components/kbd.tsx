import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'

// shadcn/ui base-nova Kbd; see THIRD_PARTY_NOTICES.md for the upstream MIT license.
function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, role, ...props }: ComponentProps<'div'>) {
  return (
    <kbd
      data-slot="kbd-group"
      role={
        role ??
        (props['aria-label'] !== undefined ||
        props['aria-labelledby'] !== undefined
          ? 'group'
          : undefined)
      }
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
