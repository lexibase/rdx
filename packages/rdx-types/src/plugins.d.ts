import type { ResolvedRdxConfig } from './config'

/** A separate documentation tree exposed below /docs/<routePrefix>. */
export type RdxContentSource = {
  id: string
  label: string
  docsDir: string
  routePrefix: string
  badge?: string
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
  setup?: (
    context: RdxPluginContext
  ) =>
    | { sources?: RdxContentSource[]; runtimeFiles?: string[] }
    | void
    | Promise<{ sources?: RdxContentSource[]; runtimeFiles?: string[] } | void>
  commands?: RdxPluginCommand[]
}

export type RdxProject = {
  rootDir: string
  config: ResolvedRdxConfig
  sources: RdxContentSource[]
  commands: RdxPluginCommand[]
  /** Project-relative files plugins need when serving deployed documentation. */
  runtimeFiles: string[]
}
