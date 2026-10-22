import { defineConfig } from '@lexibase/rdx-next'

export default defineConfig({
  title: 'My documentation',
  description: 'Documentation built with RDX.',
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
