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
/** Language inventory frozen for one content source/edition. */
export type RdxSourceLocalization = RdxLocalization & {
  docs: Record<string, string>
}

export type RdxSnapshotContext = RdxPluginContext & {
  version: string
  /** New primary snapshot directory, relative to the project. */
  snapshotDir: string
}
/** Hooks declare files/trees; the snapshot owner copies them in one transaction. */
export type RdxSnapshotContribution = {
  directories?: { sourceDir: string; snapshotDir: string }[]
  files?: { filename: string; content: string }[]
}

/** A separate documentation tree exposed below /docs/<routePrefix>. */
export type RdxContentSource = {
  id: string
  label: string
  docsDir: string
  routePrefix: string
  badge?: string
  /** Canonical route prefix to redirect this historical source to. */
  redirectTo?: string
  /** Canonical snapshot label, including when this source is a redirect alias. */
  version?: string
  /** Retained identity metadata for a replaced snapshot; its content is not served. */
  previousSnapshot?: { version: string; docsDir: string }
  /** Internal localized view; the original source/edition identity is unchanged. */
  basePath?: string
  fallbackDocsDir?: string
  fallbackOnly?: boolean
  /** Internal source-language inventory; snapshot values are immutable. */
  localization?: RdxSourceLocalization
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
  /** Synchronous, declaration-only hook. It must not write or reserve paths. */
  snapshot?: (context: RdxSnapshotContext) => RdxSnapshotContribution | void
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
