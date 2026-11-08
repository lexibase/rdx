import type { ComponentPropsWithoutRef } from 'react'
import type { RdxPageHighlight } from '@lexibase/rdx-types'

import { cn } from '../lib/utils'

export function HighlightDot({
  kind,
  className,
  ...props
}: ComponentPropsWithoutRef<'span'> & { kind: RdxPageHighlight }) {
  return (
    <span
      {...props}
      aria-hidden="true"
      data-rdx-highlight-dot={kind}
      className={cn(
        'relative size-2 shrink-0 rounded-full bg-current',
        kind === 'important'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-blue-600 dark:text-blue-400',
        className
      )}
    >
      <span className="absolute inset-0 rounded-full bg-current opacity-0 motion-safe:animate-[rdx-sidebar-highlight_2.8s_ease-out_infinite]" />
    </span>
  )
}
