import { defineConfig } from '@lexibase/rdx-core/config'
import type { RdxConfig } from '@lexibase/rdx-types'
import { versioning } from '@lexibase/rdx-versioning'
import { Logo } from '@lexibase/rdx-ui/components/logo'

// Site-specific metadata stays outside the portable framework configuration.
export const siteMetadata = {
  author: 'DuHNunes',
  favicon: '/favicon.ico',
  url: 'https://rdx-tool.vercel.app',
}

const config = {
  title: 'RDX',
  lang: 'pt-BR',
  docsDir: 'docs',
  homepage: { enabled: true },
  plugins: [versioning()],
  TOC: true,
  search: true,
  description:
    'A tool for building documentation with MDX in a friendly and focused way — fast, easy, and built for clarity',

  theme: {
    defaultTheme: 'system',
  },

  navbar: {
    // Leave the title empty or delete so that no title appears next to the logo
    title: '',
    // Custom logo component (SVG or React)
    // Must accept `className` for styling
    logo: Logo,

    actions: {
      github: {
        visible: true,
        url: 'https://github.com/lexibase/rdx',
      },
      showToggleMode: false,
    },
  },
} satisfies RdxConfig

defineConfig(config)

export default config
