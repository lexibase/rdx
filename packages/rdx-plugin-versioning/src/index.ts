import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { resolveProjectPath } from '@lexibase/rdx-core/config'
import type { RdxPlugin, RdxPluginContext } from '@lexibase/rdx-types'

export type VersioningOptions = {
  versionsFile?: string
  versionsDir?: string
}

type Versions = { active: string[]; archived: string[] }
const versionPattern = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?$/

function hasLiveRoute(docsDir: string, version: string) {
  return (
    fs.existsSync(path.join(docsDir, version)) ||
    fs.existsSync(path.join(docsDir, `${version}.mdx`))
  )
}

function validateVersion(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !versionPattern.test(value)) {
    throw new Error(
      'Version must be a safe version label, e.g. 1.0.0 or 1.0.0-beta.1.'
    )
  }
}

function parseVersions(filename: string): Versions {
  let input: unknown
  try {
    input = JSON.parse(fs.readFileSync(filename, 'utf8'))
  } catch {
    throw new Error(
      `Cannot read valid JSON from ${filename}. Expected { "active": [], "archived": [] }.`
    )
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error(`${filename} must be an object.`)
  const value = input as Record<string, unknown>
  if (
    Object.keys(value).some((key) => !['active', 'archived'].includes(key)) ||
    !Array.isArray(value.active) ||
    !Array.isArray(value.archived)
  ) {
    throw new Error(`${filename} must contain only active and archived arrays.`)
  }
  const seen = new Set<string>()
  for (const version of [...value.active, ...value.archived]) {
    validateVersion(version)
    if (seen.has(version))
      throw new Error(`Duplicate version "${version}" in ${filename}.`)
    seen.add(version)
  }
  return value as Versions
}

function inside(parent: string, child: string) {
  const relative = path.relative(parent, child)
  return (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  )
}

function locations(context: RdxPluginContext, options: VersioningOptions) {
  const versionsFile = resolveProjectPath(
    context.rootDir,
    options.versionsFile ?? 'versions.json',
    'versioning.versionsFile'
  )
  const versionsDir = resolveProjectPath(
    context.rootDir,
    options.versionsDir ?? 'versioned_docs',
    'versioning.versionsDir'
  )
  const docsDir = path.resolve(context.rootDir, context.config.docsDir)
  if (inside(docsDir, versionsDir) || inside(versionsDir, docsDir)) {
    throw new Error(
      'versioning.versionsDir and docsDir must be separate directories so snapshots cannot index or copy themselves.'
    )
  }
  return { versionsFile, versionsDir, docsDir }
}

/** Installing the package has no effect until versioning() is in config.plugins. */
export function versioning(options: VersioningOptions = {}): RdxPlugin {
  if (
    typeof options !== 'object' ||
    options === null ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) => !['versionsFile', 'versionsDir'].includes(key)
    )
  ) {
    throw new Error(
      'versioning() accepts only versionsFile and versionsDir options.'
    )
  }
  return {
    name: '@lexibase/rdx-versioning',
    apiVersion: 1,
    setup(context) {
      const { versionsFile, versionsDir } = locations(context, options)
      if (!fs.existsSync(versionsFile)) {
        if (!['prepare', 'dev', 'build', 'version'].includes(context.command)) {
          throw new Error(
            `Missing ${versionsFile}. Run "rdx prepare" to initialize versioning.`
          )
        }
        fs.mkdirSync(path.dirname(versionsFile), { recursive: true })
        fs.writeFileSync(
          versionsFile,
          JSON.stringify({ active: [], archived: [] }, null, 2) + '\n',
          { flag: 'wx' }
        )
      }
      const versions = parseVersions(versionsFile)
      return {
        sources: [...versions.active, ...versions.archived].map((version) => {
          const snapshotDir = path.join(versionsDir, `version-${version}`)
          if (
            !fs.existsSync(snapshotDir) ||
            !fs.statSync(snapshotDir).isDirectory()
          ) {
            throw new Error(
              `Snapshot for "${version}" is missing at ${snapshotDir}. Restore the snapshot or remove its entry from ${versionsFile}.`
            )
          }
          if (
            hasLiveRoute(
              path.join(context.rootDir, context.config.docsDir),
              version
            )
          ) {
            throw new Error(
              `Version "${version}" conflicts with live documentation. Rename that page or directory before enabling this version.`
            )
          }
          return {
            id: `version:${version}`,
            label: version,
            routePrefix: version,
            docsDir: path.relative(context.rootDir, snapshotDir),
            ...(versions.archived.includes(version)
              ? { badge: 'Archived' }
              : {}),
          }
        }),
      }
    },
    commands: [
      {
        name: 'version',
        description: 'Snapshot the current docs: rdx version <version>',
        run(context) {
          if (context.args.length !== 1)
            throw new Error('Usage: rdx version <version>')
          const version = context.args[0]
          validateVersion(version)
          const { versionsFile, versionsDir, docsDir } = locations(
            context,
            options
          )
          const versions = parseVersions(versionsFile)
          const snapshotDir = path.join(versionsDir, `version-${version}`)
          if (
            versions.active.includes(version) ||
            versions.archived.includes(version) ||
            fs.existsSync(snapshotDir)
          ) {
            throw new Error(
              `Version "${version}" already exists. Existing snapshots are never overwritten.`
            )
          }
          if (!fs.existsSync(docsDir) || !fs.statSync(docsDir).isDirectory())
            throw new Error(
              `Cannot snapshot missing docs directory: ${docsDir}`
            )
          if (hasLiveRoute(docsDir, version))
            throw new Error(
              `Version "${version}" conflicts with live documentation.`
            )
          fs.mkdirSync(versionsDir, { recursive: true })
          fs.mkdirSync(snapshotDir)
          fs.cpSync(docsDir, snapshotDir, {
            recursive: true,
            force: false,
            errorOnExist: true,
          })
          const temporaryFile = `${versionsFile}.${randomUUID()}.tmp`
          fs.writeFileSync(
            temporaryFile,
            JSON.stringify(
              {
                active: [version, ...versions.active],
                archived: versions.archived,
              },
              null,
              2
            ) + '\n',
            { flag: 'wx' }
          )
          fs.renameSync(temporaryFile, versionsFile)
          console.log(
            `RDX version ${version} created in ${path.relative(context.rootDir, snapshotDir)}`
          )
        },
      },
    ],
  }
}

export default versioning
