import { Button } from '@lexibase/rdx-ui/components/button'
import { ButtonLink } from '@lexibase/rdx-ui/components/button-link'

import { docsIndexer } from '@/lib/docs'
import { siteMetadata } from '@/rdx.config'

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

  const currentYear = new Date().getFullYear()

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

      <section className="flex items-center justify-center w-full py-5">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} <strong>RDX</strong>. Developed by{' '}
          <ButtonLink
            variant="link"
            size="link"
            aria-label="go to github page from duhnunes"
            href="https://github.com/duhnunes"
            target="_blank"
            rel="noopener noreferrer"
          >
            {siteMetadata.author}
          </ButtonLink>
        </p>
      </section>
    </footer>
  )
}
