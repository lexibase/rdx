export type RDXConfig = {
  /**
   * The title of the documentation site.
   * Displayed in the navbar and browser tab.
   */
  title: string
  
  /**
   * A short description of the project.
   * Used for SEO and meta tags.
   */
  description: string

  /**
   * The name of the author or organization.
   * Can be displayed in footer or metadata.
   */
  author: string

  /**
   * Path to the favicon file.
   * Should be a relative URL or absolute path.
   */
  favicon: string
  
  /**
   * The base URL where the documentation is hosted.
   * Used for generating canonical links and metatada.
   */
  url: string

  /**
   * Theme configuration options
   */
  theme: {
    /**
     * The default theme to apply on first load.
     * Common values: 'system', 'dark' or 'light'
     */
    defaultTheme: string
  }

  /**
   * Navbar configurations options.
   */
  navbar: {
    /**
     * Title displayed next to the logo in the navbar.
     * If empty, only the logo will be shown.
     */
    title: string

    /**
     * This logo component is injected via `rdx.config.ts` and must be a valid React component.
     * It should accept at least a `className` prop for styling purposes.
     * Consumers of the design system can override the default logo by providing their own component,
     * such as an inline SVG or image-based logo, allowing full customization of branding.
     */
    logo: React.ComponentType<{className?: string}>

    /**
     * List of navigation links to display in the navbar.
     * Each item must have a label and optionally a custom href.
     */
    items: {
      label: string
      href?: string
    }[]

    /**
     * Configuration for navbar action buttons
     */
    actions: {
      /**
       * Whether to show the GitHub button in the navbar.
       */
      githubButton: boolean

      /**
       * URL to the GitHub repository.
       * Used as the target for the GitHub button.
       */
      githubUrl: string

      /**
       * Wheter to show the theme toggle (system/dark/light)
       */
      showToggleMode: boolean
    },
  },
}
