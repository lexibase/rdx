# RDX UI

The shared theme used by the RDX development website and generated documentation
sites. The source of truth is `packages/rdx-ui/src`: Base UI dropdowns, buttons,
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

## Documentation components

`Callout` is registered automatically in MDX, with optional `title` and variants
`note` (default), `tip`, `success`, `warning`, `danger`:

```mdx
<Callout variant="warning" title="Before updating">

Read **release notes** before deploying.

</Callout>
```

In React, import it from `@lexibase/rdx-ui/components/callout`. It renders a static
note, not an automatic live alert. The Markdown map also styles all six heading
levels, responsive images, GFM tables and keyboard-scrollable code blocks.

## Base UI composition

The shared components use `@base-ui/react`. Existing RDX colors, variants,
dimensions and layout are preserved; `components.json` selects `base-nova` for
future shadcn additions, without regenerating the existing theme.

This beta changes the composition API: `asChild` is no longer supported.
Use `render` for interactive composition and `ButtonLink` for navigation:

```tsx
import { Button } from '@lexibase/rdx-ui/components/button'
import { ButtonLink } from '@lexibase/rdx-ui/components/button-link'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem,
  DropdownMenuLinkItem,
} from '@lexibase/rdx-ui/components/dropdown-menu'
import Link from 'next/link'

<ButtonLink href="/docs" variant="outline">Documentation</ButtonLink>

<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="outline" />}>
    Actions
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start">
    <DropdownMenuGroup>
      <DropdownMenuLabel>Project</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => console.log('Action')}>Run action</DropdownMenuItem>
      <DropdownMenuLinkItem closeOnClick render={<Link href="/docs" />}>
        Documentation
      </DropdownMenuLinkItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

`ButtonLink` renders a Next.js link with button styling, not `role="button"`.
`Button` renders a native button; use `type="submit"` explicitly for form submission.
Menu actions use `onClick` instead of Radix's `onSelect`. Labels must be inside
`DropdownMenuGroup`. Checkbox values are boolean, not the Radix `indeterminate`
string; checkbox/radio items remain open unless `closeOnClick` is enabled.
Navigation items use `DropdownMenuLinkItem` (with `closeOnClick` when desired).
Components accept Base UI state-aware `className` callbacks and `render` props.
For custom CSS, replace Radix state selectors/variables with Base UI's
`data-open`, `data-closed`, `data-highlighted`, `data-popup-open`,
`--available-height` and `--transform-origin`. `Separator` remains decorative by
default; set `decorative={false}` for an accessible separator role.

See [Base UI Menu](https://base-ui.com/react/components/menu) and
[shadcn Base UI](https://ui.shadcn.com/docs/components/base/button).
