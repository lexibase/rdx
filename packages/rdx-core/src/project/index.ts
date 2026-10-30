import path from 'node:path'

import type { RdxContentSource, RdxProject } from '@lexibase/rdx-types'

import { getDocument, getDocsIndex, getDocsPaths } from '../content/index'

export function getSourceOptions(
  project: RdxProject,
  source: RdxContentSource
) {
  return {
    docsDir: path.resolve(project.rootDir, source.docsDir),
    ...(source.fallbackOnly ? { fallbackOnly: true } : {}),
    ...(source.fallbackDocsDir
      ? {
          fallbackDocsDir: path.resolve(
            project.rootDir,
            source.fallbackDocsDir
          ),
        }
      : {}),
  }
}

/** Match plugin routes before looking up pages in the live documentation. */
export function resolveDocsRoute(project: RdxProject, segments: string[] = []) {
  const source =
    project.sources.find(
      (entry) => entry.routePrefix && entry.routePrefix === segments[0]
    ) ?? project.sources[0]!
  const options = getSourceOptions(project, source)
  const slug =
    (source.routePrefix ? segments.slice(1) : segments).join('/') ||
    getDocsPaths(options)[0]
  return {
    source,
    slug,
    document: slug ? getDocument(slug, options) : null,
    categories: getDocsIndex(options),
  }
}

export function getProjectDocsPaths(project: RdxProject) {
  const paths = new Set<string>()
  for (const source of project.sources) {
    // Historical prefixes are handled on request, not duplicated as static pages.
    if (source.redirectTo !== undefined) continue
    for (const slug of getDocsPaths(getSourceOptions(project, source))) {
      const route = [source.routePrefix, slug].filter(Boolean).join('/')
      if (paths.has(route))
        throw new Error(`Conflicting documentation route: /docs/${route}`)
      if (
        !source.routePrefix &&
        project.sources.some(
          (other) => other.routePrefix === slug.split('/')[0]
        )
      ) {
        throw new Error(
          `Live documentation route /docs/${slug} conflicts with a plugin content source.`
        )
      }
      paths.add(route)
    }
  }
  return [...paths]
}
