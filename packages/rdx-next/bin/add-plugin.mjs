import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { lstat, readFile, writeFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { createRdxProject, resolveConfig } from '@lexibase/rdx-core/config'
import spawn from 'cross-spawn'
import { createJiti } from 'jiti'

import { activateVersioning, versioningPackage } from './plugin-config.mjs'

const managers = new Set(['npm', 'pnpm', 'yarn'])

export function parseAddArguments(args) {
  const [plugin, ...rest] = args
  if (plugin !== 'versioning')
    throw new Error(
      'Usage: rdx add versioning [--package-manager npm|pnpm|yarn]. Only the official versioning plugin is currently supported.'
    )
  if (!rest.length) return {}
  if (
    rest.length === 2 &&
    rest[0] === '--package-manager' &&
    managers.has(rest[1])
  )
    return { packageManager: rest[1] }
  throw new Error(
    'Usage: rdx add versioning [--package-manager npm|pnpm|yarn].'
  )
}

async function exists(filename) {
  try {
    await lstat(filename)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export async function detectPackageManager(
  rootDir,
  pkg,
  env = process.env,
  explicit
) {
  if (explicit) {
    if (!managers.has(explicit)) throw new Error('Unsupported package manager.')
    return explicit
  }
  if (
    pkg.packageManager !== undefined &&
    typeof pkg.packageManager !== 'string'
  )
    throw new Error('packageManager in package.json must be a string.')
  const declared = pkg.packageManager?.split('@')[0]
  if (declared && !managers.has(declared))
    throw new Error(
      'Unsupported packageManager in package.json. Choose --package-manager npm, pnpm or yarn explicitly.'
    )
  const locks = []
  for (const [manager, filenames] of [
    ['npm', ['package-lock.json', 'npm-shrinkwrap.json']],
    ['pnpm', ['pnpm-lock.yaml']],
    ['yarn', ['yarn.lock']],
  ]) {
    if (
      (
        await Promise.all(
          filenames.map((filename) => exists(path.join(rootDir, filename)))
        )
      ).some(Boolean)
    )
      locks.push(manager)
  }
  if (locks.length > 1 || (declared && locks.length && locks[0] !== declared))
    throw new Error(
      'Conflicting package managers. Keep the intended lockfile or choose --package-manager npm, pnpm or yarn explicitly.'
    )
  const agent = env.npm_config_user_agent?.split('/')[0]
  return declared ?? locks[0] ?? (managers.has(agent) ? agent : 'npm')
}

export function installPackage(manager, rootDir, env = process.env) {
  return new Promise((resolve, reject) => {
    const args = [
      manager === 'npm' ? 'install' : 'add',
      `${versioningPackage}@beta`,
    ]
    const nodeEntry =
      env.npm_config_user_agent?.startsWith(`${manager}/`) &&
      env.npm_execpath &&
      /\.[cm]?js$/i.test(env.npm_execpath)
    const child = spawn(
      nodeEntry ? process.execPath : manager,
      nodeEntry ? [env.npm_execpath, ...args] : args,
      { cwd: rootDir, env, stdio: 'inherit' }
    )
    child.once('error', (error) =>
      reject(
        new Error(
          `Could not run ${manager}: ${error.message}. Install it or choose --package-manager explicitly.`
        )
      )
    )
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `${manager} installation failed (${signal ?? code}). rdx.config.ts was not changed. Package/lock files may have changed; inspect them before retrying. If pnpm reports a release-age policy error, approve only the trusted RDX release in your project policy.`
          )
        )
    })
  })
}

async function validateCandidate(filename) {
  const jiti = createJiti(import.meta.url, {
    moduleCache: false,
    fsCache: false,
    jsx: { runtime: 'automatic' },
  })
  const input = await jiti.import(filename, { default: true })
  const config = resolveConfig(input)
  // Validate paths and command registrations without running plugin setup hooks.
  await createRdxProject(
    {
      ...config,
      plugins: config.plugins.map((plugin) => ({
        ...plugin,
        setup: undefined,
      })),
    },
    { rootDir: path.dirname(filename), command: 'prepare' }
  )
  if (
    config.plugins.filter((plugin) => plugin.name === versioningPackage)
      .length !== 1
  )
    throw new Error(
      'Expected exactly one official versioning plugin in the resulting configuration.'
    )
}

export async function addVersioning(rootDir, options = {}) {
  const {
    install = installPackage,
    log = console.log,
    env = process.env,
  } = options
  const filename = path.join(rootDir, 'rdx.config.ts')
  let info
  try {
    info = await lstat(filename)
  } catch (error) {
    if (error.code === 'ENOENT')
      throw new Error(
        'Missing rdx.config.ts. Run rdx add from the documentation project root.'
      )
    throw error
  }
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error('rdx.config.ts must be a regular project file, not a link.')
  const original = await readFile(filename, 'utf8')
  // Refuse unsupported configurations before running the package manager.
  const updated = activateVersioning(original)
  const pkg = JSON.parse(
    await readFile(path.join(rootDir, 'package.json'), 'utf8')
  )
  const manager = await detectPackageManager(
    rootDir,
    pkg,
    env,
    options.packageManager
  )
  const declared =
    pkg.dependencies?.[versioningPackage] ??
    pkg.devDependencies?.[versioningPackage]
  let installed = false
  try {
    createRequire(path.join(rootDir, 'package.json')).resolve(versioningPackage)
    installed = true
  } catch (error) {
    // The official package exposes ESM imports only. require.resolve can find
    // its manifest but reject the require condition; validation below uses Jiti.
    if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') installed = true
    else if (!['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code))
      throw error
  }
  if (!declared || !installed) {
    log(`Installing ${versioningPackage}@beta with ${manager}...`)
    await install(manager, rootDir, env)
  } else
    log(`${versioningPackage} is already installed; preserving its version.`)

  const temporary = path.join(rootDir, `rdx.config.add-${randomUUID()}.ts`)
  let backup
  try {
    await writeFile(temporary, updated, { flag: 'wx', mode: info.mode })
    try {
      await validateCandidate(temporary)
    } catch (error) {
      throw new Error(
        `Plugin configuration validation failed: ${error.message}. rdx.config.ts was not changed. Installed dependencies were kept; fix the error and retry.`
      )
    }
    if ((await readFile(filename, 'utf8')) !== original)
      throw new Error(
        'rdx.config.ts changed during installation. No configuration was overwritten; retry after reviewing your edits.'
      )
    const currentInfo = await lstat(filename)
    if (!currentInfo.isFile() || currentInfo.isSymbolicLink())
      throw new Error(
        'rdx.config.ts was replaced during installation. No configuration was overwritten.'
      )
    if (updated !== original) {
      backup = path.join(rootDir, `rdx.config.ts.${randomUUID()}.bak`)
      await writeFile(backup, original, { flag: 'wx', mode: info.mode })
      await rename(temporary, filename)
      log(
        `Versioning activated. Original configuration saved to ${path.basename(backup)}.`
      )
    } else
      log('Versioning is already configured; no configuration changes needed.')
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })
  }
  return { backup, changed: updated !== original }
}
