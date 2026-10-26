import { getMessages } from '../lib/i18n'
import type { ReactNode } from 'react'

import { Button } from './button'

/** Shared site identity and framework credit for documentation footers. */
export function FooterCredit({
  lang,
  name,
  since,
  children,
}: {
  lang?: string
  name: string
  since?: number
  children?: ReactNode
}) {
  const messages = getMessages(lang)
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
          {` · ${messages.poweredBy} `}
          <Button
            variant="link"
            size="link"
            href="https://github.com/lexibase/rdx"
            target="_blank"
            rel="noopener noreferrer"
          >
            RDX
          </Button>
        </span>
      </p>
    </section>
  )
}
