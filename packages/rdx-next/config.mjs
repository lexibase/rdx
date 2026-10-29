import { readdir, realpath, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import { createRdxProject, resolveProjectPath } from '@lexibase/rdx-core/config'
import { createJiti } from 'jiti'

/** Include the project and the real Next.js installation in Turbopack's root. */
export async function getRdxBuildRoot(rootDir) {
  const projectRoot = await realpath(path.resolve(rootDir))
  const require = createRequire(path.join(projectRoot, 'package.json'))
  const nextRoot = path.dirname(
    await realpath(require.resolve('next/package.json'))
  )
  let root = projectRoot
  while (true) {
    const relative = path.relative(root, nextRoot)
    if (
      !path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`)
    )
      return root
    const parent = path.dirname(root)
    if (parent === root || parent === path.parse(parent).root)
      throw new Error(
        'RDX could not determine a bounded build root. Install Next.js inside the project or its workspace.'
      )
    root = parent
  }
}

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

/** Next.js tracing and historical route redirects, independent of plugin names. */
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
      project.sources
        .filter((source) => source.redirectTo === undefined)
        .map((source) =>
          contentFiles(
            resolveProjectPath(
              rootDir,
              source.docsDir,
              'content source docsDir'
            )
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
  const redirects = project.sources
    .filter((source) => source.redirectTo !== undefined)
    .map((source) => ({
      source: `/docs/${source.routePrefix}/:path*`,
      destination: `/docs/${source.redirectTo}/:path*`,
      permanent: true,
    }))
  return {
    ...(redirects.length ? { redirects: async () => redirects } : {}),
    outputFileTracingIncludes: {
      '/*': [
        ...new Set(
          files.map((file) => literalPattern(path.relative(appDir, file)))
        ),
      ].sort(),
    },
  }
}
