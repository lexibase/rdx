import type { ReactNode } from 'react'

import { ButtonLink } from './button-link'

/** Shared site identity and framework credit for documentation footers. */
export function FooterCredit({
  name,
  since,
  children,
}: {
  name: string
  since?: number
  children?: ReactNode
}) {
  const currentYear = new Date().getFullYear()
  const years =
    since !== undefined && since !== currentYear
      ? `${since}–${currentYear}`
      : currentYear

  return (
    <section className="flex items-center justify-center w-full py-5">
      <p className="text-sm text-muted-foreground text-center">
        &copy; {years} <strong>{name}</strong>
        {children}
        <span className="inline-block">
          {' · Powered by '}
          <ButtonLink
            variant="link"
            size="link"
            href="https://github.com/lexibase/rdx"
            target="_blank"
            rel="noopener noreferrer"
          >
            RDX
          </ButtonLink>
        </span>
      </p>
    </section>
  )
}
