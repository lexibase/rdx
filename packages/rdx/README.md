# @lexibase/rdx

The main RDX documentation framework package. It supplies the `rdx` command,
configuration types, and compatible Next.js runtime and shared UI packages.

```ts
import { defineConfig } from '@lexibase/rdx'

export default defineConfig({
  metadata: { applicationName: 'My documentation' },
})
```

Import UI components in React files through `@lexibase/rdx/ui/components/*`:

```tsx
import { Home } from '@lexibase/rdx/ui/components/home'

export default function MyHome() {
  return <Home title="My project" />
}
```

Update the framework with `pnpm add @lexibase/rdx@latest`, then restart development
or rebuild and deploy production. This updates the selected compatible internal
packages, not your MDX, public files, custom components, or configuration.
Review release notes for manual migrations and Next.js/React peer requirements.
Optional plugins remain separate; updating the framework does not install them.

Requires Node.js 22.18+ (22.x) or 24.11+ (24.x). Advanced applications can continue
using the lower-level runtime and UI packages directly.
