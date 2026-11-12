import {
  changelogPluginName,
  getChangelogFiles,
  readChangelog,
} from '@lexibase/rdx-core/config'
import type { RdxPlugin } from '@lexibase/rdx-types'

export function changelog(): RdxPlugin {
  return {
    name: changelogPluginName,
    apiVersion: 1,
    setup: ({ rootDir, command }) => {
      const files =
        command === 'check'
          ? readChangelog(rootDir)
          : getChangelogFiles(rootDir)
      return { runtimeFiles: files.map(({ filename }) => filename) }
    },
  }
}
