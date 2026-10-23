import { defineConfig } from '@lexibase/rdx-next'

export default defineConfig({
  title: 'My documentation',
  description: 'Documentation built with RDX.',
  metadata: {
    // Set metadataBase to your public site URL when deploying.
    // Asset URLs such as '/favicon.ico' refer to files in public/.
  },
  TOC: false,
  search: false,
  navbar: {
    title: '',
    actions: {
      github: {
        visible: true,
        url: '#',
      },
      showToggleMode: true,
    },
  },
  homepage: {
    enabled: false,
  },
  theme: {
    defaultTheme: 'system',
  },
})
