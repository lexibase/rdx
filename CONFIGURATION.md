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

`navbar.title` adds text beside the logo; absent or empty means logo-only, as in
the development website. `navbar.logo` accepts a React component with an optional
`className` prop and defaults to the shared RDX logo.
`navbar.actions.github` accepts `{ visible: boolean, url: string }` with an HTTP
or HTTPS URL, or the explicit placeholder `"#"`. Generated projects include the
GitHub action with `visible: true, url: '#'` and `showToggleMode: true`. Replace
`#` with the project's repository URL when available. The placeholder stays in
the current tab; real repository URLs open in a new tab. Existing project
configurations are not modified. Unknown configuration keys fail with the field name rather than
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

`homepage.enabled` defaults to false. With only `{ enabled: true }`, the homepage
is the same centered logo and site name as `apps/web`, not a marketing hero.
The title defaults to the site title; descriptions and buttons appear only when
explicitly configured. Links accept root-relative paths (starting
with a single `/`) or HTTP(S) URLs, not JavaScript URLs or protocol-relative URLs.
The first button is primary.

For a custom homepage, create `home.tsx` at the project root:

```tsx
import { Home } from '@lexibase/rdx-ui/components/home'

export default function MyHome() {
  return <Home title="My project" />
}
```

Then import the component in `rdx.config.ts`:

```ts
import { defineConfig } from '@lexibase/rdx-next'
import MyHome from './home'

export default defineConfig({
  title: 'My project',
  homepage: { enabled: true, component: MyHome },
})
```

The custom component owns the homepage body; the shared navbar remains. Pass a
component, not JSX or a string file path. Custom components can import the same
buttons, logo and other exports from `@lexibase/rdx-ui`. Homepage-specific
`title`, `description` and `buttons` are used by the built-in Home, not injected
into a custom component.

The navbar uses the original logo, Docs link, optional GitHub icon/theme toggle,
and the same Base UI version dropdown as `apps/web`. The logo returns to the
homepage when enabled. Set `navbar.actions.showToggleMode: true` to show the
shared theme toggle, independently of the GitHub action. Switching
versions preserves the current page when it exists in the destination; otherwise
it opens that edition's first page. The dropdown is absent without extra sources;
archived versions retain their separate group, icon and muted styling.
The Base UI dropdown supports keyboard selection, Escape, focus return and outside
click dismissal. The mobile sidebar uses a modal dialog with focus containment;
desktop keeps the development site's sidebar. A skip link supports keyboard users.
The built-in interface labels currently use English, independently of
the HTML `lang` setting.

Restart development after configuration changes and rebuild for production.
Edit the project-owned `rdx.config.ts`, not generated files inside `.rdx/`, which
are refreshed by the CLI. `apps/web` and generated sites now import the same
navbar, dropdown, Home, sidebar, MDX components and theme from `packages/rdx-ui`,
published as `@lexibase/rdx-ui`. Only their content/version adapters differ.
Tailwind scanning, PostCSS and Next's transpilation are configured by the runtime;
there are no monorepo paths or private UI dependencies in generated projects.

For contributors, use a supported Node.js version matching
`^22.18.0 || ^24.11.0 || >=26.0.0` for the monorepo build tools.
Generated projects retain Node >=20.9 support.

Run `pnpm check`, then `pnpm --filter @lexibase/rdx-next test:runtime` to exercise
a disposable generated site in development and production. This integration test requires the workspace
packages to be built and does not publish or download framework packages.
Optional browser checks use an installed Playwright module and browser via
`RDX_PLAYWRIGHT_MODULE` and `RDX_BROWSER_EXECUTABLE`. Set `RDX_THEME_SCREENSHOTS`
to a disposable output directory to save desktop/mobile screenshots.
With those browser variables configured, `pnpm --filter web test:runtime`
also checks hydration and version persistence in the legacy development website.

## Public files: images, favicon and downloads

Use `public/` at the documentation project root, beside `docs/` and
`rdx.config.ts`. New projects include an image and a downloadable text example.
Existing projects get an empty `public/` automatically when preparing the runtime.

| Project file                | Site URL              |
| --------------------------- | --------------------- |
| `public/images/diagram.png` | `/images/diagram.png` |
| `public/files/manual.pdf`   | `/files/manual.pdf`   |
| `public/favicon.ico`        | `/favicon.ico`        |

```md
![Diagram](/images/diagram.png)

[Download the manual](/files/manual.pdf)
```

Do not include `/public` in URLs. Root-relative asset URLs also work from nested
and versioned documentation. These URLs serve files directly; they do not imply
image optimization, automatic favicon metadata for arbitrary filenames, or
version-specific asset snapshots.

`rdx prepare`, `rdx dev`, `rdx build` and `rdx start` connect `.rdx/public` to
the original directory with a directory link (a junction on Windows). There is
no copied cache of assets to become stale. Additions, edits and removals are
available during development without rerunning preparation. In production,
restart/redeploy after adding or removing files, and deploy the project-root
`public/` alongside the application. Standalone/static-export deployment is not
introduced by this feature.

