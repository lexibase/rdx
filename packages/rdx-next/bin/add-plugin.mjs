import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { lstat, readFile, writeFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { createRdxProject, resolveConfig } from '@lexibase/rdx-core/config'
import spawn from 'cross-spawn'
import { createJiti } from 'jiti'

import {
  activateVersioning,
  versioningPackage,
  activateI18n,
  inspectI18n,
  i18nPackage,
} from './plugin-config.mjs'
import {
  askI18nLanguages,
  initialLocales,
  prepareLanguageFolders,
} from './i18n-setup.mjs'

const managers = new Set(['npm', 'pnpm', 'yarn'])
const runtimeVersion = createRequire(import.meta.url)('../package.json').version

// Internal installer policy; channels belong to the installed runtime release,
// not the user's docs version, invoking command or dependency range.
export function versioningInstallRequest(version, declared) {
  return pluginInstallRequest(version, declared, versioningPackage)
}

export function i18nInstallRequest(version, declared) {
  return pluginInstallRequest(version, declared, i18nPackage)
}

function pluginInstallRequest(version, declared, packageName) {
  if (declared !== undefined) {
    if (typeof declared !== 'string' || !declared.trim())
      throw new Error(
        `The declared ${packageName} dependency must be a non-empty string.`
      )
    return { kind: 'restore' }
  }
  const match =
    typeof version === 'string' &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/.exec(
      version
    )
  if (
    !match ||
    match[4]
      ?.split('.')
      .some(
        (part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0')
      )
  )
    throw new Error(
      'Cannot select a plugin channel: the RDX runtime version is invalid.'
    )
  const prerelease = match[4]?.split('.')[0]
  if (prerelease && !['beta', 'rc'].includes(prerelease))
    throw new Error(
      `Unsupported RDX runtime prerelease channel "${prerelease}". Install and configure the official plugin manually; no channel fallback was attempted.`
    )
  return {
    kind: 'add',
    specifier: `${packageName}@${prerelease ?? 'latest'}`,
  }
}

export function parseAddArguments(args) {
  const [plugin, ...rest] = args
  const usage =
    'Usage: rdx add versioning|i18n [--package-manager npm|pnpm|yarn]. i18n also accepts --locales en,es-ES.'
  if (!['versioning', 'i18n'].includes(plugin)) throw new Error(usage)
  const options = {}
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index]
    const value = rest[index + 1]
    if (
      flag === '--package-manager' &&
      managers.has(value) &&
      !options.packageManager
    )
      options.packageManager = value
    else if (
      plugin === 'i18n' &&
      flag === '--locales' &&
      value?.trim() &&
      !value.startsWith('-') &&
      options.locales === undefined
    )
      options.locales = value
    else throw new Error(usage)
  }
  return options
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

export function installPackage(
  manager,
  rootDir,
  env = process.env,
  request = versioningInstallRequest(runtimeVersion)
) {
  return new Promise((resolve, reject) => {
    const args =
      request.kind === 'restore'
        ? ['install']
        : [manager === 'npm' ? 'install' : 'add', request.specifier]
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

async function validateCandidate(filename, packageName) {
  const jiti = createJiti(import.meta.url, {
    moduleCache: false,
    fsCache: false,
    jsx: { runtime: 'automatic' },
  })
  const input = await jiti.import(filename, { default: true })
  const config = resolveConfig(input)
  // Read the official language declaration; other setup hooks run during prepare.
  const project = await createRdxProject(
    {
      ...config,
      plugins: config.plugins.map((plugin) => ({
        ...plugin,
        setup:
          packageName === i18nPackage && plugin.name === i18nPackage
            ? plugin.setup
            : undefined,
      })),
    },
    { rootDir: path.dirname(filename), command: 'runtime' }
  )
  if (
    config.plugins.filter((plugin) => plugin.name === packageName).length !== 1
  )
    throw new Error(
      `Expected exactly one ${packageName} plugin in the resulting configuration.`
    )
  return project
}

export async function addVersioning(rootDir, options = {}) {
  return addPlugin(rootDir, options, {
    packageName: versioningPackage,
    label: 'Versioning',
    activate: activateVersioning,
  })
}

export async function addI18n(rootDir, options = {}) {
  return addPlugin(rootDir, options, {
    packageName: i18nPackage,
    label: 'i18n',
    async activate(source) {
      const state = inspectI18n(source)
      if (state.configured) {
        if (options.locales !== undefined)
          throw new Error(
            'i18n is already configured. Add further languages to locales in rdx.config.ts and create their locale/<folder>/docs/ directories.'
          )
        return source
      }
      const primary = Intl.getCanonicalLocales(state.lang)[0]
      if (!primary) throw new Error('lang must be a valid language tag.')
      const additional =
        options.locales ?? (await (options.ask ?? askI18nLanguages)(primary))
      if (additional === undefined) return
      return activateI18n(source, initialLocales(primary, additional))
    },
  })
}

async function addPlugin(rootDir, options, definition) {
  const { packageName, label } = definition
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
  const updated = await definition.activate(original)
  if (updated === undefined) {
    log(`${label} setup cancelled.`)
    return { changed: false, cancelled: true }
  }
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
    pkg.dependencies?.[packageName] ?? pkg.devDependencies?.[packageName]
  let installed = false
  try {
    createRequire(path.join(rootDir, 'package.json')).resolve(packageName)
    installed = true
  } catch (error) {
    // The official package exposes ESM imports only. require.resolve can find
    // its manifest but reject the require condition; validation below uses Jiti.
    if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') installed = true
    else if (!['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code))
      throw error
  }
  if (!declared || !installed) {
    const request = pluginInstallRequest(runtimeVersion, declared, packageName)
    log(
      request.kind === 'restore'
        ? `Restoring the declared ${packageName} dependency with ${manager}...`
        : `Installing ${request.specifier} with ${manager}...`
    )
    await install(manager, rootDir, env, request)
  } else log(`${packageName} is already installed; preserving its version.`)

  const temporary = path.join(rootDir, `rdx.config.add-${randomUUID()}.ts`)
  let rollbackFolders
  let committed = false
  try {
    await writeFile(temporary, updated, { flag: 'wx', mode: info.mode })
    try {
      const project = await validateCandidate(temporary, packageName)
      if (project.localization)
        rollbackFolders = await prepareLanguageFolders(
          rootDir,
          project.localization
        )
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
      await rename(temporary, filename)
      committed = true
      log(`${label} activated in rdx.config.ts.`)
    } else
      log(`${label} is already configured; no configuration changes needed.`)
    committed = true
  } finally {
    if (!committed) await rollbackFolders?.()
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })
  }
  return { changed: updated !== original }
}
