# RDX UI

The shared theme used by the RDX development website and generated documentation
sites. The source of truth is `packages/rdx-ui/src`: Radix dropdowns, buttons,
logo, theme provider, navbar, sidebar, landing page and MDX components.

Published as `@lexibase/rdx-ui`. React/Next.js source is intentionally shipped
without bundling so Next.js preserves server/client component boundaries. Add
the package to `transpilePackages` when using it outside the RDX runtime.
The RDX runtime already configures this, PostCSS and Tailwind source scanning.

```tsx
import { Home } from '@lexibase/rdx-ui/components/home'

export default function MyHome() {
  return <Home title="My project" />
}
```

Configure project-owned components via `homepage.component` and `navbar.logo`.
Do not edit generated `.rdx/` files. Installing the versioning plugin does not
change this theme: it contributes data to the shared version dropdown.
