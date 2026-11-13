import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { getMessages } from '../lib/i18n'

export function RelatedDocuments({
  links,
  lang,
}: {
  links: readonly { href: string; label: string }[]
  lang?: string
}) {
  if (!links.length) return null
  const label = getMessages(lang).related
  return (
    <nav
      aria-label={label}
      className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-2 text-sm md:mx-auto md:max-w-[860px]"
    >
      <span className="font-medium text-muted-foreground">{label}</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="wrap-anywhere">{label}</span>
          <ArrowRight aria-hidden="true" className="size-3 shrink-0" />
        </Link>
      ))}
    </nav>
  )
}
