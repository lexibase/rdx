// packages/mdx-loader/src/index.ts

import fs from 'fs'
import path from 'node:path'
import { compileMDX } from 'next-mdx-remote/rsc'

export async function mdxLoader({
  filename,
  version,
  staticVersions,
  mdxComponents,
  docsRoot = 'app/docs',
}: {
  filename: string
  version?: string
  staticVersions: string[]
  mdxComponents: Record<string, React.ComponentType<any>>
  docsRoot?: string
}) {
  const defaultVersion = staticVersions[0]
  if (!defaultVersion) {
    throw new Error('No static versions provided')
  }

  const basePath =
    version === 'canary'
      ? path.join(process.cwd(), docsRoot, '(canary)')
      : version
        ? path.join(
            process.cwd(),
            docsRoot,
            '(versioned)',
            `version-${version}`
          )
        : path.join(process.cwd(), docsRoot, '(versioned)', defaultVersion)

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
