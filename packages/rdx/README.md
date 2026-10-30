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

## Upgrading from 3.x

Remove `metadata.robots` from `rdx.config.ts`. RDX 4 owns indexing directives and
generates sitemap.xml and robots.txt using `metadata.metadataBase`, the public
site URL. Markdown and custom React imports remain compatible. The framework
selects runtime 4.1 and UI 3.3.0; existing Next.js, React and Node.js requirements
remain unchanged. If versioning is installed, update the optional plugin to
1.3.0 or newer. Run `pnpm rdx check`, build and preview before deploying.

## Optional content languages

RDX 4.1 supports `pnpm rdx add i18n` to install and configure multilingual
documentation. The command uses the primary `lang`, asks for additional languages
and prepares `locale/<folder>/docs/`. Versioning remains a separate plugin;
version 1.3.0 captures all configured language trees in one snapshot operation.

## Upgrading from 2.x

Markdown fences and images work with the updated built-in components. If your
React components import `CodeBlock` directly, use the official composition with
`CodeBlockContent`, `CodeBlockHeader` and the other named exports from
`@lexibase/rdx/ui/components/code-block`. The root now renders a div, rather than
the former pre wrapper. For pre-shaped content, use `MdxCodeBlock` from
`@lexibase/rdx/ui/components/mdx-code-block`.

Custom `DialogContent` compositions use the official centered defaults; set
position, width and padding through `className` when needed. The built-in search
keeps its configured layout. The framework selects compatible runtime and UI packages.

Requires Node.js 22.18+ (22.x) or 24.11+ (24.x). Advanced applications can continue
using the lower-level runtime and UI packages directly.
