import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { getMessages } from '../lib/i18n'

type DocumentLinksProps = {
  links: readonly { href: string; label: string }[]
  lang?: string
}

export function RelatedDocuments(props: DocumentLinksProps) {
  return <DocumentLinkRow {...props} />
}

export function DocumentPrerequisites(props: DocumentLinksProps) {
  return <DocumentLinkRow {...props} prerequisites />
}

function DocumentLinkRow({
  links,
  lang,
  prerequisites,
}: DocumentLinksProps & { prerequisites?: boolean }) {
  if (!links.length) return null
  const messages = getMessages(lang)
  const label = prerequisites ? messages.beforeYouBegin : messages.related
  return (
    <nav
      aria-label={label}
      className={`flex w-full flex-wrap items-baseline gap-x-4 gap-y-2 text-sm ${prerequisites ? 'mt-4' : 'md:mx-auto md:max-w-[860px]'}`}
    >
      <span className="font-medium text-muted-foreground">{label}</span>
      {links.map(({ href, label }, index) => (
        <span
          key={href}
          className="inline-flex min-w-0 max-w-full items-baseline gap-3"
        >
          {prerequisites && index > 0 && (
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
          )}
          <Link
            href={href}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="wrap-anywhere">{label}</span>
            <ArrowRight aria-hidden="true" className="size-3 shrink-0" />
          </Link>
        </span>
      ))}
    </nav>
  )
}
