import { defineConfig } from '../src/config/index'
import type {
  RDXConfig,
  RdxRuntimeConfig,
  RdxPlugin,
} from '@lexibase/rdx-types'

const alias: RdxRuntimeConfig = {
  metadata: { applicationName: 'Compatible config' },
}
const publicConfig: RDXConfig = alias

// @ts-expect-error The site name belongs only in metadata.applicationName.
defineConfig({ title: 'Old name', metadata: { applicationName: 'Docs' } })

// @ts-expect-error applicationName is required, not replaced by a metadata title.
defineConfig({ metadata: {} })

// @ts-expect-error Root metadata is required.
defineConfig({})
const plugin: RdxPlugin = {
  name: 'contract-test',
  apiVersion: 1,
  async setup({ rootDir, command, config }) {
    const context: [string, string, string] = [
      rootDir,
      command,
      config.metadata.applicationName,
    ]
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
  TOC: true,
  search: true,
  metadata: {
    applicationName: 'Typed docs',
    metadataBase: 'https://docs.example.com',
    authors: [{ name: 'Team' }],
    openGraph: { type: 'website', images: [{ url: '/og.png', width: 1200 }] },
    twitter: { card: 'summary_large_image' },
  },
  navbar: { logo: () => null, actions: { showToggleMode: true } },
  homepage: { enabled: true, buttons: [{ label: 'Docs', href: '/docs' }] },
  theme: { defaultTheme: 'dark' },
})

// @ts-expect-error TOC activation must be boolean, not a string.
defineConfig({ metadata: { applicationName: 'Typed docs' }, TOC: 'false' })

defineConfig({
  // @ts-expect-error Search indexing is managed by RDX, not public configuration.
  metadata: { applicationName: 'Typed docs', robots: { index: true } },
})

defineConfig({
  // @ts-expect-error Only the supported portable metadata fields are accepted.
  metadata: { applicationName: 'Typed docs', favicon: '/favicon.ico' },
})

// @ts-expect-error Search activation must be boolean.
defineConfig({ metadata: { applicationName: 'Typed docs' }, search: 'true' })

defineConfig({
  metadata: { applicationName: 'Typed docs' },
  // @ts-expect-error Homepage activation must be boolean.
  homepage: { enabled: 'yes' },
})

defineConfig({
  metadata: { applicationName: 'Typed docs' },
  homepage: { enabled: true, component: () => null },
})

defineConfig({
  metadata: { applicationName: 'Typed docs' },
  // @ts-expect-error Homepage components must be components, not path strings.
  homepage: { component: './home.tsx' },
})

defineConfig({
  metadata: { applicationName: 'Typed docs' },
  // @ts-expect-error Unknown config keys must also be rejected by TypeScript.
  docsDirectory: 'content',
})

defineConfig({
  metadata: { applicationName: 'Typed docs' },
  // @ts-expect-error Live documentation always uses docs/; its path is not configurable.
  docsDir: 'content',
})

defineConfig({
  metadata: { applicationName: 'Typed docs' },
  // @ts-expect-error Theme values are a closed union.
  theme: { defaultTheme: 'purple' },
})

defineConfig({
  metadata: { applicationName: 'Typed docs' },
  // @ts-expect-error Plugins must support the current API version.
  plugins: [{ name: 'future', apiVersion: 2 }],
})
