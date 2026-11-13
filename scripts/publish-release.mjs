import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { releaseOrder } from './prepare-release.mjs'

const registry = 'https://registry.npmjs.org/'
const stable = /^\d+\.\d+\.\d+$/
const propagationTimeout = 10 * 60_000
const pollInterval = 10_000
const json = async (filename) => JSON.parse(await readFile(filename, 'utf8'))

export async function loadRelease(root, version) {
  assert.match(version, stable, 'Provide the expected stable RDX version')
  const release = await json(path.join(root, 'release-manifest.json'))
  assert.equal(
    release.version,
    version,
    'The requested release is not prepared on this commit'
  )
  for (const name of ['@lexibase/rdx', '@lexibase/create-rdx'])
    assert.equal(release.packages[name], version)

  const packages = []
  for (const directory of releaseOrder) {
    const cwd = path.join(root, 'packages', directory)
    const manifest = await json(path.join(cwd, 'package.json'))
    if (!Object.hasOwn(release.packages, manifest.name)) continue
    assert.notEqual(manifest.private, true)
    assert.match(manifest.version, stable)
    assert.equal(manifest.version, release.packages[manifest.name])
    packages.push({ cwd, name: manifest.name, version: manifest.version })
  }
  assert.equal(
    packages.length,
    Object.keys(release.packages).length,
    'Unknown release package'
  )
  return packages
}

function archivePath(directory, pkg) {
  return path.join(
    directory,
    `${pkg.name.slice(1).replace('/', '-')}-${pkg.version}.tgz`
  )
}

function validateArchives(packages, directory) {
  return packages.map((pkg) => {
    const archive = archivePath(directory, pkg)
    const packed = JSON.parse(
      execFileSync('tar', ['-xOf', archive, 'package/package.json'], {
        encoding: 'utf8',
      })
    )
    assert.equal(packed.name, pkg.name)
    assert.equal(packed.version, pkg.version)
    assert.doesNotMatch(JSON.stringify(packed), /workspace:/)
    if (pkg.name === '@lexibase/rdx') {
      const files = new Set(
        execFileSync('tar', ['-tf', archive], { encoding: 'utf8' })
          .trim()
          .split(/\r?\n/)
      )
      for (const route of [
        'docs/llms.txt/route.ts',
        'rdx-markdown/[...path]/route.ts',
      ])
        assert.ok(
          files.has(`package/dist/templates/app/${route}`),
          `Missing runtime route ${route}; rebuild @lexibase/rdx before packing`
        )
    }
    return { ...pkg, archive }
  })
}

async function readVersion(spec) {
  const split = spec.lastIndexOf('@')
  const url = `${registry}${encodeURIComponent(spec.slice(0, split))}/${encodeURIComponent(spec.slice(split + 1))}`
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    cache: 'no-cache',
  })
  if (response.status === 404) return undefined
  if (!response.ok) {
    const error = new Error(
      `Could not check ${spec}: npm returned HTTP ${response.status}`
    )
    error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status)
    throw error
  }
  const { version } = await response.json()
  assert.equal(
    typeof version,
    'string',
    `Invalid registry response for ${spec}`
  )
  return version
}

function publishArchive(archive) {
  execFileSync(
    'npm',
    [
      'publish',
      archive,
      '--tag',
      'latest',
      '--access',
      'public',
      '--ignore-scripts',
      `--registry=${registry}`,
    ],
    { stdio: 'inherit' }
  )
}

export async function publishPackages(
  packages,
  {
    lookup = readVersion,
    publish = publishArchive,
    wait = setTimeout,
    now = Date.now,
    log = console.log,
    dryRun = true,
  } = {}
) {
  async function waitForVersion(name, version) {
    const spec = `${name}@${version}`
    const deadline = now() + propagationTimeout
    let waiting = false
    while (true) {
      try {
        const latest = await lookup(`${name}@latest`)
        if (latest === version && (await lookup(spec)) === version) return
        if (latest !== undefined && compareVersions(latest, version) > 0)
          throw new Error(
            `${name}@latest already points to newer version ${latest}`
          )
      } catch (error) {
        if (
          !error.retryable &&
          !['TimeoutError', 'TypeError'].includes(error.name)
        )
          throw error
      }
      const remaining = deadline - now()
      if (remaining <= 0)
        throw new Error(
          `npm did not expose ${spec} with the latest tag within 10 minutes. Check the registry before resuming this release.`
        )
      if (!waiting) log(`Waiting for npm to expose ${spec} with the latest tag`)
      waiting = true
      await wait(Math.min(remaining, pollInterval))
    }
  }

  const pending = []
  for (const { name, version, archive } of packages) {
    const spec = `${name}@${version}`
    const existing = await lookup(spec)
    if (existing === version) {
      if (!dryRun) await waitForVersion(name, version)
      log(`Already on npm: ${spec}`)
      continue
    }
    assert.equal(
      existing,
      undefined,
      `Unexpected registry response for ${spec}`
    )
    const latest = await lookup(`${name}@latest`)
    if (!dryRun && latest === version) {
      await waitForVersion(name, version)
      log(`Already on npm: ${spec}`)
      continue
    }
    if (latest === undefined) {
      const message = `First publication required for ${spec}. Publish its verified archive with npm authentication, then rerun the workflow.`
      if (!dryRun) throw new Error(message)
      log(message)
    } else if (dryRun) {
      log(`Would publish: ${spec}`)
    }
    if (dryRun) continue
    assert.ok(
      compareVersions(latest, version) < 0,
      `Refusing to move ${name}@latest backwards from ${latest}`
    )
    pending.push({ name, version, archive })
  }
  for (const { name, version, archive } of pending) {
    const spec = `${name}@${version}`
    log(`Publishing ${spec}`)
    await publish(archive)
    await waitForVersion(name, version)
  }
}

function compareVersions(left, right) {
  assert.match(left, stable, 'npm latest must point to a stable release')
  const [major, minor, patch] = left.split('.').map(Number)
  const [nextMajor, nextMinor, nextPatch] = right.split('.').map(Number)
  return major - nextMajor || minor - nextMinor || patch - nextPatch
}

async function main() {
  const [command, version = '', output] = process.argv.slice(2)
  assert.ok(
    ['pack', 'dry-run', 'publish'].includes(command) && output,
    'Usage: node scripts/publish-release.mjs <pack|dry-run|publish> <version> <artifact-directory>'
  )
  const root = fileURLToPath(new URL('..', import.meta.url))
  const packages = await loadRelease(root, version)
  const directory = path.resolve(output)
  if (command === 'pack') {
    await mkdir(directory, { recursive: true })
    for (const pkg of packages) {
      const pnpm = process.env.npm_execpath
      const args = ['pack', '--pack-destination', directory]
      execFileSync(
        pnpm ? process.execPath : 'pnpm',
        pnpm ? [pnpm, ...args] : args,
        { cwd: pkg.cwd, stdio: 'inherit' }
      )
    }
    validateArchives(packages, directory)
    return
  }
  if (command === 'publish') {
    assert.equal(
      process.env.GITHUB_ACTIONS,
      'true',
      'Run publication through GitHub Actions'
    )
    assert.equal(
      process.env.GITHUB_REF,
      'refs/heads/main',
      'Publish from main only'
    )
    assert.ok(
      process.env.ACTIONS_ID_TOKEN_REQUEST_URL,
      'The publish job needs GitHub OIDC permission'
    )
  }
  await publishPackages(validateArchives(packages, directory), {
    dryRun: command !== 'publish',
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main()
