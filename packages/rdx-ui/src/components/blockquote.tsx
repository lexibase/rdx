import type { ComponentProps } from 'react'
import { Quote } from 'lucide-react'

import { cn } from '../lib/utils'

/** A quotation keeps native semantics, without the heading or tone of a Callout. */
export function Blockquote({
  children,
  className,
  ...props
}: ComponentProps<'blockquote'>) {
  return (
    <blockquote
      data-rdx-blockquote
      className={cn(
        'my-6 flex min-w-0 gap-3 rounded-lg border border-border border-l-2 border-l-ring/50 bg-muted/25 p-4 text-foreground/85 sm:p-5',
        className
      )}
      {...props}
    >
      <Quote
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 text-muted-foreground/70"
      />
      <div
        data-slot="blockquote-content"
        className="min-w-0 flex-1 leading-7 [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&>:last-child]:mb-0"
      >
        {children}
      </div>
    </blockquote>
  )
}
