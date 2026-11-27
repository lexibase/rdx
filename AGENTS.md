# RDX development guidelines

## Foundation and scope

- RDX offers a simple documentation experience on **Next.js + Tailwind CSS + shadcn/ui**. This is the project's foundation, not just a visual reference.
- Use the **Base UI** variant when installing or adding shadcn/ui components, following the package's `components.json`. Check the official implementation before creating an alternative.
- If a component already exists in shadcn/ui, start from it and adapt only the MDX integration, the configuration and what documentation needs. Do not reimplement functionality the component already provides.
- Keep the complete official component, with its composition and options. Do not replace it with a reduced version of your own or with a few extracted primitives. The MDX binding lives in a separate adapter; extensions such as `folder` add features to the official component.
- When no suitable component exists, create a documentation-specific component, composing shadcn/ui components where applicable and keeping their visual style. Callouts are an example of an RDX extension.
- Do not replace this foundation, add another UI library or introduce another headless variant without an explicit request from the user.
- RDX delivers its features through the framework and the templates. Do not rely on adaptations made in a single consumer project, and do not change those projects from this repository.

## Project map

| Area                             | Responsibility                                                     |
| -------------------------------- | ------------------------------------------------------------------ |
| `apps/web`                       | Official site, development application and visual reference        |
| `packages/rdx`                   | Main package, public CLI and selection of compatible runtime/UI    |
| `packages/rdx-core`              | Configuration, content, Markdown, links, search and checker        |
| `packages/rdx-ui`                | Shared components and styles                                       |
| `packages/rdx-types`             | Shared public contracts                                            |
| `packages/rdx-next`              | Next.js integration, CLI/runtime, generated routes and metadata    |
| `packages/create-rdx`            | Generator and template for new projects                            |
| `packages/rdx-plugin-versioning` | Documentation editions and their commands                          |
| `packages/rdx-plugin-i18n`       | Official languages plugin                                          |
| `packages/rdx-plugin-changelog`  | Plugin and command for creating release notes                      |
| `scripts`                        | Development, release preparation/publishing and installation tests |
| `config`                         | Shared TypeScript and ESLint configuration                         |

- The official site uses the local packages through the workspace. Installed projects use the published framework and a runtime generated in `.rdx/`. Fixing only `apps/web` does not fix users' projects: change the shared implementation and, where applicable, the template.
- `.rdx/`, caches, `dist`, `node_modules` and environment files are generated or local. Do not treat them as the customization API of projects.
- Maintenance entry points:
  - checker: `packages/rdx-core/src/check/`;
  - document links: `packages/rdx-core/src/content/document-links.ts`;
  - heading IDs, shared by the checker and search: `packages/rdx-core/src/mdx/heading-text.ts`. Compare with the rendered HTML when changing this logic;
  - Markdown components and exports: `packages/rdx-core/src/mdx/`;
  - `_labels.json` catalogs: `packages/rdx-core/src/config/labels.ts` and `packages/rdx-next/bin/labels-catalog.mjs`;
  - homepage catalogs: `packages/rdx-next/bin/homepage-translations.mjs`;
  - changelog reading and ordering: `packages/rdx-core/src/config/changelog.ts`.

## Experience and appearance

- Favor minimalism and ease of authoring; do not reproduce the whole component catalog.
- `apps/web` is the development project and the visual reference. The shared implementation lives in `packages/rdx-ui` and must also reach generated projects.
- Keep approved visuals. Prefer compact spacing without sacrificing readability, accessibility, keyboard use or small screens. A visual component is not validated just because it compiled: check its appearance when it is part of the change.
- The MDX integration and a future Markdown syntax of its own are layers over these components. Imports and plugins are valid options; they are not forbidden.
- Use the existing tokens, including `--rdx-highlighting`. Do not pick blue or cyan as if they were RDX's default color. The highlight color is customizable and is not the same setting as the syntax highlighting themes.
- **Atlas** is the official fictional project used in examples. Templates live in `apps/web/components/templates/`; keep the dialog preview, the hover controls and the full landing page presentation.
- Steps is an interactive component with panels, navigation, a sideways transition and current-step indicators. Do not turn it into a numbered list.

## Documentation

