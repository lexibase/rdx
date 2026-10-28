# Markdown and documentation components

RDX uses the shared `@lexibase/rdx-ui/components/mdx-components` map in both
generated sites and `apps/web`. Existing theme colors and heading sizes remain
the default. No Markdown-specific plugin needs to be configured by the author.

## Markdown support

- Mermaid fences render diagrams through the official Mermaid engine, loaded
  in the browser when the block becomes visible. The shared Code Block composes
  source/diagram switching, original-source copying and a larger Dialog view.
  Themes follow the site; optional `title`, `lineNumbers` and `startLine` apply
  to the header/source. Before hydration and on errors the source stays readable.
  Rendering uses strict security, fixed site settings and isolated SVG images;
  definition callbacks do not execute. `accTitle`/`accDescr` describe the image.

- Callouts: begin a quote with `> [!NOTE]`, `> [!TIP]`, `> [!SUCCESS]`,
  `> [!WARNING]` or `> [!DANGER]`. An optional title follows the marker on the
  same line; quoted lines below contain the Markdown body.
- Tabs and Accordion: wrap content in `:::tabs` or `:::accordion`, ending with
  `:::`. Each direct `### Title` starts an item; use `####` for body headings.
  The first tab is selected; accordion items start closed and open one at a time.
  Nested containers use more colons on the outer fence (for example
  `::::accordion` around `:::tabs`).
- Keyboard keys: use `:kbd[Ctrl] + :kbd[K]` in prose or tables. Each directive
  renders the existing semantic Kbd component.
- These forms use `remarkDocumentationComponents` in both renderers and search.
  They adapt Markdown to the existing shared components without evaluating JS.
  Component authoring uses the Markdown forms described below.

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
Long blocks automatically use the official CodeBlockFooter/Button Show More
composition below 768px. A client-side measurement caps previews at about 12
visible lines, taking font metrics, wrapping and resizing into account. Short
blocks have no expansion action and desktop content remains uncapped. The full
code stays server-rendered and is readable before hydration; copying always
retains the complete source. Footer labels use the configured interface locale.

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

Write tables with Markdown columns and separator rows. Alignment follows the
separator row, and wide tables scroll within the document.

Write individual keys and combinations directly in Markdown:

```md
Press :kbd[Ctrl] + :kbd[K] to open search.
```

The keys render with the shared shadcn/ui Kbd component, including in table cells.

## Callout

Start a quote with a supported uppercase marker and an optional title:

```md
> [!WARNING] Before updating
> Read **release notes** and test your changes before deploying.
>
> - Keep your source files.
> - Check your documentation locally.
```

Markers are `NOTE`, `TIP`, `SUCCESS`, `WARNING`, and `DANGER`. The body accepts
Markdown paragraphs, lists, links and code. Titles are optional.

## Tabs

Each direct `###` heading in a `:::tabs` container defines a tab:

```md
:::tabs

### pnpm

pnpm install

### npm {disabled}

npm install

### yarn

yarn install

:::
```

Append the literal `{disabled}` flag to a title to disable that tab. The first
enabled tab is selected initially; at least one tab must be enabled. Disabled
panel content is omitted from rendering and search. Escape the opening brace or
use inline code to display the marker literally in a tab label. Arbitrary
expressions are not accepted as metadata.

Tabs use the shared Base UI component for keyboard interaction. The icon-only
copy button copies the active panel, preserving code indentation and internal
line breaks. Lists scroll horizontally on small screens. Each group maintains
its own selection. Use `####` or deeper headings for panel subsections.

## Accordion

Use `:::accordion` for optional explanations and FAQs, with one item per direct
`###` heading:

```md
:::accordion

### How do I preview my documentation?

Start the development server from the documentation project root.

### Where do I write pages?

Create folders and `.mdx` files inside `docs/`.

:::
```

The shared shadcn/ui Base UI Accordion supplies keyboard controls and animated
panels. One item opens at a time; Enter or Space toggles it. Motion respects the
reader's reduced-motion preference. Keep essential instructions visible.

For nested containers, use an extra colon for each outer level, such as
`::::accordion` around `:::tabs`. Match each closing fence to its opening count.

## Authoring boundaries

Documentation pages use Markdown, directives, and code fences. The framework
maps these forms to shared components and retains `blockJS` and
`blockDangerousJS`. The exact `{disabled}` tab marker is literal metadata.

React files such as `components/home.tsx` and `components/logo.tsx` provide the
custom homepage and logo configured in `rdx.config.ts`. JavaScript expressions,
imports and event handlers are not a documentation authoring API. This pipeline
is not a general HTML sanitizer: compile trusted project sources and review
externally supplied MDX.

Examples live in `apps/web/docs/cat-03/` and the generated project's
`docs/examples/`.

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
