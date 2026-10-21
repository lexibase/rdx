import fs from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'
import type {
  RdxDocCategory,
  RdxDocFrontmatter,
  RdxDocPage,
  RdxDocsOptions,
  RdxDocument,
} from '@lexibase/rdx-types'

const MDX_EXTENSION = '.mdx'
const DEFAULT_POSITION = Number.MAX_SAFE_INTEGER

function getDocsRoot(docsDir = 'docs') {
  return path.resolve(process.cwd(), docsDir)
}

function toTitle(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function numberValue(value: unknown, fallback = DEFAULT_POSITION) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readCategoryMeta(categoryPath: string, fallbackTitle: string) {
  const metaPath = path.join(categoryPath, '_category.json')
  if (!fs.existsSync(metaPath)) {
    return { title: fallbackTitle, position: DEFAULT_POSITION }
  }

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    if (!isRecord(parsed)) {
      return { title: fallbackTitle, position: DEFAULT_POSITION }
    }

    return {
      title: stringValue(parsed.title, fallbackTitle),
      position: numberValue(parsed.sidebar_position),
    }
  } catch {
    return { title: fallbackTitle, position: DEFAULT_POSITION }
  }
}

function findMdxFiles(directory: string): string[] {
  const entries = fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))

  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) return findMdxFiles(entryPath)
    if (entry.isFile() && entry.name.endsWith(MDX_EXTENSION)) return [entryPath]

    return []
  })
}

function slugFromRelativePath(relativePath: string) {
  return relativePath
    .split(path.sep)
    .join('/')
    .replace(/\.mdx$/, '')
}

function isSafeSlug(slug: string) {
  if (path.isAbsolute(slug) || slug.includes('\\')) return false

  return slug
    .split('/')
    .every((segment) => segment && segment !== '.' && segment !== '..')
}

/**
 * Reads the documentation tree from the user's project. The URL slug always
 * preserves the full path, so `guides/intro.mdx` and `api/intro.mdx` never
 * collide.
 */
export function getDocsIndex({
  docsDir,
}: RdxDocsOptions = {}): RdxDocCategory[] {
  const docsRoot = getDocsRoot(docsDir)
  if (!fs.existsSync(docsRoot)) return []

  const categories = new Map<
    string,
    RdxDocCategory & { categoryPath: string }
  >()

  for (const filePath of findMdxFiles(docsRoot)) {
    const relativePath = path.relative(docsRoot, filePath)
    const pathParts = relativePath.split(path.sep)
    const categoryId =
      pathParts.length > 1 ? (pathParts[0] ?? '_root') : '_root'
    const categoryPath =
      categoryId === '_root' ? docsRoot : path.join(docsRoot, categoryId)
    const fallbackCategoryTitle =
      categoryId === '_root' ? 'Overview' : toTitle(categoryId)

    let category = categories.get(categoryId)
    if (!category) {
      const meta = readCategoryMeta(categoryPath, fallbackCategoryTitle)
      const createdCategory = {
        id: categoryId,
        title: meta.title,
        position: meta.position,
        pages: [],
        categoryPath,
      }
      categories.set(categoryId, createdCategory)
      category = createdCategory
    }

    const source = fs.readFileSync(filePath, 'utf8')
    const parsed = matter(source)
    const frontmatter = isRecord(parsed.data) ? parsed.data : {}
    const slug = slugFromRelativePath(relativePath)
    const fallbackTitle = toTitle(path.basename(slug))

    category.pages.push({
      slug,
      title: stringValue(frontmatter.title, fallbackTitle),
      description: stringValue(frontmatter.description, ''),
      position: numberValue(frontmatter.link_position),
      sourcePath: filePath,
    })
  }

  return [...categories.values()]
    .map(({ categoryPath: _categoryPath, ...category }) => ({
      ...category,
      pages: category.pages.sort(
        (first, second) =>
          first.position - second.position ||
          first.slug.localeCompare(second.slug)
      ),
    }))
    .sort(
      (first, second) =>
        first.position - second.position ||
        first.title.localeCompare(second.title)
    )
}

export function getDocsPaths(options?: RdxDocsOptions) {
  return getDocsIndex(options).flatMap((category) =>
    category.pages.map((page) => page.slug)
  )
}

export function getDocument(
  slug: string,
  { docsDir }: RdxDocsOptions = {}
): RdxDocument | null {
  if (!isSafeSlug(slug)) return null

  const docsRoot = getDocsRoot(docsDir)
  const sourcePath = path.resolve(docsRoot, `${slug}${MDX_EXTENSION}`)
  const relativePath = path.relative(docsRoot, sourcePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath))
    return null
  if (!fs.existsSync(sourcePath)) return null

  const parsed = matter(fs.readFileSync(sourcePath, 'utf8'))

  return {
    slug,
    sourcePath,
    content: parsed.content,
    frontmatter: (isRecord(parsed.data)
      ? parsed.data
      : {}) as RdxDocFrontmatter,
  }
}
