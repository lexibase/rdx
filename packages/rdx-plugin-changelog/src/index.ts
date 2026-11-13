import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  changelogPluginName,
  getChangelogDirectory,
  getChangelogFiles,
  isChangelogVersion,
  readChangelog,
} from '@lexibase/rdx-core/config'
import type { RdxPlugin } from '@lexibase/rdx-types'

const usage = 'Usage: rdx changelog new <version>'

async function newEntry(rootDir: string, args: string[]) {
  const help = ['--help', '-h'].includes(args.at(-1) ?? '')
  if (help && (args.length === 1 || (args.length === 2 && args[0] === 'new'))) {
    console.log(usage)
    return
  }
  const [action, version] = args
  if (args.length !== 2 || action !== 'new' || !isChangelogVersion(version))
    throw new Error(`${usage}\nProvide a release version such as 1.2.0.`)

  const existing = readChangelog(rootDir).find(
    (entry) => entry.version === version
  )
  if (existing)
    throw new Error(
      `Changelog version ${version} already exists in ${existing.filename}.`
    )

  const now = new Date()
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')
  const filename = `changelog/${version}.md`
  await mkdir(/* turbopackIgnore: true */ getChangelogDirectory(rootDir), {
    recursive: true,
  })
  try {
    await writeFile(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ getChangelogDirectory(rootDir),
        `${version}.md`
      ),
      `---\nversion: '${version}'\ndate: '${date}'\ntitle: 'Release ${version}'\n---\n\n`,
      { flag: 'wx' }
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'EEXIST')
      throw new Error(
        `${filename} already exists. Edit it to update the release note.`
      )
    throw error
  }
  console.log(`Created ${filename}. Add your release notes before building.`)
}

export function changelog(): RdxPlugin {
  return {
    name: changelogPluginName,
    apiVersion: 1,
    commands: [
      {
        name: 'changelog',
        description: 'Create a Markdown release note',
        run: ({ rootDir, args }) => newEntry(rootDir, args),
      },
    ],
    setup: ({ rootDir }) => {
      const files = getChangelogFiles(rootDir)
      return { runtimeFiles: files.map(({ filename }) => filename) }
    },
  }
}
