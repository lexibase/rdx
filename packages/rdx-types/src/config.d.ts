import type { ComponentType } from 'react'
import type { RdxPlugin } from './plugins'

/** @deprecated Legacy development website config. New projects use RdxConfig. */
export type RDXConfig = {
  /**
   * The title of the documentation site.
   * Displayed in the navbar and browser tab.
   *
   */
  title: string

  /**
   * A short description of the project.
   * Used for SEO and meta tags.
   *
   */
  description: string

  /**
   * The name of the author or organization.
   * Can be shown in the metadata.
   *
   */
  author: string

  /**
   * Path to the favicon file.
   * Must be located at 'public/favicon.ico' by default.
   *
   */
  favicon: string

  /**
   * The base URL where the documentation is hosted.
   * Used for generating canonical links and metadata.
   *
   */
  url: string

  /**
   * Theme configuration options.
   * If omitted, the default theme is 'system'
   *
   */
  theme?: {
    /**
     * The default theme to apply on first load.
     * Accepted values: 'system', 'dark', or 'light'
     *
     */
    defaultTheme: string
  }

  /**
   * Navbar configurations options.
   *
   */
  navbar: {
    /**
     * Title displayed next to the logo in the navbar.
     * Leave empty to show only the logo.
     *
     */
    title?: string

    /**
     * This logo component is injected via `rdx.config.ts` and must be a valid React component.
     * It should accept at least a `className` prop for styling purposes.
     * Consumers of the design system can override the default logo by providing their own component,
     * such as an inline SVG or image-based logo, allowing full customization of branding.
     *
     */
    logo: ComponentType<{ className?: string }>

    /**
     * Configuration for navbar action buttons
     *
     */
    actions?: {
      /**
       * Configuration for github button
       *
       */
      github?: {
        /**
         * Whether to show the GitHub button in the navbar.
         *
         */
        visible: boolean
        /**
         * URL of the GitHub repository.
         * Used as the target for the GitHub button.
         *
         */
        url: string
      }

      /**
       * Whether to display the theme toggle (system/dark/light) in the navbar.
       *
       */
      showToggleMode?: boolean
    }
  }
}

/** Public configuration shared by the CLI, runtime, and plugins. */
export type RdxHomepage = {
  enabled?: boolean
  title?: string
  description?: string
  buttons?: { label: string; href: string }[]
}

export type RdxConfig = {
  title: string
  description?: string
  lang?: string
  docsDir?: string
  homepage?: RdxHomepage
  plugins?: RdxPlugin[]
  theme?: {
    defaultTheme?: 'system' | 'dark' | 'light'
  }
  navbar?: {
    title?: string
    actions?: {
      github?: {
        visible: boolean
        url: string
      }
    }
  }
}

/** Compatibility alias for projects created by the first beta. */
export type RdxRuntimeConfig = RdxConfig

export type ResolvedRdxConfig = Omit<
  RdxConfig,
  'description' | 'lang' | 'docsDir' | 'theme' | 'plugins'
> & {
  description: string
  lang: string
  docsDir: string
  theme: { defaultTheme: 'system' | 'dark' | 'light' }
  plugins: RdxPlugin[]
}
