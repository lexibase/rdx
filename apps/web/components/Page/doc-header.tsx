import { docsIndexer } from '@/lib/docs'
import { CopyPage } from '@lexibase/rdx-ui/components/copy-page'

export async function DocHeader({
  version,
  filename,
  title,
  markdownHref,
}: {
  version: string
  filename: string
  title: string
  markdownHref: string
}) {
  const sidebarLinks = await docsIndexer(version)
  const slug = `/docs/${version}/${filename}`

  const flatLinks = sidebarLinks.flatMap((cat) => cat.links)
  const currentLink = flatLinks.find((link) => link.href === slug)
  const currentCategory = sidebarLinks.find((cat) =>
    cat.links.some((link) => link.href === slug)
  )

  return (
    <>
      <span className="text-xs text-zinc-600 font-semibold uppercase block -mb-0.5">
        {currentCategory?.title}
      </span>
      <div className="mb-2 flex flex-wrap items-start gap-x-4 gap-y-2">
        <h1 className="min-w-0 max-w-full break-words text-4xl font-bold uppercase">
          {title}
        </h1>
        <CopyPage key={markdownHref} href={markdownHref} />
      </div>
      <p className="text-sm text-ring max-w-[726px]">
        {currentLink?.description || 'Sem descrição disponível'}
      </p>
    </>
  )
}
