import { defineConfig } from '@lexibase/rdx-core/config'
import type { RDXConfig } from '@lexibase/rdx-types'
import { versioning } from '@lexibase/rdx-versioning'
import { Logo } from '@lexibase/rdx-ui/components/logo'

const config = {
  // Site identity, SEO and link previews. '/' paths refer to files in public/.
  metadata: {
    // Public site URL used to resolve relative metadata URLs, such as share images.
    metadataBase:
      process.env.NEXT_PUBLIC_SITE_URL || 'https://rdx-tool.vercel.app',
    // The single site name: browser titles, social previews and default branding.
    applicationName: 'RDX',
    // Starting year used in the footer; equal start/current years appear once.
    since: 2025,
    authors: [{ name: 'DuHNunes', url: 'https://github.com/lexibase/rdx' }],
    keywords: [
      'duhnunes',
      'RDX',
      'documentation',
      'nextjs',
      'tailwindcss',
      'shadcn',
      'mdx',
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
    // Shared preview images; documentation pages use their own title and description.
    openGraph: {
      type: 'website',
      images: [
        {
          url: '/icons/favicon-96x96.png',
          width: 96,
          height: 96,
          alt: 'RDX logo',
        },
      ],
    },
    twitter: {
      card: 'summary',
      images: ['/icons/favicon-96x96.png'],
    },
  },
  // HTML and interface language: 'en' or 'pt-BR'. Your documents stay as written.
  lang: 'pt-br',
  // When disabled, '/' redirects to '/docs'. A custom component can be provided.
  homepage: { enabled: true },
  // Installed plugins only become active when registered here.
  plugins: [versioning()],
  // Floating heading navigation; shown only on pages with enough sections.
  TOC: true,
  // Local documentation search in the navbar; no external search service needed.
  search: true,
  description:
    'Simple documentation built on Next.js, Tailwind CSS, and shadcn/ui. Write MDX, add folders, and publish your docs.',

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
