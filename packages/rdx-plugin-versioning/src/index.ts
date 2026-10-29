import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { resolveProjectPath } from '@lexibase/rdx-core/config'
import type { RdxPlugin, RdxPluginContext } from '@lexibase/rdx-types'

import {
  consolidateVersions,
  compareVersions,
  major,
  type Versions,
} from './editions'

export type VersioningOptions = {
  versionsFile?: string
  versionsDir?: string
}

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
    Object.keys(value).some(
      (key) => !['active', 'archived', 'redirects'].includes(key)
    ) ||
    !Array.isArray(value.active) ||
    !Array.isArray(value.archived)
  ) {
    throw new Error(
      `${filename} must contain active and archived arrays and an optional redirects object.`
    )
  }
  const seen = new Set<string>()
  for (const version of [...value.active, ...value.archived]) {
    validateVersion(version)
    if (seen.has(version))
      throw new Error(`Duplicate version "${version}" in ${filename}.`)
    seen.add(version)
  }
  if (value.redirects !== undefined) {
    if (
      typeof value.redirects !== 'object' ||
      value.redirects === null ||
      Array.isArray(value.redirects)
    )
      throw new Error(`${filename}.redirects must be an object.`)
    for (const [from, to] of Object.entries(value.redirects)) {
      validateVersion(from)
      validateVersion(to)
      if (seen.has(from))
        throw new Error(
          `Version redirect "${from}" is also a published edition.`
        )
    }
  }
  return consolidateVersions(value as Versions)
}

