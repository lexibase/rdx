import { defineConfig } from '@lexibase/rdx-core/config'
import type { RdxConfig } from '@lexibase/rdx-types'
import { versioning } from '@lexibase/rdx-versioning'
import { Logo } from '@lexibase/rdx-ui/components/logo'

const config = {
  title: 'RDX',
  metadata: {
    metadataBase:
      process.env.NEXT_PUBLIC_SITE_URL || 'https://rdx-tool.vercel.app',
    applicationName: 'RDX',
    authors: [{ name: 'DuHNunes', url: 'https://github.com/lexibase/rdx' }],
    keywords: [
      'duhnunes',
      'RDX',
      'documentation',
      'documento',
      'padrão',
      'pt-br',
      'ptbr',
      'nextjs',
      'mdx',
      'rdx',
    ],
    icons: {
      icon: [
        { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      ],
      shortcut: '/favicon.ico',
    },
    manifest: '/site.webmanifest',
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      images: [
        {
          url: '/icons/favicon-96x96.png',
          width: 1200,
          height: 630,
          alt: 'RDX Open Graph Image TEMPORARY',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/icons/favicon-96x96.png'],
    },
  },
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
