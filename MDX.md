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
Descriptive Markdown images open the shared shadcn Dialog on click, Enter or
Space. Escape, the localized close button and outside clicks dismiss the preview
and restore focus. Linked images navigate normally; empty-alt images remain
decorative. The preview fits the viewport on desktop and mobile.
Fenced code displays its language (or "Code" when omitted) and an icon-only copy
button with an accessible name, a tooltip and a checkmark on success.
Add `title="rdx.config.ts"` after the fence language to display a filename or
label in the header. Titles work with highlighted code, plain text, diff and
folder fences. Quoted values support spaces. The title is literal text and is
excluded from clipboard output; the language still controls highlighting.
Fence metadata also accepts the bare `lineNumbers` flag and `startLine=20`.
Only the presence of `lineNumbers` enables numbering. `startLine` must be a
positive safe integer and sets the initial value without enabling numbers.
Highlighted lines
use the official CodeBlockLine composition; plain strings use CodeBlockContent's
built-in splitting. Blank lines keep their numbers, and clipboard output stays
unchanged. Wrapped continuations retain the original line number.
Copying preserves the code's indentation, line breaks and trailing newline,
without copying the header. Success is announced only after the clipboard write
finishes (the operating system may normalize LF/CRLF line endings),
then resets after two seconds. If clipboard access is unavailable or
denied, a visible message offers manual copying; the code remains selectable.
Clipboard access requires HTTPS or localhost and the browser's permission.
Fenced code is highlighted automatically with Shiki, using the language after
the opening fence (for example `ts`, `tsx`, `js`, `json`, `bash`, `py`, `css` or
`sql`). This follows shadcn's Shiki/GitHub light and dark palette, adapted to the
server-side MDX pipeline. Colors follow the existing theme toggle without
changing the code-block surface or spacing. No extra configuration is required.
Grammars load on demand on the server; the highlighter is not a client component.
Unknown languages fall back to plain text; unlabelled fences stay plain. Inline
code is not highlighted. Token markup preserves code whitespace and the trailing
newline for both block copying and copying a complete tab.

On small screens (below 768px), each Markdown block shows the shadcn wrap-lines
action. Wrapping is disabled initially, toggles independently per block, and does
not change copied text.

### Diff and folder fences

CodeBlock is the complete shadcn/ui base-nova component. Its Header, Title,
Actions, CopyButton, Content, Line and Footer exports remain available, including
variants, sizes, wrapping, lineNumbers and startLine. The official
useHighlightedCode hook and server highlightCode function are also available.
Markdown uses a separate MdxCodeBlock adapter and the official small size.

Use `diff` to show a patch. Added and removed lines retain their `+` and `-`
markers and receive a background tint. Unified diff file headers are not treated
as content changes; `@@` hunk headers use the highlighted line variant. The Markdown copy button retains the
complete patch, including its markers, indentation, and final newline.

````md
```diff
-const enabled = false
+const enabled = true
 console.log(enabled)
```
````

Use `folder` to generate tree branches from indentation. Two spaces or one tab
define a level. Parent folder names end with `/`; levels cannot be skipped.
Blank lines in indented lists are ignored. Names are rendered as text, and no
filesystem access is performed. Names ending in `/` receive a folder icon; other
entries use extension-based code, JSON, image, text or generic file icons. The
extensionless fallback is also a generic file.

Explicit tree prefixes accept `|- name`, `|_ name` and vertical `|` guides,
converting only those prefixes to `├──`, `└──` and `│`. Existing Unicode trees
can be pasted directly. Names containing pipes remain literal. The shared
MdxFolderTree adapter composes CodeBlockLine and Lucide icons, preserving optional
title, numbering and wrap/copy actions. Copying produces the Unicode diagram
without SVG markup. A `text` fence preserves an ASCII diagram unchanged.

````md
```folder
my-docs/
  docs/
    guides/
      intro.mdx
  public/
  rdx.config.ts
```
````

## Links between documents

Write relative `.mdx` file paths; RDX resolves them against the current file:

```md
[Next page](./getting-started.mdx)
[API reference](../api/reference.mdx#authentication)
[Guide](./guide.mdx?lang=pt#setup)
```

Generated sites preserve full document slugs and the current content source's
route prefix, including archived snapshots. There is no fallback to Current
when a target is absent from a snapshot. The development website uses the same
resolver with its existing filename-only routes. Live documents always come from
the project's `docs/` folder.

Inline links, reference-style Markdown links and literal `<a href="...">` links
are supported, including Markdown inside Callouts, Tabs and Accordion panels.
Queries and fragments are preserved. Filenames with spaces or accents can use
URL encoding. Use `/` separators and exact file capitalization for portability.
Only explicit relative `.mdx` destinations are resolved; external URLs,
root-relative URLs, image sources, downloads, same-page anchors, and code samples
are left unchanged. Paths without `.mdx` retain normal browser URL behavior.

