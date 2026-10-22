# Markdown and documentation components

RDX uses the shared `@lexibase/rdx-ui/components/mdx-components` map in both
generated sites and `apps/web`. Existing theme colors and heading sizes remain
the default. No Markdown-specific plugin needs to be configured by the author.

## Markdown support

- Headings `#` through `######`, paragraphs, ordered/unordered lists and quotations.
- Links, images from `public/`, horizontal rules, inline code and fenced code.
- GFM tables, task lists and strikethrough through
  [remark-gfm](https://github.com/remarkjs/remark-gfm).

Tables and code blocks scroll horizontally within the document, not the entire
page. Their containers can receive keyboard focus for horizontal scrolling.
Table cells have a minimum width so wider comparisons remain readable on mobile
instead of compressing every sentence into a narrow column.
Images retain their aspect ratio and cannot exceed the content width. Existing
classes are merged with custom `className` values rather than discarded.
Fenced code displays its language (or "Code" when omitted) and a copy button.
Copying preserves the code's indentation, line breaks and trailing newline,
without copying the header. Success is announced only after the clipboard write
finishes (the operating system may normalize LF/CRLF line endings),
then resets after two seconds. If clipboard access is unavailable or
denied, a visible message offers manual copying; the code remains selectable.
Clipboard access requires HTTPS or localhost and the browser's permission.
Syntax highlighting and relative document-link rewriting remain future tasks.

## Callout

Use directly in any `.mdx` page, without an import:

```mdx
<Callout variant="warning" title="Before updating">

Read **release notes** and test your changes before deploying.

- Keep your source files.
- Check your documentation locally.

</Callout>
```

Keep blank lines around Markdown inside the JSX component. Available variants:
`note` (default), `tip`, `success`, `warning` and `danger`. The `title` is optional;
the component also accepts standard `<aside>` attributes and `className`.
Unknown variants fail with an explicit RDX error rather than silently choosing a
different tone. Icons are decorative; the note has a text-based accessible name.
Callouts are static content, not live alerts, and need no Base UI interactive
primitive or client-side state.

In a project-owned React component such as `home.tsx`, import it normally:

```tsx
import { Callout } from '@lexibase/rdx-ui/components/callout'

export default function Home() {
  return (
    <Callout title="Welcome">Read our documentation to get started.</Callout>
  )
}
```

## Tabs

Tabs use Base UI and are available in every MDX page without an import:

```mdx
<Tabs defaultValue="pnpm">
  <TabsList aria-label="Package manager">
    <TabsTrigger value="npm">npm</TabsTrigger>
    <TabsTrigger value="pnpm">pnpm</TabsTrigger>
  </TabsList>
  <TabsContent value="npm">

Run `npm install`.

  </TabsContent>
  <TabsContent value="pnpm">

Run `pnpm install`.

  </TabsContent>
</Tabs>
```

Give each list an accessible `aria-label`, and use matching, unique string
values for its triggers and panels. Set `defaultValue` explicitly to an enabled
tab so the selected panel is also present in server-rendered HTML. Keep blank
lines around Markdown content. Panels accept fenced code, lists and Callouts.
Each group maintains its own selection; choices are not synchronized or stored.

Arrow keys move focus; Enter or Space selects the focused tab. Home and End move
to the first and last tabs. Disabled triggers remain focusable so readers can
discover them, following Base UI's behavior, but cannot be activated. Tab moves out
of the tab list into the selected panel. Inactive panels unmount by default;
React authors can use `keepMounted` on `TabsContent` to preserve local state.
Long tab lists scroll horizontally on small screens.

React components can import `Tabs`, `TabsList`, `TabsTrigger` and `TabsContent`
from `@lexibase/rdx-ui/components/tabs`. The wrappers preserve Base UI props,
refs and state-based `className` callbacks. See `docs/examples/tabs.mdx` for
package-manager examples.

## Authoring boundaries

Documentation MDX retains `blockJS` and `blockDangerousJS`. Components are
registered by the framework; the author uses literal string attributes and
Markdown content. JavaScript expressions, imports and arbitrary event handlers
are not an authoring API. This is not a general HTML sanitizer: only compile
documentation from trusted project sources, and review externally supplied MDX.

The custom RDX shorthand syntax and Accordion remain separate future work.
Examples live in `apps/web/app/docs/(canary)/cat-03/mdx-components.mdx` and the
generated project's `docs/examples/callouts.mdx`.
