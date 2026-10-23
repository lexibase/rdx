# Local documentation search

Enable the built-in search in `rdx.config.ts`:

```ts
import { defineConfig } from '@lexibase/rdx-next'

export default defineConfig({
  title: 'My documentation',
  search: true,
})
```

New projects include `search: false`. Disabled search has no navbar button,
keyboard shortcut handler or generated index. No external search account,
service or plugin is required. `apps/web` enables it as the development showcase.

## Reader experience

- The navbar button opens a compact search dialog; mobile shows a magnifying glass.
- `Ctrl+K` / `⌘K` opens or closes it. Arrow keys select a result, Enter opens it,
  and Escape dismisses the dialog and restores focus.
- Search covers page titles, descriptions, headings and readable Markdown/MDX
  content, including code and documentation components. It ignores case and
  accents, requires all query words, and ranks titles above body matches.
- Results show their category, page/section title and an excerpt, capped at
  twelve results. This first implementation does not promise typo correction,
  stemming or semantic search.
- On documentation pages, results belong only to the current source/version,
  including archived snapshots. The homepage searches live/current documentation.
- Sections link directly to their generated heading IDs. Text inside interactive
  Tabs/Accordion panels is indexed under the enclosing page/section, avoiding
  anchors that may not exist until a panel is opened.

## Index and loading

The framework serves a JSON index at `/rdx-search/[source]`, using `_` for live
documentation in generated projects. This key is internal; authors need not
configure it. Only configured content sources are accepted. Next.js generates
one index per enabled source during production builds; rebuild to publish edits.
Development requests reflect additions, edits and removals of documentation.

The browser receives only the endpoint and version label with the page. The
Command dialog and its search code are loaded on first opening; the version's
index is fetched then, not preloaded with documentation HTML. Production retains
at most three normalized indexes in memory. Development re-fetches on opening.
Queries stay in the browser and are not sent to an external service.

Indexing parses the MDX syntax tree without evaluating JavaScript or compiling
components. It omits imports, expressions, JSX attributes, raw HTML nodes and
script/style content. It includes public documentation text, not filesystem
paths, project configuration or frontmatter objects. The index is public like the documentation;
do not put secrets in documentation or its example code.

The UI adapts the official **shadcn/ui Base Nova Command** (`cmdk`) and **Base UI
Dialog**, with the shared RDX theme, native focus handling and reduced-motion
styles. It does not introduce a different UI foundation. Localization of fixed
interface text is separate future work recorded in `ROADMAP.md`.
