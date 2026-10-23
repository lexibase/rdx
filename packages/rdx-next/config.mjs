import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import { createRdxProject, resolveProjectPath } from '@lexibase/rdx-core/config'
import { createJiti } from 'jiti'

// These files are enumerated by Next's configuration loader, not by a server
// bundle. The core's dynamic readers deliberately leave tracing to this adapter.
async function contentFiles(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const files = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) return contentFiles(filename)
      return entry.isFile() &&
        (entry.name.endsWith('.mdx') || entry.name === '_category.json')
        ? [filename]
        : []
    })
  )
  return files.flat()
}

// outputFileTracingIncludes takes globs. Escape configured names so a literal
// bracket, wildcard or parenthesis cannot silently widen the deployment trace.
function literalPattern(filename) {
  return filename
    .split(path.sep)
    .join('/')
    .replace(/([*?[\]{}()!+@])/g, '\\$1')
}

/** Next.js tracing for configured RDX content, independent of plugin names. */
export async function getRdxTracingConfig({ rootDir, appDir = rootDir }) {
  rootDir = path.resolve(rootDir)
  appDir = path.resolve(appDir)
  const jiti = createJiti(import.meta.url, {
    moduleCache: false,
    fsCache: false,
    jsx: { runtime: 'automatic' },
  })
  const input = await jiti.import(path.join(rootDir, 'rdx.config.ts'), {
    default: true,
  })
  const project = await createRdxProject(input, { rootDir })
  const files = (
    await Promise.all(
      project.sources.map((source) =>
        contentFiles(
          resolveProjectPath(rootDir, source.docsDir, 'content source docsDir')
        )
      )
    )
  ).flat()
  for (const filename of project.runtimeFiles) {
    const resolved = resolveProjectPath(
      rootDir,
      filename,
      'plugin runtimeFiles'
    )
    if (!(await stat(resolved)).isFile())
      throw new Error(`Plugin runtimeFiles must name a file: ${filename}`)
    files.push(resolved)
  }
  return {
    outputFileTracingIncludes: {
      '/*': [
        ...new Set(
          files.map((file) => literalPattern(path.relative(appDir, file)))
        ),
      ].sort(),
    },
  }
}
