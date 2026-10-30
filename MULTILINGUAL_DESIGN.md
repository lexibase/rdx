# Optional multilingual documentation

Status: multilingual content and versioned snapshots are prepared for RDX 4.1.0,
with @lexibase/rdx-i18n 1.0.0. Language-prefixed routes, selectors, fallback, isolated search
and metadata share frozen per-edition inventories. Assisted installation uses
`rdx add i18n`; the project creator asks only for the project name. This is an internal design record,
not registry installation instructions.

## Goals

- Keep one-language projects unchanged, with primary content in `docs/`.
- Enable multilingual content only when its plugin is installed and configured.
- Keep authoring file-based: matching relative paths identify translated pages.
- Preserve locale and edition independently in navigation, search and metadata.
- Display an honest fallback instead of silently mixing languages or editions.
- Use the existing shared shadcn/ui Base UI components and RDX Callouts.

## Files and locale identifiers

The primary language is declared once with `lang` in `rdx.config.ts`. Its live
content stays in `docs/`. Other languages use `locale/<folder>/docs/`:

```text
my-docs/
├── docs/
│   └── guides/
│       ├── _category.json
│       └── installation.mdx
├── locale/
│   ├── ptbr/
│   │   └── docs/
│   │       └── guides/
│   │           ├── _category.json
│   │           └── installation.mdx
│   └── es-es/
│       └── docs/
│           └── guides/
│               └── installation.mdx
└── rdx.config.ts
```

Here the primary language is English. `locale/en/docs/` is equally valid when
English is a secondary language. Do not maintain a second copy of the primary
content under `locale/`.

Language codes and folder names are separate: `pt-BR` identifies the language;
`ptbr` can identify its folder. Normalize valid language tags and reject duplicate
codes. Folder names are single safe project-local segments; reject traversal,
absolute paths and ambiguous case-only duplicates on all platforms.

Proposed configuration shape:

```ts
import { defineConfig } from '@lexibase/rdx'
import { i18n } from '@lexibase/rdx-i18n'

export default defineConfig({
  metadata: { applicationName: 'My documentation' },
  lang: 'en',
  plugins: [
    i18n({
      locales: [
        { code: 'en', label: 'English' },
        { code: 'pt-BR', label: 'Português (Brasil)', folder: 'ptbr' },
        { code: 'es-ES', label: 'Español', folder: 'es-es' },
      ],
    }),
  ],
})
```

Require the primary language to appear in this list. A secondary folder defaults
to its lower-case language tag when omitted. The primary entry always uses
`docs/` and does not accept a folder override. Do not introduce a public `docsDir`
option. A declared secondary language must have its docs directory; individual
missing pages are permitted.

Use the same relative MDX path in each language. Translate frontmatter, headings
and body, but keep the path stable. The first iteration requires translated pages
to have a primary counterpart, reporting orphan translations through `rdx check`.

Keep `public/` shared by all languages. Authors can organize language-specific
images below it and reference them explicitly; do not introduce additional
implicit public directories inside `locale/`.

## URLs

When the plugin is enabled, prefix documentation URLs with the normalized,
lower-case language tag. Folder aliases do not change URLs:

| Content       | Primary English                      | Brazilian Portuguese                    |
| ------------- | ------------------------------------ | --------------------------------------- |
| Live page     | `/en/docs/guides/installation`       | `/pt-br/docs/guides/installation`       |
| Released page | `/en/docs/4.0.0/guides/installation` | `/pt-br/docs/4.0.0/guides/installation` |

Keep version prefixes and same-major redirect rules intact after the language
prefix. Canary is a live source, not a published edition; the official website
retains its explicit Canary alias under each language.

Unprefixed documentation URLs redirect to the primary language, preserving their
edition, page and query. Preserve valid fragments where possible without
inventing cross-language heading mappings. `/docs` remains a useful entry link.
Without the plugin, all existing URLs remain exactly as they are.

Do not automatically select a language from IP, browser headers or persistent
preferences in the initial implementation. Explicit URLs remain predictable and
compatible with static generation and serverless hosting. Unknown language codes
produce a 404, not a fallback to an arbitrary language.

