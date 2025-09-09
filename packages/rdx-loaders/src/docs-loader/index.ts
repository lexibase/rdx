import fs from 'fs'
import path from 'node:path'

import matter from 'gray-matter'
import type { DocCategory, DocLink } from '@rdx/types'

export function docsIndexer(version?: string): DocCategory[] {
  const resolvedVersion = version || 'canary'

  const basePath =
    resolvedVersion === 'canary'
      ? path.join(process.cwd(), 'app/docs/(canary)')
      : path.join(
            process.cwd(),
            'app/docs/(versioned)',
            `version-${resolvedVersion}`
          )
        ? path.join(
            process.cwd(),
            'app/docs/(versioned)',
            `version-${resolvedVersion}`
          )
        : path.join(
            process.cwd(),
            'app/docs/(archived)',
            `version-${resolvedVersion}`
          )

  if (!fs.existsSync(basePath)) {
    console.warn(`Docs Folder not found: ${basePath}`)
    return []
  }

  const categories: (DocCategory & { position: number })[] = []

  const entries = fs.readdirSync(basePath, { withFileTypes: true })

  entries.forEach((entry) => {
    if (!entry.isDirectory()) return

    const categoryPath = path.join(basePath, entry.name)
    const hasMdxFile = fs
      .readdirSync(categoryPath)
      .some((file) => file.endsWith('.mdx'))
    if (!hasMdxFile) return

    const categoryMetaPath = path.join(categoryPath, '_category.json')

    let categoryTitle = entry.name
    let categoryPosition = 999

    if (fs.existsSync(categoryMetaPath)) {
      try {
        const rawMeta = fs.readFileSync(categoryMetaPath, 'utf-8')
        const meta = JSON.parse(rawMeta)
        categoryTitle = meta.title || categoryTitle
        categoryPosition = meta.sidebar_position ?? categoryPosition
      } catch (err) {
        console.warn(`Error reading _category.json em ${entry.name}:`, err)
      }
    }

    const files = fs.readdirSync(categoryPath)

    const links: DocLink[] = files
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => {
        const filePath = path.join(categoryPath, file)
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(raw)

        const filename = file.replace('.mdx', '')
        const slug =
          resolvedVersion === 'canary'
            ? `/docs/canary/${filename}`
            : `/docs/${resolvedVersion}/${filename}`

        return {
          href: slug,
          label: data.title || filename,
          description: data.description || '',
          position: data.link_position ?? 1,
        }
      })
      .sort((a, b) => a.position - b.position)
      .map(({ position: _position, ...link }) => link)

    categories.push({
      title: categoryTitle,
      links,
      position: categoryPosition,
    })
  })

  return categories
    .sort((a, b) => a.position - b.position)
    .map(({ position: _position, ...category }) => category)
}
