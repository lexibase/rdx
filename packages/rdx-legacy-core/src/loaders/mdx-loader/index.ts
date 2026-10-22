import fs from 'node:fs'
import path from 'node:path'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import type { MDXLoader } from '@lexibase/rdx-types'
import {
  remarkDocumentLinks,
  rehypeDocumentationHeadings,
} from '@lexibase/rdx-core/mdx'

export class RdxDocumentNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RdxDocumentNotFoundError'
  }
}

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

  const findFiles = (dir: string): string[] => {
    // apps/web traces the documentation tree explicitly in next.config.js.
    const entries = fs.readdirSync(/* turbopackIgnore: true */ dir, {
      withFileTypes: true,
    })

    return entries.flatMap((entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return findFiles(fullPath)
      }
      if (entry.isFile() && entry.name.endsWith('.mdx')) {
        return [fullPath]
      }
      return []
    })
  }

  if (!fs.existsSync(/* turbopackIgnore: true */ basePath)) {
    throw new RdxDocumentNotFoundError(
      `Documentation source not found: ${basePath}`
    )
  }
  const files = findFiles(basePath)
  const filePath = files.find(
    (file) => path.basename(file) === `${filename}.mdx`
  )
  if (!filePath) {
    throw new RdxDocumentNotFoundError(`MDX File not found: ${filename}`)
  }

  const source = fs.readFileSync(/* turbopackIgnore: true */ filePath, 'utf8')

  const { content, frontmatter } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: true,
      blockJS: true,
      blockDangerousJS: true,
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          [
            remarkDocumentLinks,
            {
              sourceRoot: basePath,
              sourcePath: filePath,
              routePrefix: version || defaultVersion,
              documents: files.map((sourcePath) => ({
                sourcePath,
                slug: path.basename(sourcePath, '.mdx'),
              })),
            },
          ],
        ],
        rehypePlugins: [rehypeDocumentationHeadings],
      },
    },
  })

  return { content, frontmatter }
}
