import type { ResolvedRdxConfig } from './config'

/** A content language; folder aliases are separate from language tags. */
export type RdxLocaleDefinition = {
  code: string
  label: string
  folder?: string
}
export type RdxLocalizationOptions = { locales: RdxLocaleDefinition[] }
export type RdxLocale = RdxLocaleDefinition & { path: string }
export type RdxLocalization = { defaultLocale: string; locales: RdxLocale[] }

/** A separate documentation tree exposed below /docs/<routePrefix>. */
export type RdxContentSource = {
  id: string
  label: string
  docsDir: string
  routePrefix: string
  badge?: string
  /** Canonical route prefix to redirect this historical source to. */
  redirectTo?: string
  /** Internal localized view; the original source/edition identity is unchanged. */
  basePath?: string
  fallbackDocsDir?: string
}

export type RdxPluginContext = {
  rootDir: string
  command: string
  config: ResolvedRdxConfig
}

export type RdxPluginCommand = {
  name: string
  description: string
  run: (context: RdxPluginContext & { args: string[] }) => void | Promise<void>
}

/** Hooks run only for explicitly configured plugins, in declaration order. */
export type RdxPlugin = {
  name: string
  apiVersion: 1
  setup?: (context: RdxPluginContext) =>
    | {
        sources?: RdxContentSource[]
        runtimeFiles?: string[]
        localization?: RdxLocalizationOptions
      }
    | void
    | Promise<{
        sources?: RdxContentSource[]
        runtimeFiles?: string[]
        localization?: RdxLocalizationOptions
      } | void>
  commands?: RdxPluginCommand[]
}

export type RdxProject = {
  rootDir: string
  config: ResolvedRdxConfig
  sources: RdxContentSource[]
  commands: RdxPluginCommand[]
  /** Project-relative files plugins need when serving deployed documentation. */
  runtimeFiles: string[]
  localization?: RdxLocalization
  /** Selected locale on a request-scoped view, never a global mutable setting. */
  locale?: RdxLocale
}
