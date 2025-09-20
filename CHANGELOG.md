# Changelog

## 2.1.1 (unreleased)

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
