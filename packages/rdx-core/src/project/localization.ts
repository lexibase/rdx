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
    sources: project.sources.map((source) => {
      const primary =
        source.localization?.docs[project.localization!.defaultLocale] ??
        source.fallbackDocsDir ??
        source.docsDir
      const translated =
        source.localization?.docs[selected.code] ??
        (!source.localization && !source.version && selected.folder
          ? `locale/${selected.folder}/docs`
          : undefined)
      const isPrimary = selected.code === project.localization!.defaultLocale
      return {
        ...source,
        docsDir: isPrimary ? primary : (translated ?? primary),
        fallbackDocsDir: isPrimary ? undefined : primary,
        fallbackOnly: !isPrimary && !translated,
        basePath: `/${selected.path}/docs`,
      }
    }),
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

/** Navbar language links retain both the page and the selected edition. */
export function getLanguageLinks(
  project: RdxProject,
  source: RdxContentSource,
  slug = ''
) {
  if (!project.localization) return []
  const visible = new Set(
    (
      project.sources[0]?.localization?.locales ?? project.localization.locales
    ).map((locale) => locale.code)
  )
  for (const locale of source.localization?.locales ?? [])
    visible.add(locale.code)
  if (project.locale) visible.add(project.locale.code)
  return project.localization.locales
    .filter((locale) => visible.has(locale.code))
    .map((locale) => {
      const view = getLocalizedProject(project, locale.path)
      return {
        code: locale.code,
        label:
          source.localization?.locales.find(
            (entry) => entry.code === locale.code
          )?.label ?? locale.label,
        href: getDocsHref(
          view,
          view.sources.find((entry) => entry.id === source.id),
          slug
        ),
      }
    })
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
