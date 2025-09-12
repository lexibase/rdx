import { Button } from '@rdx/ui/components/button'
import Link from 'next/link'
import { mdxComponents } from '@rdx/ui/components/mdx-components'
import { notFound } from 'next/navigation'
import { docsIndexer, mdxLoader } from '@rdx/rdx-loaders'

import { Main } from '@/components/Page/Main'
import versionsRaw from '@/versions.json'

export default async function DocPage({
  params,
}: {
  params: Promise<{ version: string; doc: string[] }>
}) {
  const { version, doc } = await params
  const filename = doc.at(-1)
  if (!filename) return notFound()

  const slug = `/docs/${version}/${filename}`

  let content
  try {
    const result = await mdxLoader({
      filename,
      version,
      versionsRaw,
      mdxComponents,
    })
    content = result.content
  } catch {
    return notFound()
  }

  const sidebarLinks = docsIndexer(version)
  const flatLinks = sidebarLinks.flatMap((category) => category.links)
  const currentIndex = flatLinks.findIndex((link) => link.href === slug)

  const currentLink = flatLinks[currentIndex]
  const currentCategory = sidebarLinks.find((category) =>
    category.links.some((link) => link.href === slug)
  )

  const prevLink = currentIndex > 0 ? flatLinks[currentIndex - 1] : null
  const nextLink =
    currentIndex < flatLinks.length - 1 ? flatLinks[currentIndex + 1] : null

  const currentVersion = versionsRaw[0]
  const isCanary = version === 'canary'
  const isOutdated = version !== currentVersion && !isCanary

  return (
    <section className="w-full h-full overflow-y-auto px-7 flex flex-col gap-5 pb-8 md:py-8">
      <div className="w-full flex flex-col gap-5 md:mx-auto md:max-w-[860px] pt-14 md:pt-0">
        <header className="mb-6 relative">
          {isOutdated && (
            <div className="bg-red-100 border border-red-500 text-red-700 px-4 py-2 rounded-sm text-sm flex items-center gap-2 absolute -top-6 right-0">
              Essa é uma versão desatualizada da documentação.
              <Link
                href={`/docs/${currentVersion}`}
                className="underline font-medium"
              >
                Voltar para versão atual.
              </Link>
            </div>
          )}
          {isCanary && (
            <div className="bg-amber-100 border border-amber-700 text-amber-800 px-4 py-2 rounded-sm text-sm flex items-center gap-2 absolute -top-6 right-0">
              Esta é uma versão ainda não lançada da documentação.
              <Link
                href={`/docs/${currentVersion}`}
                className="underline font-medium"
              >
                Voltar para versão atual.
              </Link>
            </div>
          )}
          <span className="text-xs text-zinc-700 font-semibold uppercase block -mb-0.5">
            {currentCategory?.title}
          </span>
          <h1 className="text-4xl uppercase font-bold mb-2">
            {currentLink?.label}
          </h1>
          <p className="text-sm text-ring max-w-[726px]">
            {currentLink?.description || 'Sem descrição disponível.'}
          </p>
        </header>
        <Main>{content}</Main>
      </div>
      <footer className="flex items-center justify-between">
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
      </footer>
      <footer className="flex items-center justify-center w-full py-5">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} <strong>RenderDocX</strong>.
          Desenvolvido por{' '}
          <Button variant="link" size="link" asChild>
            <Link href="https://github.com/duhnunes">DuHNunes</Link>
          </Button>
        </p>
      </footer>
    </section>
  )
}
