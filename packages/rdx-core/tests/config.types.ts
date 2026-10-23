import { defineConfig } from '../src/config/index'
import type {
  RdxConfig,
  RdxRuntimeConfig,
  RdxPlugin,
} from '@lexibase/rdx-types'

const alias: RdxRuntimeConfig = { title: 'Compatible config' }
const publicConfig: RdxConfig = alias
const plugin: RdxPlugin = {
  name: 'contract-test',
  apiVersion: 1,
  async setup({ rootDir, command, config }) {
    const context: [string, string, string] = [rootDir, command, config.title]
    void context
    return {
      runtimeFiles: ['meta/manifest.json'],
      sources: [
        {
          id: 'snapshot',
          label: 'Snapshot',
          docsDir: 'history',
          routePrefix: '1.0.0',
        },
      ],
    }
  },
  commands: [
    {
      name: 'snapshot',
      description: 'Create snapshot',
      async run({ args }) {
        const input: string[] = args
        void input
      },
    },
  ],
}
defineConfig({ ...publicConfig, plugins: [plugin] })

defineConfig({
  title: 'Typed docs',
  TOC: true,
  search: true,
  docsDir: 'content',
  navbar: { logo: () => null, actions: { showToggleMode: true } },
  homepage: { enabled: true, buttons: [{ label: 'Docs', href: '/docs' }] },
  theme: { defaultTheme: 'dark' },
})

// @ts-expect-error TOC activation must be boolean, not a string.
defineConfig({ title: 'Typed docs', TOC: 'false' })

// @ts-expect-error Search activation must be boolean.
defineConfig({ title: 'Typed docs', search: 'true' })

// @ts-expect-error Homepage activation must be boolean.
defineConfig({ title: 'Typed docs', homepage: { enabled: 'yes' } })

defineConfig({
  title: 'Typed docs',
  homepage: { enabled: true, component: () => null },
})

// @ts-expect-error Homepage components must be components, not path strings.
defineConfig({ title: 'Typed docs', homepage: { component: './home.tsx' } })

// @ts-expect-error Unknown config keys must also be rejected by TypeScript.
defineConfig({ title: 'Typed docs', docsDirectory: 'content' })

// @ts-expect-error Theme values are a closed union.
defineConfig({ title: 'Typed docs', theme: { defaultTheme: 'purple' } })

defineConfig({
  title: 'Typed docs',
  // @ts-expect-error Plugins must support the current API version.
  plugins: [{ name: 'future', apiVersion: 2 }],
})