function writeVersions(filename: string, versions: Versions) {
  const temporaryFile = `${filename}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporaryFile, JSON.stringify(versions, null, 2) + '\n', {
      flag: 'wx',
    })
    fs.renameSync(temporaryFile, filename)
  } finally {
    if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile)
  }
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
  // Live MDX files are explicitly included by getRdxTracingConfig. Snapshot
  // commands must not cause the bundler to trace the whole project directory.
  const docsDir = path.resolve(
    /* turbopackIgnore: true */ context.rootDir,
    'docs'
  )
  if (inside(docsDir, versionsDir) || inside(versionsDir, docsDir)) {
    throw new Error(
      'versioning.versionsDir and the live docs/ directory must be separate directories so snapshots cannot index or copy themselves.'
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
        runtimeFiles: [path.relative(context.rootDir, versionsFile)],
        sources: [
          ...versions.active,
          ...versions.archived,
          ...Object.keys(versions.redirects ?? {}),
        ].map((version) => {
          const canonical = versions.redirects?.[version] ?? version
          const snapshotDir = path.join(
            /* turbopackIgnore: true */ versionsDir,
            `version-${canonical}`
          )
          if (
            // Snapshot trees are explicitly traced from the contributed sources.
            !fs.existsSync(/* turbopackIgnore: true */ snapshotDir) ||
            !fs.statSync(/* turbopackIgnore: true */ snapshotDir).isDirectory()
          ) {
            throw new Error(
              `Snapshot for "${version}" is missing at ${snapshotDir}. Restore the snapshot or remove its entry from ${versionsFile}.`
            )
          }
          if (hasLiveRoute(path.join(context.rootDir, 'docs'), version)) {
            throw new Error(
              `Version "${version}" conflicts with live documentation. Rename that page or directory before enabling this version.`
            )
          }
          return {
            id: `version:${version}`,
            label: version,
            routePrefix: version,
            docsDir: path.relative(context.rootDir, snapshotDir),
            ...(canonical !== version ? { redirectTo: canonical } : {}),
            ...(versions.archived.includes(canonical)
              ? { badge: 'Archived' }
              : {}),
          }
        }),
      }
    },
    commands: [
      {
        name: 'version',
        description:
          'Publish the current docs to their major edition: rdx version <version>',
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
          const snapshotDir = path.join(
            /* turbopackIgnore: true */ versionsDir,
            `version-${version}`
          )
          if (
            versions.active.includes(version) ||
            versions.archived.includes(version) ||
            versions.redirects?.[version] !== undefined ||
            fs.existsSync(/* turbopackIgnore: true */ snapshotDir)
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
          const previous = [...versions.active, ...versions.archived].find(
            (entry) => major(entry) === major(version)
          )
          if (previous && compareVersions(version, previous) <= 0)
            throw new Error(
              `Version "${version}" must be newer than the published edition "${previous}".`
            )
          const redirects = { ...versions.redirects }
          if (previous) {
            redirects[previous] = version
            for (const from of Object.keys(redirects)) {
              if (redirects[from] === previous) redirects[from] = version
            }
          }
          const archived =
            previous && versions.archived.includes(previous)
              ? versions.archived.map((entry) =>
                  entry === previous ? version : entry
                )
              : versions.archived
          const active =
            previous && versions.archived.includes(previous)
              ? versions.active
              : [
                  version,
                  ...versions.active.filter((entry) => entry !== previous),
                ].sort((a, b) => compareVersions(b, a))
          fs.mkdirSync(versionsDir, { recursive: true })
          // Reserve the snapshot exclusively, then copy into absent children.
          // Newer Node releases reject cpSync onto an existing directory when
          // errorOnExist is enabled, including the root we just reserved.
          fs.mkdirSync(snapshotDir)
          try {
            for (const entry of fs.readdirSync(docsDir)) {
              fs.cpSync(
                path.join(docsDir, entry),
                path.join(snapshotDir, entry),
                {
                  recursive: true,
                  force: false,
                  errorOnExist: true,
                }
              )
            }
            writeVersions(versionsFile, {
              active,
              archived,
              ...(Object.keys(redirects).length ? { redirects } : {}),
            })
          } catch (error) {
            // This exclusively reserved directory belongs to this failed publication.
            if (inside(versionsDir, snapshotDir))
              fs.rmSync(snapshotDir, { recursive: true, force: true })
            throw error
          }
          console.log(
            `RDX version ${version} ${previous ? `published, replacing ${previous}` : 'created'} in ${path.relative(context.rootDir, snapshotDir)}`
          )
        },
      },
      ...(['archive', 'unarchive'] as const).map((name) => ({
        name,
        description: `${name === 'archive' ? 'Archive' : 'Restore'} a documentation snapshot: rdx ${name} <version>`,
        run(context: RdxPluginContext & { args: string[] }) {
          if (context.args.length !== 1)
            throw new Error(`Usage: rdx ${name} <version>`)
          const version = context.args[0]
          validateVersion(version)
          const { versionsFile, versionsDir } = locations(context, options)
          const versions = parseVersions(versionsFile)
          if (versions.redirects?.[version])
            throw new Error(
              `Version "${version}" was replaced by "${versions.redirects[version]}". Run "rdx ${name} ${versions.redirects[version]}" instead.`
            )
          const from = name === 'archive' ? 'active' : 'archived'
          const to = name === 'archive' ? 'archived' : 'active'
          if (
            !versions[from].includes(version) &&
            !versions[to].includes(version)
          )
            throw new Error(
              `Version "${version}" does not exist in ${versionsFile}.`
            )
          const snapshotDir = path.join(
            /* turbopackIgnore: true */ versionsDir,
            `version-${version}`
          )
          if (
            !fs.existsSync(/* turbopackIgnore: true */ snapshotDir) ||
            !fs.statSync(/* turbopackIgnore: true */ snapshotDir).isDirectory()
          )
            throw new Error(
              `Snapshot for "${version}" is missing at ${snapshotDir}. Restore the snapshot before running "rdx ${name}".`
            )
          if (versions[to].includes(version)) {
            console.log(
              `RDX version ${version} is already ${to === 'archived' ? 'archived' : 'active'}.`
            )
            return
          }
          writeVersions(versionsFile, {
            ...versions,
            [from]: versions[from].filter((entry) => entry !== version),
            // Restoring an old snapshot must not promote it to the current edition.
            [to]: [...versions[to], version],
          })
          console.log(
            `RDX version ${version} ${name === 'archive' ? 'archived' : 'restored to active versions'}.`
          )
        },
      })),
    ],
  }
}

export default versioning
