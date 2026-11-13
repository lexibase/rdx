import path from 'node:path'
import { getSourceOptions } from '@lexibase/rdx-core'
import {
  builtDocumentDatesFilename,
  createDocumentDateReader,
  getSnapshotDocumentDate,
  readDocumentDate,
} from '@lexibase/rdx-core/config'
import type { RdxContentSource, RdxProject } from '@lexibase/rdx-types'

export function getDocumentLastUpdated(
  project: RdxProject,
  source: RdxContentSource,
  file: string
) {
  if (source.version)
    return getSnapshotDocumentDate(
      getSourceOptions(project, source).docsDir,
      file
    )

  if (process.env.NODE_ENV === 'production') {
    // The CLI starts Next at the project root. Deployment workers may start
    // in the generated app directory instead.
    const cwd = process.cwd()
    for (const appDir of [cwd, path.join(cwd, '.rdx')]) {
      const captured = readDocumentDate(
        project.rootDir,
        file,
        path.join(
          /* turbopackIgnore: true */ appDir,
          builtDocumentDatesFilename
        )
      )
      if (captured) return captured
    }
  }
  return createDocumentDateReader(project.rootDir)(file)
}
