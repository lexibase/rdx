import { defineConfig } from '@lexibase/rdx-core/config'
import type { RDXConfig } from '@lexibase/rdx-types'
import { versioning } from '@lexibase/rdx-versioning'
import { Logo } from '@lexibase/rdx-ui/components/logo'

const config = {
  // SEO and link previews. Paths starting with '/' refer to files in public/.
  metadata: {
    // Public site URL used to resolve relative metadata URLs, such as share images.
    metadataBase:
      process.env.NEXT_PUBLIC_SITE_URL || 'https://rdx-tool.vercel.app',
    // The single site name: browser titles, social previews and default branding.
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
      // Browser tab icons; each entry can specify its size and MIME type.
      icon: [
        { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      ],
      shortcut: '/favicon.ico', // Traditional favicon link for browser compatibility.
    },
    // Web app manifest (name, icons, etc.). This file must exist in public/.
    manifest: '/site.webmanifest',
    // Instructions for search engines, not access control or a privacy setting.
    robots: { index: true, follow: true },
    // Link previews on social platforms; title and description inherit site values.
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
  // HTML document language; this does not translate your documentation.
  lang: 'pt-BR',
  // When disabled, '/' redirects to '/docs'. A custom component can be provided.
  homepage: { enabled: true },
  // Installed plugins only become active when registered here.
  plugins: [versioning()],
  // Floating heading navigation; shown only on pages with enough sections.
  TOC: true,
  // Local documentation search in the navbar; no external search service needed.
  search: true,
  description:
    'A tool for building documentation with MDX in a friendly and focused way — fast, easy, and built for clarity',

  theme: {
    defaultTheme: 'system',
  },

  navbar: {
    // Text beside the logo; empty or omitted shows only the logo.
    title: '',
    // Imported React component, not an image path or JSX. Accepts className.
    logo: Logo,

    actions: {
      github: {
        visible: true,
        url: 'https://github.com/lexibase/rdx',
      },
      showToggleMode: false,
    },
  },
} satisfies RDXConfig

defineConfig(config)

export default config
