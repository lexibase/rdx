import type { ComponentType } from 'react'
import type { RdxPlugin } from './plugins'

/**
 * Public configuration shared by defineConfig, the CLI, runtime and plugins.
 *
 * Set the site name once in metadata.applicationName. Live documentation always
 * lives in docs/; the generated .rdx/ directory is not a customization API.
 *
 * @example
 * export default defineConfig({
 *   metadata: { applicationName: 'My documentation' },
 *   navbar: { title: '' },
 *   homepage: { enabled: false },
 * })
 */
export type RDXConfig = {
  /**
   * Enable local documentation search in the navbar.
   * Search uses the project's content sources; no external service is required.
   * @defaultValue false
   */
  search?: boolean
  /**
   * Enable floating heading navigation on documentation pages.
   * Hidden when a page has too few sections to navigate.
   * @defaultValue false
   */
  TOC?: boolean
  /**
   * Default HTML and social-preview description of the project.
   * This does not replace descriptions authored in documents or the homepage.
   * @defaultValue ''
   */
  description?: string
  /**
   * HTML document language, such as 'en' or 'pt-BR'.
   * This does not automatically translate the interface or documentation.
   * @defaultValue 'en'
   */
  lang?: string
  /** Site identity and SEO options. applicationName is required. */
  metadata: RdxMetadata
  /** Optional landing page. Disabled by default; '/' then redirects to '/docs'. */
  homepage?: RdxHomepage
  /**
   * Activated plugin objects, returned by their factories, e.g. versioning().
   * Installing a package alone does not activate it. Hooks run in this order.
   * @defaultValue []
   */
  plugins?: RdxPlugin[]
  /** Theme preferences for the shared RDX interface. */
  theme?: {
    /**
     * Theme used on first visit, before the user chooses a preference.
     * 'system' follows the operating system's color preference.
     * @defaultValue 'system'
     */
    defaultTheme?: 'system' | 'dark' | 'light'
  }
  /** Logo, optional label and action buttons in the shared navbar. */
  navbar?: {
    /**
     * Text beside the logo. Empty or omitted shows only the logo.
     * This does not change metadata.applicationName or browser titles.
     * @defaultValue ''
     */
    title?: string
    /**
     * Imported React component accepting an optional className for styling.
     * Pass the component itself, not JSX or an image path. Defaults to the RDX logo.
     * @example
     * logo: MyLogo
     */
    logo?: ComponentType<{ className?: string }>
    /** Optional GitHub link and theme toggle. Omitted actions remain hidden. */
    actions?: {
      /** Show the system/light/dark theme switcher in the navbar. */
      showToggleMode?: boolean
      /** Optional repository link. Both visibility and URL must be specified. */
      github?: {
        /** Whether the repository action is displayed. */
        visible: boolean
        /**
         * Absolute HTTP(S) repository URL, or '#' as a temporary placeholder.
         * Real links open in a new tab; the placeholder stays in the current tab.
         */
        url: string
      }
    }
  }
}

/** Options for the built-in landing page or a project-owned home.tsx component. */
export type RdxHomepage = {
  /**
   * Show a homepage at '/'. When false or omitted, '/' redirects to '/docs'.
   * @defaultValue false
   */
  enabled?: boolean
  /**
   * Imported React component that owns the homepage body.
   * The shared navbar remains; built-in title, description and buttons are not
   * injected into this component. Used only when enabled is true.
   * @example
   * component: Home // import Home from './home'
   */
  component?: ComponentType
  /** Built-in homepage heading. Defaults to metadata.applicationName. */
  title?: string
  /** Optional text below the built-in heading; omitted means no description. */
  description?: string
  /** Buttons below the built-in description. The first button is primary. */
  buttons?: {
    /** Visible button text and accessible name; must not be empty. */
    label: string
    /** Root-relative path or absolute HTTP(S) URL, e.g. '/docs/init/intro'. */
    href: string
  }[]
}

/**
 * Portable subset of Next.js metadata, translated by the RDX runtime.
 * Root-relative asset URLs refer to files the project owns in public/.
 * No asset files, deployment domain or global canonical URL are created here.
 */
