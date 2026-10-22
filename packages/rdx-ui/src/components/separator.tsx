'use client'

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'

import { cn } from '@lexibase/rdx-ui/lib/utils'

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorPrimitive.Props & { decorative?: boolean }) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      role={decorative ? 'none' : 'separator'}
      aria-hidden={decorative || undefined}
      orientation={orientation}
      className={(state) =>
        cn(
          'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
          typeof className === 'function' ? className(state) : className
        )
      }
      {...props}
    />
  )
}

export { Separator }
