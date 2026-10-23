import path from 'node:path'
import { existsSync } from 'node:fs'

import type {
  RdxConfig,
  RdxContentSource,
  RdxPlugin,
  RdxPluginCommand,
  RdxProject,
  ResolvedRdxConfig,
} from '@lexibase/rdx-types'

export class RdxConfigError extends Error {
  constructor(message: string) {
    super(`Invalid rdx.config.ts: ${message}`)
    this.name = 'RdxConfigError'
  }
}

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

/** Resolve project-owned paths without allowing traversal or filesystem roots. */
export function resolveProjectPath(
  rootDir: string,
  value: string,
  field: string
) {
  text(value, field)
  const resolved = path.resolve(rootDir, value)
  const relative = path.relative(rootDir, resolved)
  if (
    path.isAbsolute(value) ||
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new RdxConfigError(
      `${field} must be a relative path inside the project.`
    )
  }
  return resolved
}

export function resolveConfig(input: unknown): ResolvedRdxConfig {
  const config = object(input, 'default export')
  keys(
    config,
    [
      'title',
      'description',
      'lang',
      'docsDir',
      'theme',
      'navbar',
      'plugins',
      'homepage',
      'TOC',
      'search',
    ],
    ''
  )
  text(config.title, 'title')
  if (config.search !== undefined && typeof config.search !== 'boolean')
    throw new RdxConfigError('search must be a boolean.')
  if (config.TOC !== undefined && typeof config.TOC !== 'boolean')
    throw new RdxConfigError('TOC must be a boolean.')
  if (config.description !== undefined)
    text(config.description, 'description', true)
  if (config.lang !== undefined) text(config.lang, 'lang')
  if (config.docsDir !== undefined) text(config.docsDir, 'docsDir')

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
  }

  const typed = config as RdxConfig
  return {
    ...typed,
    TOC: typed.TOC ?? false,
    search: typed.search ?? false,
    description: typed.description ?? '',
    lang: typed.lang ?? 'en',
    docsDir: typed.docsDir ?? 'docs',
    theme: { defaultTheme: typed.theme?.defaultTheme ?? 'system' },
    plugins: typed.plugins ?? [],
  }
}

export function defineConfig(config: RdxConfig): RdxConfig {
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
  rootDir = path.resolve(rootDir)
  const config = resolveConfig(input)
  const docsRoot = resolveProjectPath(rootDir, config.docsDir, 'docsDir')
  const sources: RdxContentSource[] = [
    {
      id: 'current',
      label: 'Current',
      docsDir: config.docsDir,
      routePrefix: '',
    },
  ]
  const commands: RdxPluginCommand[] = []
  const commandNames = new Set([
    'dev',
    'build',
    'start',
    'prepare',
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
    if (contribution.sources === undefined) continue
    if (!Array.isArray(contribution.sources))
      throw new RdxConfigError(
        `plugin "${plugin.name}" sources must be an array.`
      )
    for (const value of contribution.sources) {
      const source = object(value, `plugin "${plugin.name}" content source`)
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
        existsSync(path.join(docsRoot, prefix)) ||
        existsSync(path.join(docsRoot, `${prefix}.mdx`))
      ) {
        throw new RdxConfigError(
          `content source ${id} conflicts with live documentation at /docs/${prefix}.`
        )
      }
      if (source.badge !== undefined)
        text(source.badge, `content source ${id}.badge`)
      sources.push(source as RdxContentSource)
    }
  }
  return { rootDir, config, sources, commands }
}
