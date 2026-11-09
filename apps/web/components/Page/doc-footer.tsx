import { getMessages } from '@lexibase/rdx-ui/lib/i18n'
import { Button } from '@lexibase/rdx-ui/components/button'
import { FooterCredit } from '@lexibase/rdx-ui/components/footer-credit'
import { EditPageLink } from '@lexibase/rdx-ui/components/edit-page-link'

import { docsIndexer } from '@/lib/docs'
import config from '@/rdx.config'

export async function DocFooter({
  version,
  filename,
  editHref,
}: {
  version: string
  filename: string
  editHref?: string
}) {
  const messages = getMessages(config.lang)
  const sidebarLinks = await docsIndexer(version)
  const slug = `/docs/${version}/${filename}`

  const flatLinks = sidebarLinks.flatMap((cat) => cat.links)
  const currentIndex = flatLinks.findIndex((link) => link.href === slug)

  const prevLink =
    currentIndex > 0 ? (flatLinks[currentIndex - 1] ?? null) : null
  const nextLink =
    currentIndex < flatLinks.length - 1
      ? (flatLinks[currentIndex + 1] ?? null)
      : null

  return (
    <footer className="flex flex-col">
      {editHref && <EditPageLink href={editHref} lang={config.lang} />}
      <section className="flex items-center justify-between">
        {prevLink ? (
          <Button
            variant="outline"
            size="sm"
            aria-label={prevLink.label}
            href={prevLink.href}
            transitionTypes={['rdx-doc-back']}
          >
            {prevLink.label}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            aria-label={messages.previousPage}
          >
            {messages.previous}
          </Button>
        )}

        {nextLink ? (
          <Button
            variant="outline"
            size="sm"
            aria-label={nextLink.label}
            href={nextLink.href}
            transitionTypes={['rdx-doc-forward']}
          >
            {nextLink.label}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            aria-label={messages.nextPage}
          >
            {messages.next}
          </Button>
        )}
      </section>

      <FooterCredit
        lang={config.lang}
        name={config.metadata.applicationName}
        since={config.metadata.since}
      >
        {` · ${messages.developedBy} `}
        <Button
          variant="link"
          size="link"
          href="https://github.com/duhnunes"
          target="_blank"
          rel="noopener noreferrer"
        >
          {config.metadata.authors[0]?.name}
        </Button>
      </FooterCredit>
    </footer>
  )
}
