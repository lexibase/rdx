import type { DocCategory } from '@rdx/types/loaders'
import { Button } from '@lexibase/rdx-ui/components/button'
import { ButtonLink } from '@lexibase/rdx-ui/components/button-link'
import { useMemo } from 'react'

import { docsIndexer } from '@/lib/docs'
import config from '@/rdx.config'

export function DocFooter({
  version,
  filename,
}: {
  version: string
  filename: string
}) {
  const sidebarLinks: DocCategory[] = useMemo(
    () => docsIndexer(version),
    [version]
  )
  const slug = `/docs/${version}/${filename}`

  const flatLinks = useMemo(
    () => sidebarLinks.flatMap((cat) => cat.links),
    [sidebarLinks]
  )
  const currentIndex = useMemo(
    () => flatLinks.findIndex((link) => link.href === slug),
    [flatLinks, slug]
  )

  const prevLink =
    currentIndex > 0 ? (flatLinks[currentIndex - 1] ?? null) : null
  const nextLink =
    currentIndex < flatLinks.length - 1
      ? (flatLinks[currentIndex + 1] ?? null)
      : null

  const currentYear = useMemo(() => new Date().getFullYear(), [])

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
            {config.author}
          </ButtonLink>
        </p>
      </section>
    </footer>
  )
}
