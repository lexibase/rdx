import { defineConfig } from '@lexibase/rdx'

export default defineConfig({
  description: 'Documentation built with RDX.',
  // Site identity, SEO and link previews. '/' paths refer to files in public/.
  metadata: {
    // The single site name: browser titles, social previews and default branding.
    applicationName: 'My documentation',
    // Footer starting year. Change it to an earlier founding year if needed.
    since: new Date().getFullYear(),
    // Set metadataBase to your public site URL to resolve relative share images.
    // Optional examples below: uncomment only after adding the referenced files.
    // icons: {
    //   icon: [
    //     { url: '/icon.svg', type: 'image/svg+xml' },
    //     { url: '/icon.png', sizes: '96x96', type: 'image/png' },
    //   ],
    //   shortcut: '/favicon.ico',
    // },
    // icon: browser tab icons with optional sizes and MIME types.
    // shortcut: traditional favicon link for browser compatibility.
    // manifest: '/site.webmanifest',
    // The web app manifest describes its name, icons, etc.; RDX does not create it.
  },
  // Floating heading navigation; shown only on pages with enough sections.
  TOC: false,
  // Local documentation search in the navbar; no external search service needed.
  search: false,
  // Optional navbar text does not change metadata.applicationName.
  navbar: {
    title: '', // Text beside the logo; empty or omitted shows only the logo.
    // logo: Logo, // Import a React component that accepts className, not an image path.
    actions: {
      github: {
        visible: true,
        url: '#',
      },
      showToggleMode: true,
    },
  },
  // When disabled, '/' redirects to '/docs'.
  // To use your own home.tsx, import its component and set homepage.component.
  homepage: {
    enabled: false,
  },
  theme: {
    defaultTheme: 'system',
  },
})
