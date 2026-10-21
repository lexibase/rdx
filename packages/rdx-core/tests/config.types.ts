import { defineConfig } from '../src/config/index'

defineConfig({
  title: 'Typed docs',
  docsDir: 'content',
  theme: { defaultTheme: 'dark' },
})

// @ts-expect-error Unknown config keys must also be rejected by TypeScript.
defineConfig({ title: 'Typed docs', docsDirectory: 'content' })

// @ts-expect-error Theme values are a closed union.
defineConfig({ title: 'Typed docs', theme: { defaultTheme: 'purple' } })

defineConfig({
  title: 'Typed docs',
  // @ts-expect-error Plugins must support the current API version.
  plugins: [{ name: 'future', apiVersion: 2 }],
})