Missing document destinations, ambiguous document URLs, malformed encoded MDX
paths and paths escaping the current source fail compilation with the referring
file and URL. Missing assets, arbitrary site URLs and fragment existence are not
validated by this document-link check. This is not a site-wide link crawler.

Markdown headings receive IDs through `rehype-slug` (GitHub-style slugs), including
duplicate suffixes such as `setup-1`. Explicit existing IDs are preserved. This
does not add automatic heading anchor buttons. The floating table of contents
is separately opt-in through `TOC: true`.

## Tables and keyboard shortcuts

Markdown tables use the default shadcn/ui base-nova Table styling: horizontal row
separators and compact cells. RDX supports Markdown alignment and a focusable
horizontal scroll container. The shared Table
primitives are also available from `@lexibase/rdx/ui/components/table` for custom
React components and through their named tags in MDX.

Use shadcn/ui `Kbd` and `KbdGroup` directly in MDX to document keyboard input:

```mdx
<KbdGroup aria-label="Control plus K">
  <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>
</KbdGroup>
```

These components render native `<kbd>` elements and can be used inside paragraphs
and table cells. Import them from `@lexibase/rdx/ui/components/kbd` in custom React
components. Standard lowercase `<kbd>` JSX keeps its native HTML rendering.

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
The icon-only button at the right of the tab header copies the active panel as
plain text, without tab labels, code headers or copy-button text. Code indentation
and internal line breaks are retained; outer blank lines are omitted. It uses the
same clipboard permissions as code blocks and announces success or failure.

React components can import `Tabs`, `TabsList`, `TabsTrigger` and `TabsContent`
from `@lexibase/rdx-ui/components/tabs`. The wrappers preserve Base UI props,
refs and state-based `className` callbacks. See `docs/examples/tabs.mdx` for
package-manager examples.

## Accordion

Use an Accordion for optional explanations and FAQs. Keep essential instructions
visible in the page. The default layout is a question, a small chevron and a thin
divider, with no card or extra container background.

```mdx
<Accordion>
  <AccordionItem value="preview">
    <AccordionTrigger>How do I preview my documentation?</AccordionTrigger>
    <AccordionContent>

Run `pnpm dev` and open the local site.

    </AccordionContent>

  </AccordionItem>
</Accordion>
```

The implementation follows shadcn/ui's Base UI `base-nova` Accordion, with
animated opening and closing using Base UI's measured panel height. Motion is
disabled when the reader prefers reduced motion. One item opens at a time and
can be closed again. Add the boolean `multiple`
attribute to `Accordion` to allow several open answers. Use unique string values
inside each group. Keep blank lines around Markdown; panels support code blocks,
links, lists and Callouts. Each trigger is a native button inside an `h3` heading.
Tab follows normal document focus order; Enter and Space toggle the focused item.
There is no custom arrow-key navigation. Disabled items cannot be activated.

React authors can import `Accordion`, `AccordionItem`, `AccordionTrigger` and
`AccordionContent` from `@lexibase/rdx-ui/components/accordion`. The wrappers
preserve Base UI props, refs and state-based class callbacks. React files can use
`defaultValue={['preview']}` or controlled `value`/`onValueChange`; JavaScript
expressions remain blocked in documentation MDX. Closed panels unmount by default;
`keepMounted` preserves them, and `hiddenUntilFound` enables browser find-in-page
discovery of collapsed content. No additional plugin is needed for this built-in
component.

## Authoring boundaries

Documentation MDX retains `blockJS` and `blockDangerousJS`. Components are
registered by the framework; the author uses literal string attributes and
Markdown content. JavaScript expressions, imports and arbitrary event handlers
are not an authoring API. This is not a general HTML sanitizer: only compile
documentation from trusted project sources, and review externally supplied MDX.

Examples live in `apps/web/docs/cat-03/mdx-components.mdx` and the
generated project's `docs/examples/callouts.mdx`.

## Floating table of contents

Set `TOC: true` in `rdx.config.ts` to enable the floating “On this page” control.
Generated projects default to `TOC: false`. On large screens (1280px and up),
two or more visible MDX headings (`##` through `######`) produce small marks
at the right edge. Hover, click, or use the keyboard to open their indented
links. Following a link keeps the hovered panel open so readers can jump between
sections; moving the pointer away dismisses it. Escape also closes the panel.
Section navigation scrolls smoothly unless the reader prefers reduced motion.
The active section follows the documentation's own scroll container.
Pages with fewer than two headings and smaller screens hide the control.
Heading links use the same generated IDs as document fragment links; hidden
tab/accordion content is excluded until it becomes visible.
