# `@lexibase/rdx-next`

The official Next.js runtime for RDX documentation projects.

It exposes the `rdx` command used by generated projects to create their
internal `.rdx` application and run Next.js.

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