- Public documentation teaches the available behavior, with usable examples. A new feature, a behavior change or a migration goes into the documentation in the same change as the code: code without documentation is not done.
- In package manager tabs (`pnpm`, `npm` and `yarn`), write simple commands as plain text in the panel. Use the tab's own copy control, without wrapping those commands in code blocks or duplicating copy controls.
- Teach authoring of documentation components through the available Markdown syntax. React examples belong to homepage/logo customization and to technical API or migration references, without requiring JSX to write pages.
- Do not include promises, roadmap, private development history or explanations about removed options in usage guides. Record planning in `ROADMAP.md` and history in `CHANGELOG.md`.
- Explain operational and security limitations when they are needed to use RDX correctly.
- Official documentation text follows `LICENSE-docs`; code, examples and CLI templates follow MIT. This does not define the license of documentation created by users.
- The official documentation is written in English. The configuration reference is `apps/web/docs/02-getting-started/config.mdx`, and frontmatter is explained in `apps/web/docs/03-writing-documentation/create-docs.mdx`.
- `highlighting: important` uses the amber indicator; `highlighting: new`, the blue one. Do not mark pages as important without a reason, and do not invent a migration for every minor or patch.
- Every breaking major gets a migration page in `05-guides`, with `highlighting: important`. Migrations go at the end of Guides, newest first: use `order` equal to 100 minus the major (93 for 7, 95 for 5). List the new migration first under "Previous migrations" in `updating.mdx`.
- `ROADMAP.md` holds historical planning. An open item does not prove a feature is missing: check the code and the documentation, and do not treat the roadmap as an automatic task list.

## Authoring and content

- `.md` and `.mdx` are supported. RDX Markdown components do not require JSX; custom React components and imports belong to MDX.
- Folders and files with numeric prefixes (`01-`) organize the sidebar; URLs omit these prefixes. `order` and `navTitle` are available frontmatter fields.
- A category's name comes from its folder, and the sidebar shows it in uppercase by design. To change or translate the text, use the `categories` section of `_labels.json`. Since 7.0, `_category.json` is not read: do not reintroduce that file, nor `categoryTitle` in pages, which was discussed and rejected.
- `related` and `prerequisites` use relative document paths; `redirectFrom` records former URLs. Last updated, permalinks, page editing, Markdown copy and `llms.txt` already exist: check their options before proposing them as new.
- `.rdx-document-dates.json` is a local date cache and stays out of Git. `_rdx-last-updated.json` inside a snapshot is the edition's frozen metadata: do not confuse the two or delete the second as a cache.

## Languages

- The languages plugin is optional (`pnpm rdx add i18n`). Translated documents live in `locale/<folder>/docs/`. A `ptbr` folder can represent `pt-BR`, with URLs under `/pt-br/docs/...`. Untranslated pages use the primary documentation with a notice; search indexes only the content written in each language.
- RDX ships interface text in English only. Do not embed translations again. Other languages use one `_labels.json` per language: the primary language's at the root and translations' in `locale/<folder>/`, with `interface` and `categories` sections. Keys are the English text and the primary category names; an empty value keeps the original; a translation that loses a placeholder such as `{version}` is ignored.
- `rdx i18n sync` creates and completes the catalogs (`_labels.json` and `home.json`) with empty values, across every edition. It preserves translations, `$metadata` and orphan keys, and removes entries only with `--prune`. It does not translate automatically. `rdx check` warns about orphan entries and lost placeholders.
- The English interface texts live in `packages/rdx-ui/src/lib/i18n.ts` and must be unique, because they are the catalogs' keys.
- A translated homepage has **one** component, `components/home.tsx`, with `homepage: { enabled: true, translations: true }` and literal `t('...')` phrases. The texts live in `locale/<folder>/home.json`; missing phrases use the primary text. Do not require a copy of `home.tsx` per language again. `homepage.component` is not combined with `translations: true`.
- Phrase extraction is static and limited to literal uses. Do not assume interpolation, plurals or rich text just because they appeared in proposals.

## Versions, routes and metadata

- Canary is the documentation in development, in `apps/web/docs/`. It is not a numeric version to promote or delete: releases create snapshots from it.
- There is one displayed edition per major. A patch or minor advances its series' edition, with redirects; a new major gets a separate entry. Do not create an edition per patch or rebuild `versions.json` by scanning historical directories.
- Versioning is optional in installed projects. `rdx version`, `rdx archive`, `rdx unarchive` and `rdx delete` belong to the plugin; archiving keeps content and deleting removes it. Check the help and the tests before suggesting a destructive operation.
- `basePath` is set in `rdx.config.ts`, and content keeps writing paths without the prefix. Use the shared integration and the `withBasePath` helper; do not add prefixes indiscriminately, especially to paths that go through Next's `Link`. Keep search, languages, exports, images and metadata working in this scenario.
- Sitemap, robots, canonical URLs, alternates and Markdown exports are automatic. On a domain with multiple zones, the router project serves the host root's `robots.txt`.

## How to work

