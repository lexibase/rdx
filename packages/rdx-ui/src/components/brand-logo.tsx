import type { RDXConfig } from '@lexibase/rdx-types'

import { cn } from '../lib/utils'
import { Logo } from './logo'

/** Render configured branding in the existing logo slots without changing their layout. */
export function BrandLogo({
  source,
  className,
}: {
  source?: NonNullable<RDXConfig['navbar']>['logo']
  className?: string
}) {
  if (typeof source === 'string')
    return (
      <img
        src={source}
        alt=""
        aria-hidden="true"
        width={208}
        height={208}
        decoding="async"
        className={cn('object-contain shrink-0', className)}
      />
    )
  const Component = source ?? Logo
  return <Component className={className} />
}
