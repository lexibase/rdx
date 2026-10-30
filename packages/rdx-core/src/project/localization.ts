import path from 'node:path'
import type { RdxContentSource, RdxProject } from '@lexibase/rdx-types'

/** Select a language without mutating the shared project or rerunning plugin hooks. */
export function getLocalizedProject(
  project: RdxProject,
  locale: string
): RdxProject {
  const selected = project.localization?.locales.find(
    (entry) => entry.path === locale
  )
  if (!selected) throw new Error(`Unknown documentation language: ${locale}`)
  return {
    ...project,
    locale: selected,
    config: { ...project.config, lang: selected.code },
    sources: project.sources.map((source) => ({
      ...source,
      docsDir: source.fallbackDocsDir ?? source.docsDir,
      fallbackDocsDir: undefined,
      basePath: `/${selected.path}/docs`,
      ...(selected.code === project.localization!.defaultLocale
        ? {}
        : {
            docsDir: `locale/${selected.folder}/docs`,
            fallbackDocsDir: source.fallbackDocsDir ?? source.docsDir,
          }),
    })),
  }
}

export function getContentSources(project: RdxProject): RdxContentSource[] {
  return project.localization && !project.locale
    ? project.localization.locales.flatMap(
        (locale) => getLocalizedProject(project, locale.path).sources
      )
    : project.sources
}

export function getDocsHref(
  project: RdxProject,
  source: RdxContentSource = project.sources[0]!,
  slug = ''
) {
  const base =
    source.basePath ??
    (project.localization
      ? `/${project.localization.locales.find((entry) => entry.code === project.localization!.defaultLocale)!.path}/docs`
      : '/docs')
  return [
    base,
    source.routePrefix,
    ...slug.split('/').filter(Boolean).map(encodeURIComponent),
  ]
    .filter(Boolean)
    .join('/')
}

export function isFallbackPage(
  project: RdxProject,
  source: RdxContentSource,
  sourcePath: string
) {
  return (
    !!source.fallbackDocsDir &&
    !path
      .relative(
        path.resolve(project.rootDir, source.fallbackDocsDir),
        sourcePath
      )
      .startsWith('..')
  )
}