- Talk to the user in Brazilian Portuguese. Tell a question from an authorization: "what do you think?" does not mean "implement it now". When an implementation is requested, finish the work without asking for repeated confirmation on routine decisions.
- Reproduce a bug before claiming it exists. Read what is needed and run focused tests, without revalidating everything at every step.
- Use the `rdx/` prefix on every new branch, including releases. Commands given to the user are for PowerShell, from the project root.
- `main` is protected: do not try to push directly or open a PR from `main` to `main`. After a squash merge, start a new branch from the updated `main`.
- The pre-commit hook checks staged content: if you format a file after `git add`, add it again. Do not disable the hook. Commitlint limits commit body lines to 100 characters.
- The user merges with `gh pr merge NUMBER --squash --delete-branch`, which also deletes the local branch.
- A Dependabot update can carry fixes, but the `chore(deps)` title does not prove the nature of the change: read the diff and the relevant notes. Do not merge automatically, and do not mix large majors into a release of fixes without reviewing compatibility.

## Environment

- pnpm is pinned to 12.21.0 by `packageManager`. Supported Node: `^22.18.0 || ^24.11.0`. CI runs on Ubuntu and Windows; see `.github/workflows/ci.yml`.
- pnpm overrides and settings live in `pnpm-workspace.yaml`, not in the `pnpm.overrides` field of `package.json`.
- At the root of this monorepo, `pnpm check` is the full workspace suite. In a project created by the CLI, `pnpm check` runs `rdx check`. They are different commands.
- Packages whose tests import `dist` must be built after a change. Use each package's own ESLint: running it from `apps/web` can skip files outside that base.
- Writing the Turbo cache to an HDD is slow. Release preparation uses `--ui=stream --cache=local:r`; do not remove this setting without measuring.
- On Windows, Git Bash's `tar` does not understand `C:\` paths. Run `pnpm test:release` from PowerShell, which uses the system `tar`.

## Delivery

- Prepare releases with `pnpm release:note`, `pnpm release:plan` and `pnpm release:prepare`. Review the semantic severity and the notes; leave the mechanical update of versions, template, changelog and snapshot to the script. Run the tests focused on the changes locally. CI runs `pnpm check` and the complete installation tests; do not repeat that suite locally during routine release preparation, except to investigate a specific failure or when the user explicitly asks.

- RDX follows semver. Packages have independent versions; only the framework (`@lexibase/rdx`) and the generator (`@lexibase/create-rdx`) share their number. Recommend each package's severity to the user (patch for fixes, minor for compatible features, major for breaking changes) before preparing the release; the decision is theirs.

- When `@lexibase/rdx-ui` moves to a new major, `release:prepare` moves the `@lexibase/rdx-next` peer range to the new version and requires the runtime in the same release.

- The public release note lives in `apps/web/changelog/<version>.md`: human-friendly, grouped by what readers gain or need to do, linking to the edition (`/docs/<version>/...`) and using RDX Markdown components where they help. The root `CHANGELOG.md` is the technical record generated by Changesets. A major release opens its note with the breaking change notice and the link to the migration.

- `pnpm check` starts by checking formatting across the whole repository with Prettier (`pnpm format:repo`); `pnpm format` fixes the files. Snapshots in `versioned_docs` and generated files are excluded by `.prettierignore`.

- Visual or interactive changes go through the `rdx-next` browser tests, which use Playwright: `pnpm --filter @lexibase/rdx-next test:runtime`. Install Chromium once with `pnpm --filter @lexibase/rdx-next exec playwright install chromium`, or point `RDX_BROWSER_EXECUTABLE` to an installed Chrome or Edge. Without a browser, the checks are skipped with a warning; with `RDX_REQUIRE_BROWSER=1`, as in CI, they fail.

- Validate the changes and finish with the conventional commit message and the commands to update or create the PR.
- The user makes commits, merges and publications from the terminal. Do not run them automatically without explicit authorization for those actions.
- Do not publish packages or bump versions on every adjustment; publications are grouped when requested. A "checked and merged" closes that PR, but does not authorize publishing a version.

- To test terminal adjustments, when requested, publish only the CLI with a prerelease version and the `beta` tag, keeping the stable framework in the template. Use a beta branch and do not advance the documentation snapshot on every attempt. Before preparing the stable release with Changesets, restore the CLI's stable base version; do not merge beta metadata directly into `main`.

- Prepare each release in a single PR, bringing together implementation, package versions, migrations, changelog, guides and the documentation snapshot. Validate everything together. After the merge, the documentation can deploy automatically; the user publishes the packages to npm and confirms versions, tags and installation from the registry. Do not open a second PR just to release documentation, and do not make the snapshot depend on a prior npm publication. This preference replaces the former packages-first, separate-documentation flow.

- Publishing runs after the release merge, in a new workflow run: `gh workflow run publish.yml --ref main -f version=X.Y.Z -f publish=true`. A rerun keeps the original commit and reads the old manifest. If it fails, read the real error with `gh run view NUMBER --log-failed`. The publisher resumes a partial publication by skipping versions already published: do not bump versions because of a timeout. If `release:prepare` fails midway, examine the working tree before any new attempt; versions may already have been applied.
