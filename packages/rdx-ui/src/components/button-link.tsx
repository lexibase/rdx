'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import type { VariantProps } from 'class-variance-authority'

import { buttonVariants } from './button'
import { cn } from '../lib/utils'

/** Navigation keeps native anchor semantics, independent of button behavior. */
function ButtonLink({
  className,
  variant,
  size,
  active,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      data-slot="button"
      className={cn(buttonVariants({ variant, size, active }), className)}
      {...props}
    />
  )
}

export { ButtonLink }
