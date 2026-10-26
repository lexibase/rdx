# Changelog

## Unreleased

- Add the shadcn wrap-lines action to Markdown code block headers, with independent
  per-block state, localized labels, and unchanged clipboard output.

- Add Git-style `diff` fences with added, removed, and hunk line backgrounds,
  preserving the full patch when copying.
- Add `folder` fences that turn indented lists into directory diagrams and copy
  the generated tree, with localized header labels and safe text rendering.
- Install the complete shadcn/ui Base UI Code Block, official highlighter and
  useHighlightedCode hook. Integrate Markdown separately, using CodeBlockLine
  variants for diffs and the official copy button with localized feedback.
- React composition uses the official CodeBlock root API; custom callers of the
  former pre wrapper can use MdxCodeBlock. Markdown fences remain automatic.

## 2.0.0 — Prepared

### Breaking change

- Remove the published ButtonLink module. Replace its imports with Button from
  the button module and pass href for navigation. Preserve variant and size when
  keeping custom styling. The runtime now requires UI ^2.0.0.

### Included

- Snapshot the official documentation at 2.0.0, retaining Canary and the 1.0.1
  release, with a guide for upgrading existing projects.

- Share the development website's custom 404 layout with generated projects,
  including navigation, translated guidance, and a documentation return link.

- Translate built-in interface labels from `lang`, with English and Brazilian
  Portuguese catalogs, predictable fallback, and consistent server/client rendering.
- Localize search, heading navigation, copy feedback, version notices, credits,
  empty states, and accessible labels without changing authored documents.

- Use each documentation page's title and description in Open Graph and Twitter
  previews, preserving configured social images, locale, and card settings.

- Consolidate navigation in Button with native link semantics and remove ButtonLink.

- Render Markdown tables with the shadcn/ui base-nova Table components while
  using its default visual style, Markdown alignment and keyboard scrolling.
- Add shadcn/ui Kbd and KbdGroup to MDX and public component exports, with
  keyboard shortcut examples in the official documentation and generated projects.

Types/core are prepared at 1.1.1; optional versioning at 1.0.1. These patches
align dependencies and configuration JSDocs. UI, runtime, framework and creator
are prepared at 2.0.0. Publication is manual; no publication date is recorded yet.

## Runtime/framework 1.2.2 and creator 1.2.3 — 2026-10-25

- Exclude internal Next.js build output from Tailwind sources, preventing
  serialized selectors from generating invalid CSS during development after a build.
- Resolve PostCSS plugins from the runtime package so development workers can
  load the UI plugin when a project depends only on the main framework package.
- Include a project-root TypeScript configuration in generated projects so local
  React components and configuration imports use JSX and bundler resolution
  independently of a parent monorepo's compiler settings.
- Document custom SVG logos, favicon configuration and project-owned components
  organized in `components/`, including `components/home.tsx`.

Runtime and main framework 1.2.2 and creator 1.2.3 are published. Creator 1.2.3
selects framework 1.2.2; UI, core, types and versioning stayed at their existing
versions. Verified against the npm registry.

## Layout patch — Published

- Preserve the centered documentation layout when a consumer's `.gitignore`
  excludes nested `dist` directories by registering the compiled runtime entry
  directly with Tailwind.
- Verify runtime spacing and width rules in generated production CSS and cover
  consumer ignore patterns in layout regression tests.
- Prepare runtime and main framework 1.2.1, with creator 1.2.2 selecting the
  corrected framework. UI, core, types and versioning versions remain unchanged.

## Creator 1.2.1 — Published

- Consolidate existing exact RDX release approvals before and after pnpm workspace
  installation, preventing older entries from shadowing approvals added by pnpm.
- Cover legacy workspace policies, first-install approvals, preservation of
  unrelated rules and repeatable creation in creator regression tests.
- Check staged formatting without rewriting unrelated working files during commits.

Only `@lexibase/create-rdx` changed version for this patch. Its generated projects
select framework 1.2.0.

## 1.2.0 — 2026-10-24

- Add shared footer branding with a Powered by RDX repository link.
- Add optional `metadata.since` for footer year ranges without repeating equal years.
- Fill generated configuration with the project creation year as an editable number.
- Resolve the generated application's build root from the real Next.js installation
  so pnpm workspace projects can compile dependencies stored above `apps/web`.
- Use the same root for Turbopack and dependency tracing while retaining explicit
  documentation content includes.

The framework, runtime and creator 1.2.0, along with core, types and UI 1.1.0,
are published. The runtime requires UI ^1.1.0 for the shared footer component.
Versioning remained at 1.0.0.

## 1.1.0 — 2026-10-24

