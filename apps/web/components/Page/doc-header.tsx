import { docsIndexer } from '@rdx/rdx-loaders'
import type { DocCategory } from '@rdx/types/loaders'
import { useMemo } from 'react'

export function DocHeader({
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
  const currentLink = useMemo(
    () => flatLinks.find((link) => link.href === slug),
    [flatLinks, slug]
  )
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
