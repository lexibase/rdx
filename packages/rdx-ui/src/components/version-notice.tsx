import { getMessages } from '../lib/i18n'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Callout } from './callout'

/** Presentation only: version selection remains the responsibility of the caller. */
export function VersionNotice({
  lang,
  kind,
  currentHref,
}: {
  lang?: string
  kind: 'canary' | 'outdated'
  currentHref: string
}) {
  const messages = getMessages(lang)
  const isCanary = kind === 'canary'
  return (
    <Callout
      data-rdx-version-notice={kind}
      variant={isCanary ? 'tip' : 'warning'}
      title={isCanary ? messages.preReleaseTitle : messages.outdatedTitle}
      className="mt-0 mb-5"
    >
      <p>
        {isCanary ? messages.preReleaseMessage : messages.outdatedMessage}{' '}
        <Link
          href={currentHref}
          className="font-medium text-foreground underline decoration-current/40 underline-offset-4 transition-colors hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {messages.backToCurrent}
          <ArrowRight
            aria-hidden="true"
            className="ml-1 inline size-3.5 align-text-bottom"
          />
        </Link>
      </p>
    </Callout>
  )
}
