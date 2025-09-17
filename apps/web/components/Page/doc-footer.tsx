import { docsIndexer } from '@rdx/rdx-loaders'
import type { DocCategory } from '@rdx/types/loaders'
import { Button } from '@rdx/ui/components/button'
import Link from 'next/link'

export function DocFooter({
  version,
  filename,
}: {
  version: string
  filename: string
}) {
  const sidebarLinks: DocCategory[] = docsIndexer(version)
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
          <Button variant="outline" size="sm" asChild>
            <Link href={prevLink.href}>{prevLink.label}</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
        )}

        {nextLink ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={nextLink.href}>{nextLink.label}</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
          </Button>
        )}
      </section>

      <section className="flex items-center justify-center w-full py-5">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} <strong>RDX</strong>. Desenvolvido
          por{' '}
          <Button variant="link" size="link" asChild>
            <Link href="https://github.com/duhnunes">DuHNunes</Link>
          </Button>
        </p>
      </section>
    </footer>
  )
}
