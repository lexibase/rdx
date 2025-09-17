import type { RDXConfig } from '@rdx/types/config'
import { Logo } from '@rdx/ui/components/logo'

const config: RDXConfig = {
  title: 'RDX',
  description:
    'A tool for building documentation with MDX in a friendly and focused way — fast, easy, and built for clarity',
  author: 'DuHNunes',
  favicon: '/favicon.ico',

  // Set the production url of your site here
  url: 'https://rdx-tool.vercel.app',

  theme: {
    defaultTheme: 'system',
  },

  navbar: {
    // Leave the title empty or delete so that no title appears next to the logo
    title: '',
    // Custom logo component (SVG or React)
    // Must accept `className` for styling
    logo: Logo,

    items: [
      {
        label: 'Docs',
      },
    ],

    actions: {
      github: {
        visible: true,
        url: 'https://github.com/lexibase/rdx',
      },
      showToggleMode: false,
    },
  },
}

export default config
