# Configuration and plugins (API v1)

RDX loads `rdx.config.ts` from the documentation project root. The CLI validates
it before preparing `.rdx/` or launching Next.js. The runtime uses the same
validation and defaults. Existing plain-object exports and the first beta's
`RdxRuntimeConfig` type remain supported.

```ts
import { defineConfig } from '@lexibase/rdx-next'

export default defineConfig({
  title: 'My documentation',
  description: 'Documentation for my project.',
  lang: 'pt-BR',
  docsDir: 'docs',
  theme: { defaultTheme: 'system' },
})
```

Only `title` is required. Defaults are `description: ''`, `lang: 'en'`,
`docsDir: 'docs'`, `theme.defaultTheme: 'system'`, and `plugins: []`.
The documentation URL remains `/docs`; `docsDir` changes the filesystem source,
not the URL. Theme values are `system`, `light`, and `dark`.

`navbar.title` overrides the site title in the header; an empty string hides it.
`navbar.actions.github` accepts `{ visible: boolean, url: string }` with an HTTP
or HTTPS URL. Unknown configuration keys fail with the field name rather than
being silently ignored. Configuration paths must stay inside the project.

## Optional homepage and navigation

By default `/` redirects to `/docs`. Enable the built-in landing page explicitly:

```ts
export default defineConfig({
  title: 'My documentation',
  description: 'Everything you need to build with our tools.',
  homepage: {
    enabled: true,
    title: 'Build something great.',
    description: 'Guides, examples, and reference in one place.',
    buttons: [
      { label: 'Get started', href: '/docs/init/intro' },
      { label: 'GitHub', href: 'https://github.com/lexibase/rdx' },
    ],
  },
})
```

`homepage.enabled` defaults to false. The homepage title and description fall back
to the site configuration. Omitting `buttons` supplies a documentation button;
an empty array hides all hero buttons. Links accept root-relative paths (starting
with a single `/`) or HTTP(S) URLs, not JavaScript URLs or protocol-relative URLs.
The first button is primary. This initial API is configuration-based; custom React
homepage components are not supported yet.

The navbar includes Documentation, optional Home and GitHub links, and a native
expandable version dropdown when additional content sources exist. Switching
versions preserves the current page when it exists in the destination; otherwise
it opens that edition's first page. Archived versions keep their badge.
The dropdown and collapsible sidebar support keyboard navigation without client
JavaScript. A skip link and visible focus outlines support keyboard users.
Navigation wraps on small screens and the sidebar can be collapsed there or on
desktop. The built-in interface labels currently use English, independently of
the HTML `lang` setting.

Restart development after configuration changes and rebuild for production.
Edit the project-owned `rdx.config.ts`, not generated files inside `.rdx/`, which
are refreshed by the CLI. These changes affect generated sites; the legacy
development website under `apps/web` is not migrated.

For contributors, run `pnpm check`, then
`pnpm --filter @lexibase/rdx-next test:runtime` to exercise a disposable generated
site in development and production. This integration test requires the workspace
packages to be built and does not publish or download framework packages.

## Activating versioning

Install the matching beta of `@lexibase/rdx-versioning` and explicitly configure
it. Installing the package alone does not activate it.

```ts
import { defineConfig } from '@lexibase/rdx-next'
import { versioning } from '@lexibase/rdx-versioning'

export default defineConfig({
  title: 'My documentation',
  plugins: [versioning()],
})
```

Run `pnpm exec rdx prepare` (or `pnpm dev`) to initialize `versions.json` if it
does not exist. Its format stays compatible with the original manifest:

```json
{
  "active": [],
  "archived": []
}
```

Create a snapshot with:

```sh
pnpm exec rdx version 1.0.0
```

This copies the current `docsDir` to `versioned_docs/version-1.0.0/` and prepends
`1.0.0` to `active`. Existing snapshots are never overwritten. Labels support
`major.minor.patch` and prerelease suffixes such as `1.0.0-beta.1`.

The live docs remain at `/docs/guides/intro`; the snapshot appears at
`/docs/1.0.0/guides/intro`. A navbar dropdown appears only when extra content
sources exist. To archive a version, move its label from `active` to `archived`
in `versions.json`; keep the snapshot directory. It remains accessible and is
marked `Archived`. The order of each array is the navigation order.

Optional settings:

```ts
versioning({
  versionsFile: 'versions.json',
  versionsDir: 'versioned_docs',
})
```

The snapshot store and live documentation must be separate directories.
Malformed manifests, missing snapshots, duplicate versions, invalid paths, and
route collisions fail with an actionable message. Plugin removal means removing
the factory from `plugins` and uninstalling the package; the core then ignores
both `versions.json` and the snapshot store. Removing a plugin never deletes
documentation.

Configuration/plugin changes require restarting the development server.
Production changes require a new build.

## Writing a plugin

Plugins are trusted server-side code. Hooks run in config order. Only explicitly
listed plugin objects are executed; no package scanning or automatic installation
occurs.

```ts
import type { RdxPlugin } from '@lexibase/rdx-next'

export function translations(): RdxPlugin {
  return {
    name: 'my-translations',
    apiVersion: 1,
    setup({ rootDir, config, command }) {
      return {
        sources: [
          {
            id: 'pt',
            label: 'Português',
            docsDir: 'translations/pt',
            routePrefix: 'pt',
          },
        ],
      }
    },
  }
}
```

`setup` may be async and is called by CLI preflight and by runtime reads. It must
not assume it runs once. Use `command` to scope filesystem writes to explicit
preparation/command operations; runtime reads and production startup should not
write project content. No Next.js or React imports are required for plugins.

The context contains the absolute `rootDir`, normalized `config`, and `command`.
Contributed `sources` contain a unique `id`, `label`, project-relative `docsDir`,
and a unique single-segment `routePrefix`. Optional `badge` text is displayed in
navigation and on the source's pages. These sources are generic: the Next
adapter does not import or know about the versioning plugin.

Plugins may also return a `commands` array on the plugin object. Each command has
`name`, `description`, and `run(context)`. Its context additionally contains
`args: string[]`. Built-in or duplicate command names are rejected. For example,
the versioning package registers `version`; without the plugin, that command is
unavailable.

## Legacy development website

`apps/web` still uses its original routes and private `@rdx/rdx-versioning`
helper. Version-specific legacy loaders now live in private `@rdx/core`
compatibility code. They are not shipped in `@lexibase/rdx-core`. The new plugin
uses the existing active/archived manifest format but has an independent snapshot
layout, so migrating old content requires copying the appropriate version trees.
This keeps the old showcase usable without making new projects depend on it.
