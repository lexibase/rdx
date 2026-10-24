import { Button } from '@lexibase/rdx-ui/components/button'
import { ButtonLink } from '@lexibase/rdx-ui/components/button-link'
import { FooterCredit } from '@lexibase/rdx-ui/components/footer-credit'

import { docsIndexer } from '@/lib/docs'
import config from '@/rdx.config'

export async function DocFooter({
  version,
  filename,
}: {
  version: string
  filename: string
}) {
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
      <section className="flex items-center justify-between">
        {prevLink ? (
          <ButtonLink
            variant="outline"
            size="sm"
            aria-label={prevLink.label}
            href={prevLink.href}
          >
            {prevLink.label}
          </ButtonLink>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            aria-label="previous page"
          >
            Previous
          </Button>
        )}

        {nextLink ? (
          <ButtonLink
            variant="outline"
            size="sm"
            aria-label={nextLink.label}
            href={nextLink.href}
          >
            {nextLink.label}
          </ButtonLink>
        ) : (
          <Button variant="outline" size="sm" disabled aria-label="next link">
            Next
          </Button>
        )}
      </section>

      <FooterCredit
        name={config.metadata.applicationName}
        since={config.metadata.since}
      >
        {'. Developed by '}
        <ButtonLink
          variant="link"
          size="link"
          aria-label="go to github page from duhnunes"
          href="https://github.com/duhnunes"
          target="_blank"
          rel="noopener noreferrer"
        >
          {config.metadata.authors[0]?.name}
        </ButtonLink>
      </FooterCredit>
    </footer>
  )
}
