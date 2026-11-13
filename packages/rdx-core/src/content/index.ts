import fs from 'node:fs'
import path from 'node:path'

import { parseStaticDocument } from './static-source'
import { readRedirectFrom } from './page-redirects'
import {
  DEFAULT_POSITION,
  documentExtension,
  orderedName,
  slugFromRelativePath,
} from './filenames'
import type {
  RdxDocCategory,
  RdxDocFrontmatter,
  RdxDocPage,
  RdxDocsOptions,
  RdxDocument,
} from '@lexibase/rdx-types'

function getDocsRoot(docsDir = 'docs') {
  // The Next adapter includes configured content explicitly in server traces.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), docsDir)
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

function readCategoryMeta(
  categoryPath: string,
  fallbackTitle: string,
  position = DEFAULT_POSITION
) {
  const metaPath = path.join(categoryPath, '_category.json')
  if (!fs.existsSync(/* turbopackIgnore: true */ metaPath)) {
    return { title: fallbackTitle, position }
  }

  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(/* turbopackIgnore: true */ metaPath, 'utf8')
    )
    if (!isRecord(parsed)) {
      return { title: fallbackTitle, position }
    }

    return {
      title: stringValue(parsed.title, fallbackTitle),
      position: numberValue(parsed.sidebar_position, position),
    }
  } catch {
    return { title: fallbackTitle, position }
  }
}

function findDocumentFiles(directory: string): string[] {
  const entries = fs
    .readdirSync(/* turbopackIgnore: true */ directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))

  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) return findDocumentFiles(entryPath)
    if (entry.isFile() && documentExtension.test(entry.name)) return [entryPath]

    return []
  })
}

function matchingEntries(directory: string, name: string, folders: boolean) {
  if (!fs.existsSync(/* turbopackIgnore: true */ directory)) return []
  return fs
    .readdirSync(/* turbopackIgnore: true */ directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (
        folders
          ? !entry.isDirectory()
          : !entry.isFile() || !documentExtension.test(entry.name)
      )
        return []
      const candidate = folders
        ? entry.name
        : entry.name.replace(documentExtension, '')
      return orderedName(candidate).name === name
        ? [path.join(directory, entry.name)]
        : []
    })
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
 * With onError, static readers collect per-file failures and retain fallback
 * route metadata. Default callers keep the existing fail-fast behavior.
 */
export function getDocsIndex(
  { docsDir, fallbackDocsDir, fallbackOnly }: RdxDocsOptions = {},
  onError?: (error: unknown, sourcePath: string) => void
): RdxDocCategory[] {
  if (fallbackOnly)
    return getDocsIndex({ docsDir: fallbackDocsDir ?? docsDir }, onError)
  if (fallbackDocsDir) {
    const primary = getDocsIndex({ docsDir: fallbackDocsDir }, onError)
    const translated = getDocsIndex({ docsDir }, onError)
    const pages = new Map(
      translated.flatMap((category) =>
        category.pages.map((page) => [page.slug, page] as const)
      )
    )
    const translatedRoot = getDocsRoot(docsDir)
    return primary.map((category) => ({
      ...category,
      title: readCategoryMeta(
        category.id === '_root'
          ? translatedRoot
          : (matchingEntries(translatedRoot, category.id, true)[0] ??
              path.join(translatedRoot, category.id)),
        category.title
      ).title,
      pages: category.pages.map((page) => ({
        ...(pages.get(page.slug) ?? page),
        position: page.position,
      })),
    }))
  }
  const docsRoot = getDocsRoot(docsDir)
  if (!fs.existsSync(/* turbopackIgnore: true */ docsRoot)) return []

  const categories = new Map<
    string,
    RdxDocCategory & { categoryPath: string }
  >()

  const slugs = new Map<string, string>()
  for (const filePath of findDocumentFiles(docsRoot)) {
    const slug = slugFromRelativePath(path.relative(docsRoot, filePath))
    const previous = slugs.get(slug)
    if (previous) {
      const error = new Error(
        `[RDX] Duplicate documentation route "${slug}": ${previous} and ${filePath}. Keep one page per route.`
      )
      if (!onError) throw error
      onError(error, filePath)
      continue
    }
    slugs.set(slug, filePath)
    const relativePath = path.relative(docsRoot, filePath)
    const pathParts = relativePath.split(path.sep)
    const categoryFolder =
      pathParts.length > 1 ? (pathParts[0] ?? '_root') : '_root'
    const { name: categoryId, position: categoryPosition } =
      orderedName(categoryFolder)
    const categoryPath =
      categoryFolder === '_root'
        ? docsRoot
        : path.join(docsRoot, categoryFolder)
    const fallbackCategoryTitle =
      categoryId === '_root' ? 'Overview' : toTitle(categoryId)

    let category = categories.get(categoryId)
    if (!category) {
      const meta = readCategoryMeta(
        categoryPath,
        fallbackCategoryTitle,
        categoryPosition
      )
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

    let frontmatter: Record<string, unknown> = {}
    let redirectFrom: string[] = []
    try {
      const raw = fs.readFileSync(/* turbopackIgnore: true */ filePath, 'utf8')
      const parsed = parseStaticDocument(raw)
      frontmatter = isRecord(parsed.data) ? parsed.data : {}
      redirectFrom = readRedirectFrom(frontmatter.redirectFrom)
    } catch (error) {
      if (!onError) throw error
      onError(error, filePath)
    }
    const fallbackTitle = toTitle(path.basename(slug))
    const navTitle = stringValue(frontmatter.navTitle, '')
    const { highlighting } = frontmatter
    const filePosition = orderedName(
      path.basename(relativePath).replace(documentExtension, '')
    ).position

    category.pages.push({
      slug,
      ...(redirectFrom.length ? { redirectFrom } : {}),
      title: stringValue(frontmatter.title, fallbackTitle),
      ...(navTitle ? { navTitle } : {}),
      ...(highlighting === 'important' || highlighting === 'new'
        ? { highlighting }
        : {}),
      description: stringValue(frontmatter.description, ''),
      position: numberValue(
        frontmatter.order,
        numberValue(frontmatter.link_position, filePosition)
      ),
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
  { docsDir, fallbackDocsDir, fallbackOnly }: RdxDocsOptions = {}
): RdxDocument | null {
  if (!isSafeSlug(slug)) return null
  if (fallbackOnly)
    return getDocument(slug, { docsDir: fallbackDocsDir ?? docsDir })

  const docsRoot = getDocsRoot(docsDir)
  const parts = slug.split('/')
  const name = parts.pop()!
  let directories = [docsRoot]
  for (const part of parts)
    directories = directories.flatMap((directory) =>
      matchingEntries(directory, part, true)
    )
  const candidates = directories.flatMap((directory) =>
    matchingEntries(directory, name, false)
  )
  if (candidates.length > 1)
    throw new Error(
      `[RDX] Duplicate documentation route "${slug}": ${candidates.join(' and ')}. Keep one page per route.`
    )
  if (fallbackDocsDir && !getDocument(slug, { docsDir: fallbackDocsDir }))
    return null
  const sourcePath = candidates[0]
  if (!sourcePath)
    return fallbackDocsDir
      ? getDocument(slug, { docsDir: fallbackDocsDir })
      : null

  const parsed = parseStaticDocument(
    fs.readFileSync(/* turbopackIgnore: true */ sourcePath, 'utf8')
  )

  return {
    slug,
    sourcePath,
    content: parsed.content,
    frontmatter: (isRecord(parsed.data)
      ? parsed.data
      : {}) as RdxDocFrontmatter,
  }
}
