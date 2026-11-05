import path from 'node:path'

import type { RdxContentSource, RdxProject } from '@lexibase/rdx-types'

export function getEditPageHref(
  project: Pick<RdxProject, 'config' | 'rootDir'>,
  source: Pick<RdxContentSource, 'id'> | undefined,
  sourcePath: string
): string | undefined {
  const editPage = project.config.editPage
  if (!editPage || source?.id !== 'current') return

  const relative = path.relative(project.rootDir, sourcePath)
  const segments = relative.split(path.sep)
  if (!relative || path.isAbsolute(relative) || segments[0] === '..') return

  const url = new URL(editPage.baseUrl)
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${segments.map(encodeURIComponent).join('/')}`
  return url.href
}
