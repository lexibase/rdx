import fs from 'fs'
import path from 'node:path'

import { compileMDX } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'

import { mdxComponents } from '@/components/mdx'

import staticVersions from '../versions.json'

export async function getDocContent(filename: string, version?: string) {
  const basePath =
    version === 'canary'
      ? path.join(process.cwd(), 'app/docs/(canary)')
      : version
        ? path.join(process.cwd(), 'app/docs/(versioned)', `version-${version}`)
        : path.join(
            process.cwd(),
            'app/docs/(versioned)',
            staticVersions[0] ?? 'default-version'
          )

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
    console.log(`MDX File not found: ${filename}`)
    notFound()
  }

  const source = fs.readFileSync(filePath, 'utf8')

  const { content, frontmatter } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: true,
    },
  })

  return { content, frontmatter }
}
