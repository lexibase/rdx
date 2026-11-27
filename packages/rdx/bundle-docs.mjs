import { access } from 'node:fs/promises'
import path from 'node:path'

import { getDocsIndex, getDocument } from '@lexibase/rdx-core'
import { exportMarkdownBody } from '@lexibase/rdx-core/mdx'

export const officialSite = 'https://rdx-tool.vercel.app'

/** The release snapshot matches the published package; canary covers builds without one. */
export async function findDocsSource(webRoot, version) {
  const snapshot = path.join(webRoot, 'versioned_docs', `version-${version}`)
  try {
    await access(snapshot)
    return snapshot
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return path.join(webRoot, 'docs')
  }
}

function text(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function frontmatter(fields) {
  return `---\n${Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n')}\n---\n\n`
}

/**
 * Export the official documentation as plain Markdown files that coding agents
 * can read offline. Links between pages stay local; site paths become absolute.
 */
export async function bundleDocs({ docsDir, version, emit }) {
  const options = { docsDir }
  const categories = getDocsIndex(options, (error) => {
    throw error
  })
  const pages = categories.flatMap((category) => category.pages)
  const publicHref = (href) =>
    href.startsWith('/') && !href.startsWith('//')
      ? `${officialSite}${href}`
      : href
  const lines = [
    `# RDX ${version} documentation`,
    '',
    `> Documentation for the RDX version installed in this project. Online: ${officialSite}/docs`,
    '',
  ]
  for (const category of categories) {
    lines.push(`## ${text(category.title)}`, '')
    for (const page of category.pages) {
      const file = `${page.slug}.md`
      const document = getDocument(page.slug, options)
      if (!document) throw new Error(`Could not read ${page.sourcePath}.`)
      const body = exportMarkdownBody(document.content, {
        sourceRoot: docsDir,
        sourcePath: document.sourcePath,
        documents: pages,
        documentHref: (slug) =>
          path.posix.relative(path.posix.dirname(file), `${slug}.md`),
        publicHref,
      })
      await emit(
        file,
        `${frontmatter({
          title: page.title,
          ...(page.description ? { description: page.description } : {}),
          version,
        })}${body}`
      )
      lines.push(
        `- [${text(page.title)}](${file})${page.description ? `: ${text(page.description)}` : ''}`
      )
    }
    lines.push('')
  }
  await emit('index.md', lines.join('\n'))
  return pages.length
}
