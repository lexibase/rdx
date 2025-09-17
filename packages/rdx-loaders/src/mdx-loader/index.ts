import fs from 'fs'
import path from 'node:path'
import { compileMDX } from 'next-mdx-remote/rsc'
import type { MDXLoader } from '@rdx/types'

export async function mdxLoader({
  filename,
  version,
  versionsRaw,
  mdxComponents,
  docsRoot = 'app/docs',
}: MDXLoader) {
  const defaultVersion = versionsRaw.active[0]
  if (!defaultVersion) {
    throw new Error('No static versions provided')
  }

  let basePath: string
  if (version === 'canary') {
    basePath = path.join(process.cwd(), docsRoot, '(canary)')
  } else if (version) {
    const versionedPath = path.join(
      process.cwd(),
      docsRoot,
      '(versioned)',
      `version-${version}`
    )
    const archivedPath = path.join(
      process.cwd(),
      docsRoot,
      '(archived)',
      `version-${version}`
    )

    basePath = fs.existsSync(versionedPath) ? versionedPath : archivedPath
  } else {
    basePath = path.join(
      process.cwd(),
      docsRoot,
      '(versioned)',
      `version-${defaultVersion}`
    )
  }

  const findFile = (dir: string): string | null => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = findFile(fullPath)
        if (found) return found
      }
      if (entry.isFile() && entry.name === `${filename}.mdx`) {
        return fullPath
      }
    }

    return null
  }

  const filePath = findFile(basePath)
  if (!filePath) {
    throw new Error(`MDX File not found: ${filename}`)
  }

  const source = fs.readFileSync(filePath, 'utf8')

  const { content, frontmatter } = await compileMDX({
    source,
    components: mdxComponents,
    options: { parseFrontmatter: true },
  })

  return { content, frontmatter }
}