Both `public/` and `.rdx/` must be real directories. The filesystem must support
directory links. RDX refuses a conflicting regular `.rdx/public` directory/file
without deleting its contents, and provides instructions to move assets to the
project-root directory. It may repair an internal link after moving a project;
the link's previous target is never deleted. Work in `public/`, not via the
generated link, because edits through a link also affect the original files.

Everything in `public/` is public: never store credentials or private documents
there. Avoid URL names reserved by Next/RDX routes, such as `/docs` and `/_next`.
Documentation snapshots share public assets; keep distinct filenames such as
`/images/1.0.0/diagram.png` if a historical version must retain an older image.
The versioning plugin continues snapshotting documentation only.

## Activating versioning

From the documentation project root, run:

```sh
pnpm rdx add versioning
# npm alternative: npm exec -- rdx add versioning
# Yarn alternative: yarn rdx add versioning
```

This explicit command installs the official `@lexibase/rdx-versioning`,
adds its import and `plugins: [versioning()]`, validates the resulting config,
then runs preparation to initialize `versions.json` and `.rdx/`. Restart a running
development server afterward. Installing a package with npm/pnpm/yarn alone still
does not activate it or modify configuration.

First installation follows the installed runtime's release channel: stable
versions request `@latest`, beta versions request `@beta`, and release candidates
request `@rc`. Other prerelease channels require manual installation. Missing
registry tags fail without silently selecting another channel. This policy does
not change any package's version or npm tag by itself.

The manager is selected from `packageManager` in `package.json`, the local
lockfile, then the invoking manager (npm is the fallback). Conflicting lockfiles
require an explicit choice: `rdx add versioning --package-manager pnpm`.
No release-age or security policy is disabled automatically.

Repeated calls preserve the installed version, plugin options and other plugins.
A declared but missing package is installed again. An installed but disabled
plugin is activated without reinstalling it. No upgrades are performed when
the declared package is already available.
When restoring a declared package, RDX runs the manager's `install` command
without a new package specification, retaining its range and dependency section.
The manager can still update lockfiles according to its normal rules; this is
not a frozen installation. The documentation's snapshot labels do not choose the
package release channel. The candidate public contract is listed in
[PUBLIC_API.md](./PUBLIC_API.md).

Automatic editing supports a literal default-exported object, optionally inside
the imported `defineConfig(...)`, including `as`/`satisfies` wrappers. Imports,
aliases, existing array entries, comments and unrelated options are retained.
Dynamic config exports, spreads or computed options are refused before installing:
follow the manual instructions instead. Only `versioning` is currently supported;
arbitrary package names and additional install flags are not accepted.

The command validates the new config before replacing the original file and
does not create backups. Its temporary validation file is removed afterward.
If installation or config validation fails,
the original config is left unchanged; package-manager changes to dependencies
and lockfiles are retained for inspection, not rolled back. If preparation fails
after activation, the valid edited config remains: fix the reported
problem and run `rdx prepare` again. Custom plugin factories are trusted code and
are evaluated during validation, but setup hooks run only during preparation.

Manual installation/configuration remains supported:

```ts
import { defineConfig } from '@lexibase/rdx-next'
import { versioning } from '@lexibase/rdx-versioning'

export default defineConfig({
  title: 'My documentation',
  plugins: [versioning()],
})
```

Run `pnpm rdx prepare` (or `pnpm dev`) to initialize `versions.json` if it
does not exist. Its format stays compatible with the original manifest:

```json
{
  "active": [],
  "archived": []
}
```

Create a snapshot with:

```sh
pnpm rdx version 1.0.0
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

## MDX content and runtime requirements

The current runtime and generated projects require Node.js 20.9 or newer.
The development workspace, generated template, React/React DOM and React types
are kept aligned on Next.js 16.4.2 or a compatible newer 16.x release.
Development and production builds use Turbopack. The internal `.rdx/` application
uses the project directory as its bundler root, including project-owned
`rdx.config.ts` and optional `home.tsx` files. The existing shared UI remains
the default theme; no layout replacement is involved in this migration.

The development workspace runs ESLint separately (`pnpm lint`); Next.js 16 no
longer provides `next lint` or runs lint during `next build`. `pnpm check` still
validates lint, types, builds and tests. `apps/web` also generates route types
before standalone type checking.

The MDX renderer uses `next-mdx-remote` 6 with `blockJS` and `blockDangerousJS`
enabled explicitly. Markdown, fenced code and registered JSX components remain
available, including literal props such as `<Notice title="Note" />`.
JavaScript expressions such as `{variable}`, `{calculate()}` and JSX expression
attributes are removed rather than evaluated. Code examples inside fenced blocks
are unchanged. This is an intentional compatibility change from version 5.

Documentation is still trusted project-owned content. These options are not a
sandbox for arbitrary uploads or untrusted remote MDX, and component registration
does not make untrusted content safe. There is no config switch to turn these
protections off in this release.

## Legacy development website

`apps/web` still uses its original routes and private `@rdx/rdx-versioning`
helper. Version-specific legacy loaders now live in private `@rdx/core`
compatibility code. They are not shipped in `@lexibase/rdx-core`. The new plugin
uses the existing active/archived manifest format but has an independent snapshot
layout, so migrating old content requires copying the appropriate version trees.
This keeps the old showcase usable without making new projects depend on it.