The first iteration localizes documentation routes, not custom homepage React
components. The existing homepage remains at `/`; its Docs action enters the
primary language. Homepage translation is separate work.

## Missing translations

Resolve each request by `(edition, requested language, relative page path)`:

1. Serve the translated page when it exists.
2. Otherwise serve the primary-language page from that same edition.
3. If neither exists, render the shared 404. Never substitute the first page or
   content from a different edition.

For a fallback, keep the requested language URL and language selector. Display
the original title and body, preceded by an RDX Callout such as:

> This page is not available in Português (Brasil). You are reading the English
> version. View the original page.

Use the shared Callout presentation, alongside existing live/outdated/archive
notices. Translate the notice through the interface message catalogs, with the
existing English fallback when no catalog exists. Do not claim that choosing a
content language supplies an interface translation for it.

Set the document/interface language to the requested locale and the article's
`lang` to the actual content language. Relative document links in an untranslated
article resolve in its original language and same edition, including section
fragments. This preserves the targets the original author wrote; translated
headings must not be guessed. Sidebar and previous/next links remain in the
requested locale and use the effective page registry.

Do not copy missing translations into user folders or machine-translate content.
Derive fallback during resolution. An incomplete but valid translation is not a
broken link and must not fail the build solely because it is missing.

## Sidebar and language switching

Build a sidebar for the selected edition from its primary page inventory, then
overlay translated titles and category metadata by matching paths. Missing labels
use primary labels. Preserve category/page order from the primary tree in the
first iteration; translated `_category.json` supplies display text, not another
unrelated navigation structure.

Provide separate language and version selectors in the shared navbar. The
language selector preserves edition and page; an untranslated destination opens
the fallback above. Do not present locales as extra versions. Build the selectors
with official shadcn/ui Base UI components, respecting compact/mobile layouts,
keyboard use and localized accessible names.

On an edition switch, retain the selected language. If a page does not exist in
that edition at all, retain the existing edition-navigation behavior of selecting
its first available page. Distinguish this from a missing translation of an
otherwise existing page.

## Versioning and snapshots

Versioning remains a separate optional plugin. Language-only projects do not
need `versions.json` or versioning installed. Combined projects share one edition
manifest: a release label and its active/archive/redirect state apply to all
languages. There is no independent version number for each translation.

Keep primary snapshots in their existing locations. Store translated snapshots
alongside their own live tree:

```text
docs/
versioned_docs/version-4.0.0/guides/installation.mdx
locale/ptbr/docs/guides/installation.mdx
locale/ptbr/versioned_docs/version-4.0.0/guides/installation.mdx
```

Do not put translated MDX under the primary snapshot's content tree: today's
recursive indexing would mistake those files for primary-language pages.

One `rdx version <release>` command snapshots the primary docs and all configured
translations as one operation. Record the release's locale identities and
primary language in an internal, non-MDX snapshot metadata file. Missing
translations at that moment stay missing in that edition; fallback uses that
edition's primary snapshot, never live docs or translations added later.

Add a generic snapshot-contribution lifecycle so versioning can include another
plugin's content without importing that plugin. Reserve new destinations,
validate all contributions first, and write the public version manifest last.
Roll back only new paths created by the failed operation; never rewrite old
snapshots. Archiving, restoring and same-major replacement work on the complete
edition and preserve its locale metadata and redirect history.

Existing snapshots without locale metadata represent primary-language-only
editions when the plugin is first enabled. Do not retroactively copy current
translations into them. Keep the selected primary language stable; changing it
after publication requires an explicit migration, not silent relabeling.

## Search, checking and SEO

- Key search indexes by both locale and edition; fetch only the selected index.
  Index actual translated pages. Do not mix primary-language fallback bodies
  into another language's results. A fallback page can offer an explicit action
  to search the original language; switching is not silent.
- Extend `rdx check` to resolve links in their actual language/edition context,
  validate translation counterparts and report original filesystem locations.
  Check authored documents once, rather than re-reporting a primary error for
  every derived fallback URL. Ordinary missing translations remain allowed.
