# `@lexibase/rdx-next`

The official Next.js runtime for RDX documentation projects.

Generated projects use the main `@lexibase/rdx` package. This adapter remains
available for advanced integrations. It declares the shared UI as a compatible
peer dependency rather than owning a fixed UI copy. The main package supplies
the selected UI; direct adapter consumers must install a compatible UI themselves.

Requires Node.js 22.18+ (22.x) or 24.11+ (24.x). Use the latest patch of either line.
The MDX renderer keeps JavaScript expression blocking enabled. Markdown, fenced
code and registered JSX components with literal props remain supported, but
expressions such as `{value}` or `style={{ ... }}` are not evaluated. Documentation
must still be trusted project-owned content, not untrusted uploads.

It exposes the `rdx` command used by generated projects to create their
internal `.rdx` application and run Next.js.

Run `pnpm rdx add versioning` (or `npm exec -- rdx add versioning`) from a
documentation project to install and activate the official optional plugin.
The command detects the package manager, preserves config and plugin options,
validates the result before saving it without creating backups, and prepares
the runtime. Repeating it does not duplicate or upgrade an installed plugin.
Use `--package-manager npm|pnpm|yarn` to resolve ambiguous lockfiles. Dynamic
configurations receive manual instructions and are not automatically edited.
Installing a package with npm/pnpm/yarn alone never edits `rdx.config.ts`.

First plugin installation follows the installed runtime: stable releases use
`latest`, betas use `beta`, and release candidates use `rc`. Unknown prerelease
channels require manual installation; missing tags do not fall back to another
channel. A missing but declared plugin is restored with the manager's `install`
command, without replacing its dependency range or section. Package-manager
lockfile rules and security policies still apply normally.

Generated sites use the same theme and components as the development website,
through `@lexibase/rdx-ui`: logo, navbar, Base UI version dropdown, mobile/desktop
sidebar, landing page, MDX styles and theme provider. The adapter owns content
and route data; it does not implement a parallel UI theme.

Use `homepage: { enabled: true }` in `rdx.config.ts` for the centered-logo
homepage, or import a project-owned React component with `homepage.component`.
Without the option, `/` redirects to `/docs`. Additional content sources from
explicitly configured plugins enable the shared navbar dropdown.

`.rdx/` is generated. Configure the site or edit a project-owned `home.tsx`
instead of modifying files inside `.rdx/`.

The generated project loader supports both the documentation project root and
the internal `.rdx/` application as the server working directory. This matters
for serverless Next workers, which can start inside `.rdx/`. Content and version
manifests stay in the project root; do not copy them into the generated folder
or initialize versioning again to work around a runtime path error.

Place images, favicon and downloads in the project-root `public/` directory.
The CLI links `.rdx/public` to it using a junction on Windows or a directory
symlink elsewhere. `/images/logo.svg` serves `public/images/logo.svg` in dev and
production. No asset copies are cached and original files are never removed.
Restart/redeploy production after adding/removing assets. Documentation versions
share this directory; snapshots do not copy its contents.

Production builds trace only configured documentation (`.mdx` and
`_category.json`) and runtime files declared by configured plugins. The versioning
plugin declares its manifest, including a custom `versionsFile`; current, active
and archived content sources are included. Live documentation always uses `docs/`;
custom plugin snapshot paths remain supported without copying the whole project
into the server deployment.
Rebuild/redeploy after changing production content or version manifests.

Native Next.js applications using the RDX core (such as `apps/web`) must spread
`await getRdxTracingConfig({ rootDir })` from `@lexibase/rdx-next/config` into
their Next configuration. If Next runs in a subdirectory, also pass `appDir` and
set `outputFileTracingRoot` to include the documentation project root. Generated
`.rdx/next.config.mjs` already does this. Do not remove the explicit tracing
configuration: the core intentionally does not ask Turbopack to trace arbitrary
project-relative filesystem paths.

## Site metadata

Configure SEO in `rdx.config.ts`; the generated layout uses Next.js's native
Metadata API. `metadata.applicationName` is the single site name, while
`description` sets the default site description at the top level.

```ts
export default defineConfig({
  description: 'Learn how to use our project.',
  metadata: {
    applicationName: 'My documentation',
    metadataBase: 'https://docs.example.com',
    authors: [{ name: 'My team', url: 'https://example.com' }],
    keywords: ['documentation', 'my-project'],
    icons: { icon: '/favicon.ico' },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'My project' }],
    },
    twitter: { card: 'summary_large_image', images: ['/og.png'] },
  },
})
```

The starter provides `metadata.applicationName: 'My documentation'`. This name
is required and supplies browser titles (including the `%s | Name` page title
template), social preview defaults, accessible logo labels, the footer and the
built-in homepage fallback. `navbar.title` is independent and optional. Custom
homepage components own their contents; RDX does not inject this name into them.
When upgrading, move the former root `title` into `metadata.applicationName`;
there is no separate `metadata.title` to repeat. Set
`metadataBase` to your real public URL when deploying; RDX does not invent a
production domain or force localhost. Image, favicon and manifest paths refer
to files you create in `public/`. Nothing creates those assets automatically.

Supported fields are `metadataBase` (an absolute http(s) string),
`applicationName`, `authors`, `keywords`, `icons`, `manifest`, `robots`,
`openGraph` and `twitter`. TypeScript describes the supported nested options,
and invalid fields fail during configuration validation. This is a portable
subset, not an unrestricted pass-through of all Next.js metadata options.
Open Graph and Twitter inherit `metadata.applicationName` and the site description
unless explicitly overridden within their own options.
No site-wide canonical or fixed Open Graph URL is emitted for every document.
