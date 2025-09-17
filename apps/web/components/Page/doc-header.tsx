import { docsIndexer } from '@rdx/rdx-loaders'
import type { DocCategory } from '@rdx/types/loaders'

export function DocHeader({
  version,
  filename,
}: {
  version: string
  filename: string
}) {
  const sidebarLinks: DocCategory[] = docsIndexer(version)
  const slug = `/docs/${version}/${filename}`

  const flatLinks = sidebarLinks.flatMap((cat) => cat.links)
  const currentLink = flatLinks.find((link) => link.href === slug)
  const currentCategory = sidebarLinks.find((cat) =>
    cat.links.some((link) => link.href === slug)
  )

  return (
    <>
      <span className="text-xs text-zinc-700 font-semibold uppercase block -mb-0.5">
        {currentCategory?.title}
      </span>
      <h1 className="text-4xl uppercase font-bold mb-2">
        {currentLink?.label}
      </h1>
      <p className="text-sm text-ring max-w-[726px]">
        {currentLink?.description || 'Sem descrição disponível'}
      </p>
    </>
  )
}
