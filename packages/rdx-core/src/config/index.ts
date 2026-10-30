import path from 'node:path'
import { existsSync } from 'node:fs'

import { validateMetadata } from './metadata.js'
import { RdxConfigError } from './error.js'
import { resolveLocalization } from './localization'
import { resolveProjectPath } from './paths'
import { hydrateSourceLocalizations } from './source-localization'

import type {
  RDXConfig,
  RdxContentSource,
  RdxPlugin,
  RdxPluginCommand,
  RdxProject,
  ResolvedRdxConfig,
} from '@lexibase/rdx-types'

export { RdxConfigError } from './error.js'
export { resolveProjectPath } from './paths'
export { normalizeLocalization } from './localization'
export { collectSnapshotContributions } from './snapshots'
export { getContentSources } from '../project/localization'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function object(value: unknown, field: string) {
  if (!record(value)) throw new RdxConfigError(`${field} must be an object.`)
  return value
}

function text(value: unknown, field: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new RdxConfigError(
      `${field} must be ${allowEmpty ? 'a string' : 'a non-empty string'}.`
    )
  }
  return value
}

function component(value: unknown, field: string) {
  if (
    typeof value !== 'function' &&
    !(
      record(value) &&
      [
        Symbol.for('react.memo'),
        Symbol.for('react.forward_ref'),
        Symbol.for('react.lazy'),
      ].includes(value.$$typeof as symbol)
    )
  )
    throw new RdxConfigError(
      `${field} must be a React component, not JSX or a file path.`
    )
}

function keys(
  value: Record<string, unknown>,
  allowed: string[],
  field: string
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      throw new RdxConfigError(`unknown option ${field}${key}.`)
  }
}

