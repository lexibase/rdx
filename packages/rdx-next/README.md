# `@lexibase/rdx-next`

The official Next.js runtime for RDX documentation projects.

It exposes the `rdx` command used by generated projects to create their
internal `.rdx` application and run Next.js.

Run `pnpm exec rdx add versioning` (or `npm exec -- rdx add versioning`) from a
documentation project to install and activate the official optional plugin.
The command detects the package manager, preserves config and plugin options,
creates a config backup when changing it, validates the result and prepares
the runtime. Repeating it does not duplicate or upgrade an installed plugin.
Use `--package-manager npm|pnpm|yarn` to resolve ambiguous lockfiles. Dynamic
configurations receive manual instructions and are not automatically edited.
Installing a package with npm/pnpm/yarn alone never edits `rdx.config.ts`.

Generated sites use the same theme and components as the development website,
through `@lexibase/rdx-ui`: logo, navbar, Radix version dropdown, mobile/desktop
sidebar, landing page, MDX styles and theme provider. The adapter owns content
and route data; it does not implement a parallel UI theme.

Use `homepage: { enabled: true }` in `rdx.config.ts` for the centered-logo
homepage, or import a project-owned React component with `homepage.component`.
Without the option, `/` redirects to `/docs`. Additional content sources from
explicitly configured plugins enable the shared navbar dropdown.

`.rdx/` is generated. Configure the site or edit a project-owned `home.tsx`
instead of modifying files inside `.rdx/`.

Place images, favicon and downloads in the project-root `public/` directory.
The CLI links `.rdx/public` to it using a junction on Windows or a directory
symlink elsewhere. `/images/logo.svg` serves `public/images/logo.svg` in dev and
production. No asset copies are cached and original files are never removed.
Restart/redeploy production after adding/removing assets. Documentation versions
share this directory; snapshots do not copy its contents.
