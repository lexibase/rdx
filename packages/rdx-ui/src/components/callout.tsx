import type { ComponentProps } from 'react'
import {
  CircleAlert,
  CircleCheck,
  Info,
  Lightbulb,
  TriangleAlert,
} from 'lucide-react'

import { cn } from '../lib/utils'

const variants = {
  note: {
    icon: Info,
    label: 'Note',
    classes: 'border-border bg-muted/40',
    iconClass: 'text-muted-foreground',
  },
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    classes: 'border-blue-500/30 bg-blue-500/5',
    iconClass: 'text-blue-700 dark:text-blue-400',
  },
  success: {
    icon: CircleCheck,
    label: 'Success',
    classes: 'border-emerald-500/30 bg-emerald-500/5',
    iconClass: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    icon: TriangleAlert,
    label: 'Warning',
    classes: 'border-amber-500/30 bg-amber-500/5',
    iconClass: 'text-amber-700 dark:text-amber-400',
  },
  danger: {
    icon: CircleAlert,
    label: 'Danger',
    classes: 'border-red-500/30 bg-red-500/5',
    iconClass: 'text-red-700 dark:text-red-400',
  },
} as const

export type CalloutVariant = keyof typeof variants
export type CalloutProps = Omit<ComponentProps<'aside'>, 'title'> & {
  variant?: CalloutVariant
  title?: string
}

/** Static documentation content, deliberately not a live alert region. */
export function Callout({
  variant = 'note',
  title,
  className,
  children,
  ...props
}: CalloutProps) {
  if (!Object.hasOwn(variants, variant)) {
    throw new Error(
      `[RDX] Invalid Callout variant "${variant}". Use note, tip, success, warning or danger.`
    )
  }
  const { icon: Icon, label, classes, iconClass } = variants[variant]
  return (
    <aside
      role="note"
      aria-label={title || label}
      data-rdx-callout={variant}
      className={cn(
        'my-6 flex min-w-0 gap-3 rounded-md border p-4 text-sm text-foreground',
        classes,
        className
      )}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', iconClass)}
      />
      <div className="min-w-0 flex-1">
        {title && (
          <p data-slot="callout-title" className="mb-2 font-semibold leading-5">
            {title}
          </p>
        )}
        <div
          data-slot="callout-content"
          className="leading-6 break-words [&>:first-child]:mt-0 [&>:last-child]:mb-0"
        >
          {children}
        </div>
      </div>
    </aside>
  )
}
