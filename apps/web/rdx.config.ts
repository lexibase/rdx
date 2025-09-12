import type { RDXConfig } from '@rdx/types/config'
import { Logo } from '@rdx/ui/components/logo'

const config: RDXConfig = {
  title: 'RDX',
  description: '',
  author: 'DuHNunes',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://rdx-tool.vercel.app',
  // baseUrl: '/',

  theme: {
    defaultTheme: 'system',
  },

  navbar: {
    // Leave the title empty so that no title appears next to the logo
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
      githubButton: true,
      githubUrl: 'https://github.com/lexibase/rdx',
      showToggleMode: false,
    },
  },
}

export default config