- Add `@lexibase/rdx` as the main framework entry, with configuration, CLI,
  runtime, styles and typed per-module UI exports.
- Generate projects with one direct framework dependency; updates select the
  compatible internal runtime and UI through the main package.
- Keep optional versioning separate and preserve direct runtime/UI integrations.
- Add installed-archive tests for a main-package update that introduces a new UI
  component without changing the runtime implementation.

`@lexibase/rdx`, `@lexibase/rdx-next` and `@lexibase/create-rdx` were published
at 1.1.0. The creator pins the main framework; its dependencies select runtime
1.1.0 and UI 1.0.0. Other packages remained unchanged.

## 1.0.1 — 2026-10-24

### Fixed

- Generated documentation pages now provide their title and description through
  Next.js `generateMetadata`, including version roots and archived snapshots.
- Browser titles use the document name with `metadata.applicationName` as the
  suffix. Missing descriptions use the site description; missing titles use the
  indexed filename fallback. Missing documents retain their 404 response.
- Installed-archive HTTP tests verify document metadata instead of accepting only
  the site name, and distinguish live metadata from snapshot metadata.

### Documentation

- Prepare the 1.0.1 documentation snapshot alongside the live Canary edition.

Only `@lexibase/rdx-next` and `@lexibase/create-rdx` were published at 1.0.1.
The creator pins the corrected runtime; other packages remained at 1.0.0.

## 1.0.0 — 2026-10-24

First stable npm release.

### Included

- Interactive scoped project creator: `npm create @lexibase/rdx`.
- Generated internal Next.js application in `.rdx/`.
- File-based MDX pages and categories, ordering and version-aware relative links.
- Shared minimal theme built on Next.js, Tailwind CSS and shadcn/ui Base UI.
- Highlighted code blocks with icon-only copying, Callouts, Tabs and Accordion.
- Responsive tables, quotations and shared Markdown styling.
- Opt-in local search, floating TOC and configurable homepage components.
- Typed, validated configuration with site metadata and optional navbar actions.
- Optional versioning plugin with explicit activation, snapshots and archives.
- Public assets, production tracing and standalone installed-package tests.
- Linux/Windows CI, local workspace watching and coordinated process shutdown.
- MIT code/examples/starter templates and CC BY 4.0 official documentation prose.

### Changes from the betas

- Require `metadata.applicationName` instead of root `title`.
- Remove configurable live `docsDir`; live documentation always uses `docs/`.
- Use the canonical `RDXConfig` type; retain `RdxRuntimeConfig` as an alias.
- Require Node.js 22.18+ (22.x) or 24.11+ (24.x), including generated projects.
- Use Base UI `render` composition instead of Radix `asChild` in shared UI.
- Block MDX JavaScript expressions and expression attributes. Use registered
  components with literal attributes; React files such as `home.tsx` remain code.
- Remove empty UI hook/context export placeholders, including the misspelled
  `contenxts` path. No modules were available through those placeholders.
- Show the live-edition divider only when content follows, without duplicating
  the boundary before an archived group.

### Upgrade

Update installed runtime/UI packages rather than rerunning the creator over an
existing site. Update the optional plugin if installed, review configuration
changes, then build and test before deploying. Preserve your source files and
snapshots; `.rdx/` is generated and is not a customization directory.

## Historical development notes

The following entries preserve the project's pre-publication development history.
Their 2.x labels were used before the first stable framework distribution; they
are not additional released documentation editions on the first-release website.

## 2.1.1 (2025-09-22)

- Add Husky pre-commit hook to enforce formatting before commits.
- Add `prettier-plugin-tailwindcss` to auto-sort Tailwind classes during formatting.
- Extract `prettier` config into standalone `@rdx/prettier-config` inside `config/`, removing `.prettierrc` from project root.
- Move `ts-config` and `eslint-config` into `config/` to separate what is tooling from logic.
- Move `loaders` into `rdx-core` and delete `rdx-loaders` from standalone package.
- Add `rdx-core` package.
- Updated `layout.tsx` to safely access `github.url` via optional chaining.
- Applied fallback to `'system'` theme when `config.theme.defaultTheme` is undefined.
- Replaced hardcoded author name in `DocFooter` with dynamic `config.author` value.
- Improved rendering logic with safe access to `navbar.item`.
- Introduced fallback `defaultHref` based on current version.
- Refactored `NavbarLinks` to enforce reserved behavior for `"Docs"` link.
- Improved conditional rendering for `showToggleMode` with optional chaining.
- Replace legacy `githubButton` and `githubUrl` usage with `github.visible` and `github.url`.
- Refactored `NavbarActions` to use structure `github` config with safe access adn early return.
- Improved JSDoc descriptions across config fields for consistency and precision.
- Made `navbar.items`, `navbar.title`, and `navbar.actions` optional for better config ergonomics.
- Refined `RDXConfig` type definitions for improved clarity and flexibility.
- Replaced legacy `githubButton` and `githubUrl` with structured `github` object.
- Refactored GitHub action config to structured format.