export function resolveConfig(input: unknown): ResolvedRdxConfig {
  const config = object(input, 'default export')
  if ('title' in config)
    throw new RdxConfigError(
      'title has been removed. Set the site name in metadata.applicationName instead.'
    )
  if ('docsDir' in config)
    throw new RdxConfigError(
      'docsDir is not configurable. Live documentation must be stored in docs/.'
    )
  keys(
    config,
    [
      'description',
      'metadata',
      'lang',
      'theme',
      'navbar',
      'plugins',
      'homepage',
      'TOC',
      'search',
    ],
    ''
  )
  if (config.search !== undefined && typeof config.search !== 'boolean')
    throw new RdxConfigError('search must be a boolean.')
  if (config.TOC !== undefined && typeof config.TOC !== 'boolean')
    throw new RdxConfigError('TOC must be a boolean.')
  if (config.description !== undefined)
    text(config.description, 'description', true)
  if (config.lang !== undefined) text(config.lang, 'lang')
  validateMetadata(config.metadata)

  if (config.homepage !== undefined) {
    const homepage = object(config.homepage, 'homepage')
    keys(
      homepage,
      ['enabled', 'component', 'title', 'description', 'buttons'],
      'homepage.'
    )
    if (homepage.component !== undefined)
      component(homepage.component, 'homepage.component')
    if (homepage.enabled !== undefined && typeof homepage.enabled !== 'boolean')
      throw new RdxConfigError('homepage.enabled must be a boolean.')
    if (homepage.title !== undefined) text(homepage.title, 'homepage.title')
    if (homepage.description !== undefined)
      text(homepage.description, 'homepage.description', true)
    if (homepage.buttons !== undefined) {
      if (!Array.isArray(homepage.buttons))
        throw new RdxConfigError('homepage.buttons must be an array.')
      for (const [index, value] of homepage.buttons.entries()) {
        const field = `homepage.buttons[${index}]`
        const button = object(value, field)
        keys(button, ['label', 'href'], `${field}.`)
        text(button.label, `${field}.label`)
        const href = text(button.href, `${field}.href`)
        if (
          /[\s\\]/.test(href) ||
          (!/^\/(?!\/)/.test(href) && !/^https?:\/\//i.test(href))
        )
          throw new RdxConfigError(
            `${field}.href must be a root-relative path or http(s) URL.`
          )
        try {
          new URL(href, 'https://rdx.local')
        } catch {
          throw new RdxConfigError(`${field}.href must be a valid URL.`)
        }
      }
    }
  }

  if (config.theme !== undefined) {
    const theme = object(config.theme, 'theme')
    keys(theme, ['defaultTheme'], 'theme.')
    if (
      theme.defaultTheme !== undefined &&
      (typeof theme.defaultTheme !== 'string' ||
        !['system', 'dark', 'light'].includes(theme.defaultTheme))
    ) {
      throw new RdxConfigError(
        'theme.defaultTheme must be system, dark, or light.'
      )
    }
  }
  if (config.navbar !== undefined) {
    const navbar = object(config.navbar, 'navbar')
    keys(navbar, ['title', 'logo', 'actions'], 'navbar.')
    if (navbar.logo !== undefined) component(navbar.logo, 'navbar.logo')
    if (navbar.title !== undefined) text(navbar.title, 'navbar.title', true)
    if (navbar.actions !== undefined) {
      const actions = object(navbar.actions, 'navbar.actions')
      keys(actions, ['github', 'showToggleMode'], 'navbar.actions.')
      if (
        actions.showToggleMode !== undefined &&
        typeof actions.showToggleMode !== 'boolean'
      )
        throw new RdxConfigError(
          'navbar.actions.showToggleMode must be a boolean.'
        )
      if (actions.github !== undefined) {
        const github = object(actions.github, 'navbar.actions.github')
        keys(github, ['visible', 'url'], 'navbar.actions.github.')
        if (typeof github.visible !== 'boolean')
          throw new RdxConfigError(
            'navbar.actions.github.visible must be a boolean.'
          )
        const url = text(github.url, 'navbar.actions.github.url')
        if (url !== '#' && !/^https?:\/\//i.test(url))
          throw new RdxConfigError(
            'navbar.actions.github.url must use http or https, or "#" as a placeholder.'
          )
        try {
          if (url !== '#') new URL(url)
        } catch {
          throw new RdxConfigError(
            'navbar.actions.github.url must be a valid URL.'
          )
        }
      }
    }
  }

  if (config.plugins !== undefined && !Array.isArray(config.plugins)) {
    throw new RdxConfigError('plugins must be an array of plugin objects.')
  }
  const names = new Set<string>()
  for (const [index, value] of (
    (config.plugins ?? []) as unknown[]
  ).entries()) {
    const plugin = object(
      value,
      `plugins[${index}] (call the plugin factory, e.g. versioning())`
    )
    const name = text(plugin.name, `plugins[${index}].name`)
    if (names.has(name))
      throw new RdxConfigError(`plugin "${name}" is configured more than once.`)
    names.add(name)
    if (plugin.apiVersion !== 1)
      throw new RdxConfigError(`plugin "${name}" must support apiVersion 1.`)
    if (plugin.setup !== undefined && typeof plugin.setup !== 'function')
      throw new RdxConfigError(`plugin "${name}" setup must be a function.`)
    if (plugin.commands !== undefined && !Array.isArray(plugin.commands))
      throw new RdxConfigError(`plugin "${name}" commands must be an array.`)
    if (plugin.snapshot !== undefined && typeof plugin.snapshot !== 'function')
      throw new RdxConfigError(`plugin "${name}" snapshot must be a function.`)
  }

  const typed = config as RDXConfig
  return {
    ...typed,
    TOC: typed.TOC ?? false,
    search: typed.search ?? false,
    description: typed.description ?? '',
    lang: typed.lang ?? 'en',
    theme: { defaultTheme: typed.theme?.defaultTheme ?? 'system' },
    plugins: typed.plugins ?? [],
  }
}

export function defineConfig(config: RDXConfig): RDXConfig {
  resolveConfig(config)
  return config
}

export async function createRdxProject(
  input: unknown,
  {
    rootDir = process.cwd(),
    command = 'runtime',
  }: { rootDir?: string; command?: string } = {}
): Promise<RdxProject> {
  rootDir = path.resolve(/* turbopackIgnore: true */ rootDir)
  const config = resolveConfig(input)
  const docsRoot = resolveProjectPath(
    rootDir,
    'docs',
    'documentation directory'
  )
  const sources: RdxContentSource[] = [
    {
      id: 'current',
      label: 'Current',
      docsDir: 'docs',
      routePrefix: '',
    },
  ]
  const commands: RdxPluginCommand[] = []
  const runtimeFiles = new Set<string>()
  let localization: RdxProject['localization']
  const commandNames = new Set([
    'dev',
    'build',
    'start',
    'prepare',
    'check',
    'help',
    'add',
  ])

  for (const plugin of config.plugins) {
    for (const value of plugin.commands ?? []) {
      const entry = object(value, `plugin "${plugin.name}" command`)
      const name = text(entry.name, `plugin "${plugin.name}" command.name`)
      if (!/^[a-z][a-z0-9-]*$/.test(name) || commandNames.has(name)) {
        throw new RdxConfigError(
          `plugin "${plugin.name}" command "${name}" is invalid or already registered.`
        )
      }
      text(entry.description, `command ${name}.description`)
      if (typeof entry.run !== 'function')
        throw new RdxConfigError(`command ${name}.run must be a function.`)
      commandNames.add(name)
      commands.push(value)
    }
  }

  for (const plugin of config.plugins as RdxPlugin[]) {
    let result
    try {
      result = await plugin.setup?.({ rootDir, command, config })
    } catch (error) {
      throw new Error(
        `[${plugin.name}] ${error instanceof Error ? error.message : String(error)}`
      )
    }
    if (result === undefined) continue
    const contribution = object(result, `plugin "${plugin.name}" setup result`)
    if (contribution.localization !== undefined) {
      if (localization)
        throw new RdxConfigError('Only one plugin may declare localization.')
      localization = resolveLocalization(
        contribution.localization,
        config.lang,
        rootDir,
        command
      )
    }
    if (contribution.runtimeFiles !== undefined) {
      if (!Array.isArray(contribution.runtimeFiles))
        throw new RdxConfigError(
          `plugin "${plugin.name}" runtimeFiles must be an array.`
        )
      for (const value of contribution.runtimeFiles) {
        const field = `plugin "${plugin.name}" runtimeFiles`
        const filename = text(value, field)
        const resolved = resolveProjectPath(rootDir, filename, field)
        runtimeFiles.add(path.relative(rootDir, resolved))
      }
    }
    if (contribution.sources === undefined) continue
    if (!Array.isArray(contribution.sources))
      throw new RdxConfigError(
        `plugin "${plugin.name}" sources must be an array.`
      )
    for (const value of contribution.sources) {
      const source = object(value, `plugin "${plugin.name}" content source`)
      if (
        ['basePath', 'fallbackDocsDir', 'fallbackOnly', 'localization'].some(
          (key) => key in source
        )
      )
        throw new RdxConfigError(
          'Content source basePath and fallbackDocsDir are reserved for internal locale views.'
        )
      const id = text(source.id, 'content source id')
      const prefix = text(
        source.routePrefix,
        `content source ${id}.routePrefix`
      )
      text(source.label, `content source ${id}.label`)
      const docsDir = text(source.docsDir, `content source ${id}.docsDir`)
      resolveProjectPath(rootDir, docsDir, `content source ${id}.docsDir`)
      if (
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(prefix) ||
        prefix === '.' ||
        prefix === '..'
      ) {
        throw new RdxConfigError(
          `content source ${id}.routePrefix must be a single safe URL segment.`
        )
      }
      if (
        sources.some((other) => other.id === id || other.routePrefix === prefix)
      ) {
        throw new RdxConfigError(
          `duplicate content source id or route prefix: ${id}.`
        )
      }
      if (
        existsSync(
          /* turbopackIgnore: true */ path.join(
            /* turbopackIgnore: true */ docsRoot,
            prefix
          )
        ) ||
        existsSync(
          /* turbopackIgnore: true */ path.join(
            /* turbopackIgnore: true */ docsRoot,
            `${prefix}.mdx`
          )
        )
      ) {
        throw new RdxConfigError(
          `content source ${id} conflicts with live documentation at /docs/${prefix}.`
        )
      }
      if (source.badge !== undefined)
        text(source.badge, `content source ${id}.badge`)
      if (source.redirectTo !== undefined)
        text(source.redirectTo, `content source ${id}.redirectTo`)
      if (
        source.version !== undefined &&
        (typeof source.version !== 'string' ||
          !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?$/.test(
            source.version
          ))
      )
        throw new RdxConfigError(
          `content source ${id}.version must be a safe snapshot label.`
        )
      if (source.previousSnapshot !== undefined) {
        const previous = object(
          source.previousSnapshot,
          `content source ${id}.previousSnapshot`
        )
        keys(previous, ['version', 'docsDir'], 'previousSnapshot.')
        if (
          typeof previous.version !== 'string' ||
          !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?$/.test(
            previous.version
          )
        )
          throw new RdxConfigError(
            'previousSnapshot.version must be a safe snapshot label.'
          )
        resolveProjectPath(
          rootDir,
          text(previous.docsDir, 'previousSnapshot.docsDir'),
          'previousSnapshot.docsDir'
        )
      }
      sources.push(source as RdxContentSource)
    }
  }
  for (const source of sources) {
    if (source.redirectTo === undefined) continue
    const target = sources.find(
      (entry) => entry.routePrefix === source.redirectTo
    )
    if (
      !target ||
      target === source ||
      target.redirectTo !== undefined ||
      target.docsDir !== source.docsDir
    )
      throw new RdxConfigError(
        `content source ${source.id}.redirectTo must reference a canonical source with the same docsDir.`
      )
  }
  if (localization)
    localization = hydrateSourceLocalizations(
      rootDir,
      sources,
      localization,
      runtimeFiles
    )
  return {
    rootDir,
    config,
    sources,
    commands,
    runtimeFiles: [...runtimeFiles],
    ...(localization ? { localization } : {}),
  }
}
