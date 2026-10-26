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
Fenced code blocks include a language label and copy button automatically;
inline code remains unchanged. Copy failures leave the code selectable and show
manual-copy guidance instead of a false success message.

## Base UI composition

The shared components use `@base-ui/react` and the RDX theme.
`components.json` selects shadcn/ui's `base-nova` style.
Use `render` for interactive composition and `Button` with `href` for navigation:

```tsx
import { Button } from '@lexibase/rdx-ui/components/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem,
  DropdownMenuLinkItem,
} from '@lexibase/rdx-ui/components/dropdown-menu'
import Link from 'next/link'

<Button href="/docs" variant="link">Documentation</Button>

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

`Button` with `href` renders a native Next.js link; use `variant="link"` for text links.
Without `href`, `Button` renders a native button; use `type="submit"` explicitly for form submission.
Menu actions use `onClick`. Labels must be inside `DropdownMenuGroup`.
Checkbox values are boolean; checkbox/radio items remain open unless
`closeOnClick` is enabled.
Navigation items use `DropdownMenuLinkItem` (with `closeOnClick` when desired).
Components accept Base UI state-aware `className` callbacks and `render` props.
For custom CSS, use Base UI's
`data-open`, `data-closed`, `data-highlighted`, `data-popup-open`,
`--available-height` and `--transform-origin`. `Separator` remains decorative by
default; set `decorative={false}` for an accessible separator role.

See [Base UI Menu](https://base-ui.com/react/components/menu) and
[shadcn Base UI](https://ui.shadcn.com/docs/components/base/button).

## Documentation tabs

`Tabs`, `TabsList`, `TabsTrigger` and `TabsContent` wrap Base UI Tabs and are
automatically registered in MDX. Import them from
`@lexibase/rdx-ui/components/tabs` in React files. Use an explicit `defaultValue`,
matching string values and an `aria-label` on each list. Arrow keys move focus;
Enter or Space activates a tab. The list scrolls on small screens. See
the repository's `MDX.md` and `docs/examples/tabs.mdx` for complete examples.

## Documentation accordion

`Accordion`, `AccordionItem`, `AccordionTrigger` and `AccordionContent` wrap
Base UI Accordion and are registered in MDX. Import them from
`@lexibase/rdx-ui/components/accordion` in React files. One item opens at a time
by default; `multiple` allows independent expansion. Triggers use native buttons
inside `h3` headings with normal Tab navigation and Enter/Space activation.
See `MDX.md` and `docs/examples/accordion.mdx` for examples and React options.