- Updated `versions.json` structure to include `active` and `archived` arrays.
- Adjusted `getParsedVersions()` to parse and categorize versions.
- Updated dropdown UI to visually separate archived versions.
- Applied muted styling and line-through to archived items.
- Improved accessibility and clarity for version selection.
- Extracted version logic into `VersionBanner` component.
- Moved header rendering logic into `DocHeader` component.
- Delegated navigation and footer rendering to `DocFooter` component.
- Removed inline logic from `DocPage` for version status, navigation, and metadata.
- Improved readability and maintainability of the documentation layout.
- Added accessibility attributes to close button in mobile sidebar.
- Added Animation from `MobileSideBar`.
- Added `aria-current="page"` to active sidebar links for better accessibility.
- Extracted `SidebarCategory` component from `DesktopSidebar` for improved reability and testability.
- Componentized `Navbar` into `NavbarLogo`, `NavbarLinks`, and `NavbarActions`, for improved readability and maintainability.
- Extracted `ExternalLink` into standalone component for cleaner separation of external link logic in dropdown.
- Modularized `DropdownVersion` component by extracting `DropdownTrigger`, `VersionGroup`, and `LoadingButton` for improved readability and reusability.
- Promoted `LoadingButton` to global component in `@rdx/ui`, ensuring consistent loading behavior across the design system.
- Extracted `VersionItem` into reusable component to reduce duplication and improve readability in `DropdownVersion`.
- Replaced inline icon resolution in `DropdownVersion` with memoized factory instance.
- Centralized icon mapping logic (`iconMap`) to improve maintainability and visual consistency.
- Extracted `getIconByLabel` into factory function for cleaner reuse across components.
- Refactor Navbar to consume configuration `rdx.config.ts`.
- Added `ModeToggle` button for switching between light and dark themes.
- Layout now uses `rdx.config.ts` for metadata, theme, and navbar configuration.
- Created `rdx.config.ts` for centralized site configuration and branding.
- Added typed config interface (`RDXConfig`) for use in `rdx.config.ts`.
- Updated version reference in doc page to use `versionsRaw` for consistency.
- Sidebar now highlights active link using `Button` variant logic.
- Replaced `next-themes` with internal theme provider from `@rdx/ui`, fixing toggle behavior.
- Fixed incorrect alias path for `@rdx/ui/*` in `apps/web/tsconfig.json` to reflect actual package structure.
- Harmonized version field naming (`staticVersions` -> `versionsRaw`) to improve consistency across packages.
- Refactored `Button` component to accept `active` as a variant prop, avoiding DOM leakage when rendered via `Slot`.
- Refactored versioning logic to be data-driven, removing hardcoded assumptions and improving maintainability.
- Promoted `generate-versions.ts` to workspace-level script, now exposed via `npm exec rdx-generate-versions`.
- Modularized versioning system into dedicated package `@rdx/rdx-versioning`, enabling reuse across app and CLI.
- Refactored `DropdownVersion` component to use centralized `getParsedVersions()` helper.
- Removed redundant logic for parsing and categorizing versions inside the component.
- Simplified `VersionProvider` by using `getParsedVersions()` to determine default version.
- Replaced direct access to `versions.json` with helper abstraction.
- Removed unnecessary normalization logic (`replace('version-','')`) across components.
- Updated localStorage key from `mdxRenderDocs-selectedVersion` to `rdx-version` for consistency.

## 2.1.0 (2025-09-10)

- Refactored `main.tsx` to use inline types instead of interface
- Added import alias for type definitions
- Hid Sidebar on mobile view
- Update REAME content from web app
- Minor fixes and adjustments
- Rename all names to de new name project -> `RDX`
- Some fixes
- Add external GitHub link to version 1.1.1 dropdown menu with icons and safe usage
- Throw error when `.mdx` file is placed outside category folder
- Extract `DocLink` and DocCategory to shared types package
- Move `docs-indexer` into standalone package
- Move `mdx-loader` into standalone package

## 2.0.0 (2025-09-07)

- Cleaned up legacy naming, paths, and internal references to reflect new identity.
- Converted from standalone app to monorepo structure using Turborepo.
- Rebranded project as **RDX**, formalizing its role as a documentation tool.
- Project migrated from personal repo [mdxRenderDocs](https://github.com/duhnunes/mdxRenderDocs) to official RDX organization.