export type RdxMetadata = {
  /**
   * Absolute HTTP(S) deployment URL used to resolve relative metadata URLs.
   * Set this to the real public site URL when deploying; no domain is assumed.
   * @example 'https://docs.example.com'
   */
  metadataBase?: string
  /**
   * Required, non-empty site name: the single source of shared branding.
   * Supplies the browser title and page-title suffix, social-preview defaults,
   * footer, accessible logo name and built-in homepage fallback.
   */
  applicationName: string
  /** Optional people or organizations credited in the document's metadata. */
  authors?: {
    /** Author or organization name; independent of the site's applicationName. */
    name: string
    /** Optional absolute HTTP(S) profile or organization URL. */
    url?: string
  }[]
  /** Optional keywords emitted in the document's metadata. */
  keywords?: string[]
  /** Browser and device icons. Referenced files must exist in public/ or online. */
  icons?: {
    /**
     * Browser tab icon URL, or a list of icons with explicit sizes and MIME types.
     * @example '/favicon.ico'
     */
    icon?:
      | string
      | {
          /** Root-relative asset path or absolute HTTP(S) image URL. */
          url: string
          /** Icon dimensions, such as '96x96', or 'any' for a scalable icon. */
          sizes?: string
          /** Image MIME type, such as 'image/png' or 'image/svg+xml'. */
          type?: string
        }[]
    /**
     * Traditional shortcut icon link for browser compatibility.
     * @example '/favicon.ico'
     */
    shortcut?: string
    /**
     * Icon used when adding the site to the home screen on Apple devices.
     * @example '/apple-touch-icon.png'
     */
    apple?: string
  }
  /**
   * URL of an existing web app manifest describing the app's name, icons, etc.
   * RDX only emits the link; it does not generate the manifest or enable a PWA.
   * @example '/site.webmanifest'
   */
  manifest?: string
  /** Optional crawler directives; these do not protect content from access. */
  robots?: {
    /** Whether search engines are instructed to index the page. */
    index?: boolean
    /** Whether search engines are instructed to follow links on the page. */
    follow?: boolean
  }
  /** Optional Open Graph link previews. No fixed URL is applied to every page. */
  openGraph?: {
    /** Preview title override; defaults to metadata.applicationName. */
    title?: string
    /** Preview description override; defaults to the root description. */
    description?: string
    /** Optional site name shown by platforms that support it. */
    siteName?: string
    /** Open Graph locale, e.g. 'pt_BR' (underscore), unlike HTML lang 'pt-BR'. */
    locale?: string
    /** Supported Open Graph content type for the documentation site. */
    type?: 'website'
    /** Preview images. Relative URLs are resolved against metadataBase. */
    images?: {
      /** Root-relative asset path or absolute HTTP(S) image URL. */
      url: string
      /** Actual image width in pixels; a positive integer. */
      width?: number
      /** Actual image height in pixels; a positive integer. */
      height?: number
      /** Accessible description of the image. */
      alt?: string
    }[]
  }
  /** Optional Twitter/X card metadata. */
  twitter?: {
    /** Text-oriented summary or a large-image preview card. */
    card?: 'summary' | 'summary_large_image'
    /** Card title override; defaults to metadata.applicationName. */
    title?: string
    /** Card description override; defaults to the root description. */
    description?: string
    /** Account associated with the site, usually '@account'. */
    site?: string
    /** Account credited as the creator, usually '@account'. */
    creator?: string
    /** Image URLs; root-relative paths are resolved against metadataBase. */
    images?: string[]
  }
}

/** Compatibility alias for the first beta; points to the same RDXConfig contract. */
export type RdxRuntimeConfig = RDXConfig

/** Internal configuration after validation and application of RDX defaults. */
export type ResolvedRdxConfig = Omit<
  RDXConfig,
  'description' | 'lang' | 'theme' | 'plugins' | 'TOC' | 'search'
> & {
  /** Resolved local search activation. */
  search: boolean
  /** Resolved floating heading navigation activation. */
  TOC: boolean
  /** Resolved site description; empty when not provided. */
  description: string
  /** Resolved HTML language; 'en' when not provided. */
  lang: string
  /** Resolved initial theme preference. */
  theme: { defaultTheme: 'system' | 'dark' | 'light' }
  /** Activated plugins, in declaration order. */
  plugins: RdxPlugin[]
}