- Use the existing automatic indexing policy for actual translated pages in
  each edition. Generate alternate-language links only for real translations
  of that page and edition; never advertise a fallback as a translation.
- A fallback URL is `noindex, follow`, has its canonical URL pointing to the
  original-language page, and is excluded from the sitemap. Its social metadata
  uses the content actually displayed. Archived/live indexing rules still apply.
- Preserve fallback article IDs. Do not automatically reuse a hash from a
  translated heading in another language if that destination does not define it.
- Trace the required localized docs, frozen locale metadata and translated
  snapshots into deployments; exclude unrelated source files. Validate both
  project-root and `.rdx/` server working directories on Linux and Windows.

## Required internal changes

This is not implementable correctly by only contributing more current-style
content sources:

- `RdxContentSource` currently has one `routePrefix`, and the resolver matches
  only the first segment below `/docs`.
- The navbar currently treats non-current sources as version options; indexing
  also infers publication from those sources. Adding languages there would
  incorrectly change menus and indexing policy.
- `setup` hooks run in declaration order and only contribute sources and runtime
  files. Versioning currently snapshots only primary `docs/`.
- Runtime HTML/interface language is currently the project-wide `config.lang`.

Introduce explicit locale and edition dimensions in the shared project model,
plus resolved-page information distinguishing requested locale, actual content
locale and fallback status. Centralize route construction and resolution for
runtime, search, metadata, links and checking. The core provides generic support;
it must not import the optional i18n plugin or force localization on other users.

Collect declarations from all plugins before deriving the locale/edition matrix.
Do not depend on whether `i18n()` precedes `versioning()` in the config. Design
additive lifecycle capabilities for snapshot contributions and retain existing
plugin API compatibility where possible. Review any unavoidable breaking changes
explicitly before implementation or selecting release versions.

Generate the required localized Next.js routes only for configured projects,
using supported Next.js route conventions. Avoid middleware-dependent language
detection and duplicated runtime implementations. Keep native `apps/web` routes
and generated templates on the same shared resolver, with only host aliases in
the website adapter.

## Delivery sequence and acceptance

1. Finalize shared locale/edition descriptors and plugin lifecycle contracts,
   including backward compatibility and collisions with host routes.
2. Implement the optional plugin, primary/localized routes and missing-page
   fallback without versioning. Installing the package alone activates nothing.
3. Add the shared selector, interface/article language separation, links,
   search, metadata and `rdx check` integration.
4. Integrate one-command multilingual snapshots, archive/restore, old editions
   and same-major redirects, independent of plugin declaration order.
5. Assisted installation uses the existing `rdx add` catalog. Reuse `lang` as
   the primary language and ask for additional language tags during first
   activation, accepting arbitrary valid tags. `--locales` supports scripts.
   Repeated activation preserves existing options and dependency ranges.
   Later additions are authored in config and matching translation directories.
   The main creator does not ask about languages or activate optional plugins.
6. Validate packed projects outside/inside monorepos and serverless deployment,
   then write public guides and prepare a grouped release when requested.

Runtime 4.1 uses the minimum compatible UI version ^3.3.0, containing the language
selector and localized 404 modules. The release matrix and public plugin manifest
are prepared together; registry publication and tag verification follow the merge.

Required regression cases include: no-plugin projects; each plugin alone; both
plugin orders; translated/missing/orphan pages; translated heading anchors;
primary-page deletion; undeclared languages; locale-code/folder collisions;
archived and missing translations in old editions; immutable snapshots; failed
snapshot cleanup; same-major redirects; isolated indexes and lazy fetching;
fallback canonical/noindex and real-language alternates; mobile/keyboard
selectors; public assets; custom homepage/logo imports; and production tracing.

Do not alter published snapshots, user projects or the current release as part
of this work. Snapshot contributions now support both plugins together;
assisted installation is available locally under the contracts above. The
plugin is prepared for the grouped release. Packed installations
are validated with `pnpm test:release --i18n` in standalone and pnpm monorepo
projects, including activation, contributions, snapshots and production tracing.
