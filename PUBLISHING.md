# Publishing RDX

## Release order: packages before documentation

Prepare code and documentation together, but release them in this order:

1. Publish the packages to npm in dependency order.
2. Allow time for registry propagation. Query each exact version and its intended
   dist-tag until both return the expected release; elapsed time alone is not
   confirmation.
3. Verify a fresh installation from the public registry. Refresh the creator's
   local cache when needed with `pnpm --config.dlxCacheMaxAge=0 create @lexibase/rdx@latest`.
   This refresh does not bypass pnpm release-age policies.
4. Only then deploy the corresponding official guides and versioned documentation
   snapshot to production.

The documentation must describe an update users can already install. If merging
into `main` automatically deploys the website, keep release-specific documentation
and snapshot changes in a separate PR and merge it after registry and installation
verification. Drafts and preview deployments can be prepared alongside the code.

This order applies to future releases and takes precedence over the historical
release checklists below.

## Published grouped component release: RDX 3.0.0 (reference)

The six releases below are published; their exact versions and latest tags were
verified against npm on 2026-10-26. Do not republish them. The documentation
snapshot at `apps/web/versioned_docs/version-3.0.0` is prepared after package
publication, retaining 2.0.0 and 1.0.1. The checklist below records the release
procedure for reference.

The complete shadcn Code Block changes the public React composition from a pre
wrapper to the official root/content API. DialogContent also adopts the official
centered defaults. This requires a major release for custom React callers;
standard Markdown fences and images remain automatic. See PUBLIC_API.md for
migration examples. Do not regenerate existing projects or authored content.

| Package                  | Version | Reason                                                          |
| ------------------------ | ------- | --------------------------------------------------------------- |
| @lexibase/rdx-core       | 1.2.0   | Diff and folder fence transformations                           |
| @lexibase/rdx-ui         | 3.0.0   | Complete shadcn Code Block/Dialog, image previews, hooks/styles |
| @lexibase/rdx-versioning | 1.0.2   | Align its core dependency to 1.2.0; plugin stays optional       |
| @lexibase/rdx-next       | 3.0.0   | Integrate the updated MDX components and require UI ^3.0.0      |
| @lexibase/rdx            | 3.0.0   | Select runtime/UI 3.0.0 and expose official highlighter/hooks   |
| @lexibase/create-rdx     | 3.0.0   | Pin framework 3.0.0 and deliver updated starter examples        |

Types remain at the published 1.1.1 and must not be republished. Workspace
dependencies remain local and are converted to exact versions during packing.

Run `pnpm check` and `pnpm test:release --install` before publishing. Verify
archive exports, new project creation, an existing framework update, optional
versioning, diff/folder rendering, clipboard/wrap controls, image dialogs,
production builds and HTTP responses. Merge the preparation PR after its checks
pass. Publish from updated main, one command at a time, waiting for each exact
version to become readable before publishing consumers:

```powershell
npm whoami
pnpm --filter @lexibase/rdx-core publish --tag latest --access public
npm view @lexibase/rdx-core@1.2.0 version
pnpm --filter @lexibase/rdx-ui publish --tag latest --access public
npm view @lexibase/rdx-ui@3.0.0 version
pnpm --filter @lexibase/rdx-versioning publish --tag latest --access public
npm view @lexibase/rdx-versioning@1.0.2 version
pnpm --filter @lexibase/rdx-next publish --tag latest --access public
npm view @lexibase/rdx-next@3.0.0 version
pnpm --filter @lexibase/rdx publish --tag latest --access public
npm view @lexibase/rdx@3.0.0 version
pnpm --filter @lexibase/create-rdx publish --tag latest --access public
npm view @lexibase/create-rdx@3.0.0 version
```

Query each package's `latest` tag as well as its exact version. Then validate a
fresh public-registry installation outside and inside a pnpm workspace:

```powershell
pnpm --config.dlxCacheMaxAge=0 create @lexibase/rdx@3.0.0 docs-validacao-3
```

A dlx cache refresh does not bypass release-age policy. Review/approve trusted
exact versions in the consumer policy, or wait for the configured age; do not
disable the policy globally. Existing projects update the framework with
`pnpm add @lexibase/rdx@latest`; update the optional versioning plugin separately
when installed. Migrate direct React CodeBlock callers before rebuilding.

After registry and fresh-install verification, prepare the public 3.0 upgrade
guide and finalize the component guides in a documentation PR. Create its
snapshot with `pnpm --filter web docs:version 3.0.0`, preserving the 2.0.0 and
1.0.1 snapshots. Validate the website and snapshot before merging that PR and
deploying production. Record the verified publication date in CHANGELOG.md.
Do not create or advertise the new snapshot during package preparation.

## Published grouped release: RDX 2.0.0 (reference)

All versions in this section are already published and registry-verified. Do not
republish them. The instructions below describe the previous release.

The 2.0 release removes the published ButtonLink module. Project-owned imports
must migrate to Button with href; the implementation stays in button.tsx.
See the [upgrade guide](apps/web/docs/cat-05/updating.mdx#upgrade-from-rdx-1x-to-2x).
Existing MDX, content, public assets, configuration, and snapshots are preserved.

| Package                  | Version | Reason                                                                     |
| ------------------------ | ------- | -------------------------------------------------------------------------- |
| @lexibase/rdx-types      | 1.1.1   | Updated configuration JSDocs for localization and social previews          |
| @lexibase/rdx-core       | 1.1.1   | Align the dependency on types 1.1.1                                        |
| @lexibase/rdx-ui         | 2.0.0   | Remove ButtonLink; add shadcn Table/Kbd, localization, and shared 404      |
| @lexibase/rdx-versioning | 1.0.1   | Align optional plugin dependencies on core/types 1.1.1                     |
| @lexibase/rdx-next       | 2.0.0   | Require UI ^2.0.0; deliver localized UI, document previews, and shared 404 |
| @lexibase/rdx            | 2.0.0   | Select runtime 2.0.0 and UI 2.0.0                                          |
| @lexibase/create-rdx     | 2.0.0   | Generate projects pinned to framework 2.0.0                                |

Core and versioning receive dependency-only patches; the plugin remains optional.
Workspace dependencies stay local during development and become exact versions
in published archives. Do not pair runtime 2.x with UI 1.x.

Run pnpm check and pnpm test:release --install. Check packed imports, the fresh
project, existing framework updates, optional snapshots, English/Portuguese UI,
custom 404s, production HTTP, and nested pnpm workspaces. The local release test
uses archives and does not publish them. Preserve versioned_docs/version-1.0.1.
The 2.0.0 documentation snapshot is prepared from the finalized live guides.

Merge the preparation PR after Linux and Windows checks pass. From updated main,
confirm npm whoami and publish ONE command at a time, waiting for each version
to become readable before publishing its consumers:

```powershell
npm whoami
pnpm --filter @lexibase/rdx-types publish --tag latest --access public
npm view @lexibase/rdx-types@1.1.1 version
pnpm --filter @lexibase/rdx-core publish --tag latest --access public
npm view @lexibase/rdx-core@1.1.1 version
pnpm --filter @lexibase/rdx-ui publish --tag latest --access public
npm view @lexibase/rdx-ui@2.0.0 version
pnpm --filter @lexibase/rdx-versioning publish --tag latest --access public
npm view @lexibase/rdx-versioning@1.0.1 version
pnpm --filter @lexibase/rdx-next publish --tag latest --access public
npm view @lexibase/rdx-next@2.0.0 version
pnpm --filter @lexibase/rdx publish --tag latest --access public
npm view @lexibase/rdx@2.0.0 version
pnpm --filter @lexibase/create-rdx publish --tag latest --access public
npm view @lexibase/create-rdx@2.0.0 version
```

Confirm each latest tag matches the table. Validate creation inside and outside a
pnpm workspace using the explicit creator release:

```powershell
pnpm --config.dlxCacheMaxAge=0 create @lexibase/rdx@2.0.0 docs-validacao-2
```

If a release-age policy blocks the new release, review and approve its exact
versions following the [policy guide](apps/web/docs/cat-05/troubleshooting.mdx#a-release-age-policy-blocks-installation),
or wait for the configured age. A cache refresh does not override this policy.

Existing main-package projects update with pnpm add @lexibase/rdx@latest after
migrating any ButtonLink imports. If versioning is installed, its dependency
patch can be updated separately with pnpm add @lexibase/rdx-versioning@latest.
Run development, build, and production startup again; .rdx is refreshed by RDX.
Record the publication date in CHANGELOG.md only after registry verification.

## Published CSS and TypeScript patch: runtime/framework 1.2.2 and creator 1.2.3 (reference)

Registry-verified publication: 2026-10-25. Do not republish these versions.

This patch delivers the Tailwind build-output exclusion, transitive PostCSS plugin
resolution for development workers, and a project-root
TypeScript configuration for new projects. Publish only runtime, main framework
and creator. The main package selects runtime 1.2.2 and UI 1.1.0; creator 1.2.3
pins framework 1.2.2. UI, core, types and versioning remain unchanged.

Run `pnpm check` and `pnpm test:release --install`. Confirm that the creator
archive includes `templates/default/tsconfig.json` and that generated styles
exclude `.rdx/.next` while retaining runtime, component and MDX classes. Validate
`rdx dev` after a production build with clean CSS and no parsing warnings.
Merge the preparation PR after Linux and Windows checks pass. From updated main,
publish one package at a time, waiting for each dependency to become available:

```powershell
npm whoami
pnpm --filter @lexibase/rdx-next publish --tag latest --access public
npm view @lexibase/rdx-next@1.2.2 version
pnpm --filter @lexibase/rdx publish --tag latest --access public
npm view @lexibase/rdx@1.2.2 version
pnpm --filter @lexibase/create-rdx publish --tag latest --access public
npm view @lexibase/create-rdx@1.2.3 version
```

Verify latest tags: runtime/framework 1.2.2 and creator 1.2.3. For release-day
validation, use `pnpm --config.dlxCacheMaxAge=0 create @lexibase/rdx@1.2.3 docs`.
pnpm 11's default release-age policy can select an older creator for `@latest`
during the first 24 hours; refreshing the dlx cache alone does not change that
policy. Test inside and outside a workspace and verify the generated framework
dependency is 1.2.2.

Existing main-package projects update the framework dependency; project-owned
configuration, content and components are preserved. Add the project-root
`tsconfig.json` from the creator template to an existing project that needs it,
merging settings if a config already exists. Record the publication date after
registry validation. Package changes do not publish automatically.

## Published layout patch: runtime/framework 1.2.1 and creator 1.2.2 (reference)

These versions are already published. Do not republish them.

Publish only these three packages, in this order. UI, core, types and versioning
remain at their published versions. The main package selects runtime 1.2.1 and
UI 1.1.0; the creator template pins the main framework at 1.2.1.

Run `pnpm check` and `pnpm test:release --install`, including the generated CSS
layout assertions and the pnpm workspace fixture with nested dist ignore rules.
Merge the preparation PR after Linux and Windows checks pass. From updated main,
run one command at a time and wait for each dependency to become available:

```powershell
npm whoami
pnpm --filter @lexibase/rdx-next publish --tag latest --access public
npm view @lexibase/rdx-next@1.2.1 version
pnpm --filter @lexibase/rdx publish --tag latest --access public
npm view @lexibase/rdx@1.2.1 version
pnpm --filter @lexibase/create-rdx publish --tag latest --access public
npm view @lexibase/create-rdx@1.2.2 version
```

Verify all three latest tags. Test fresh creation with
`pnpm --config.dlxCacheMaxAge=0 create @lexibase/rdx@latest docs` outside and
inside a pnpm workspace, then check development and production layout. Existing
main-package projects update with `pnpm add @lexibase/rdx@latest`; projects using
the runtime directly update `@lexibase/rdx-next@latest` instead. Do not regenerate
existing documentation or edit `.rdx` manually. Record the publication date after
registry validation. Package preparation does not publish anything.

## Published CLI patch: 1.2.1 (reference)

Only `@lexibase/create-rdx` changed version for this patch. Do not republish it.
The generator handles
repeated exact RDX approvals in pnpm workspaces before installation and runtime
preparation. Generated projects still pin `@lexibase/rdx@1.2.0`; runtime, UI, core,
types and versioning do not need another publication.

Run `pnpm check` and `pnpm test:release`. Verify that the creator archive includes
`bin/pnpm-policy.mjs` and declares its `yaml` dependency. Merge the preparation PR
after Linux and Windows checks pass. From the updated `main` branch:

```powershell
npm whoami
pnpm --filter @lexibase/create-rdx publish --tag latest --access public
npm view @lexibase/create-rdx@1.2.1 version
npm view @lexibase/create-rdx dist-tags --json
```

The exact version and `latest` must both be 1.2.1. Validate creation in a workspace
with earlier RDX approvals, not just an empty workspace. Refresh the cached creator
when testing a fresh publication:

```powershell
pnpm --config.dlxCacheMaxAge=0 create @lexibase/rdx@latest docs
```

Check installation, a second lockfile policy verification, development, build and
production startup. Record the actual publication date only after registry
validation. These preparation steps do not publish packages.

## Published release: 1.2.0 (reference)

`@lexibase/rdx` is the main framework entry for newly generated projects. It
selects compatible runtime and UI versions. Optional plugins remain separate.
This grouped release is already published. The following table and commands
record its dependency order; do not republish these existing versions.

This grouped release publishes six changed packages:

| Package                | Role                                 | Selected RDX dependencies in its archive      |
| ---------------------- | ------------------------------------ | --------------------------------------------- |
| `@lexibase/rdx-types`  | Configuration types 1.1.0            | Adds metadata.since                           |
| `@lexibase/rdx-core`   | Configuration validation 1.1.0       | Types 1.1.0                                   |
| `@lexibase/rdx-ui`     | Shared theme and components 1.1.0    | Types 1.1.0; adds FooterCredit                |
| `@lexibase/rdx-next`   | Runtime and CLI implementation 1.2.0 | Core/types 1.1.0; compatible UI peer `^1.1.0` |
| `@lexibase/rdx`        | Main framework entry 1.2.0           | Runtime 1.2.0 and UI 1.1.0                    |
| `@lexibase/create-rdx` | Project generator 1.2.0              | Generated projects pin main framework 1.2.0   |

The framework, runtime and creator versions 1.1.0 are already published. Do not
overwrite them or republish the unchanged versioning package at 1.0.0. Workspace
dependencies become exact internal versions in `pnpm pack` and `pnpm publish`.

Run `pnpm check` and `pnpm test:release --install`. Inspect all seven archives
and merge the preparation PR after the Linux and Windows checks pass. From the
updated `main` branch, confirm `npm whoami` and publish one command at a time,
waiting for each dependency to become available before its consumer:

```powershell
pnpm --filter @lexibase/rdx-types publish --tag latest --access public
npm view @lexibase/rdx-types@1.1.0 version

pnpm --filter @lexibase/rdx-core publish --tag latest --access public
npm view @lexibase/rdx-core@1.1.0 version

pnpm --filter @lexibase/rdx-ui publish --tag latest --access public
npm view @lexibase/rdx-ui@1.1.0 version

pnpm --filter @lexibase/rdx-next publish --tag latest --access public
npm view @lexibase/rdx-next@1.2.0 version

pnpm --filter @lexibase/rdx publish --tag latest --access public
npm view @lexibase/rdx@1.2.0 version

pnpm --filter @lexibase/create-rdx publish --tag latest --access public
npm view @lexibase/create-rdx@1.2.0 version
```

Confirm each `latest` tag matches the table, then create fresh projects outside
and inside a pnpm workspace with `pnpm create @lexibase/rdx@latest`. A project
named `docs` is supported; its content remains in its own `docs/` subdirectory.
Validate development, production build/start, footer year ranges, the repository
credit link, custom component imports and optional versioning. Test adoption in
an existing project using the migration instructions in the updating guide.
Only after registry validation, record the actual 1.2.0 publication date in
`CHANGELOG.md`. Keep the official 1.0.1 documentation snapshot unchanged.

For an existing project using the main entry, update `@lexibase/rdx@latest`.
Projects using direct runtime/UI dependencies must update both to meet the new
UI peer requirement, or migrate their configuration/component imports to the main
package before removing those direct dependencies. No versioning update is required.

A later UI-only release updates the UI package and the main package's selected
UI version. An unchanged runtime does not need another publication. Existing
projects update `@lexibase/rdx`; optional plugins keep their own release cycle.

## Published patch: 1.0.1

The six 1.0.0 packages and the 1.0.1 patch are published. That patch updated only
`@lexibase/rdx-next` and `@lexibase/create-rdx`. Its creator template selected
runtime 1.0.1 and UI 1.0.0. Those published archives cannot be overwritten.

The official website's 1.0.1 snapshot documents that released package layout.
Leave it unchanged when preparing the new main framework entry.

## First stable release runbook (1.0.0)

This is the maintainer runbook for the prepared first stable release.
Changing manifests, merging a PR and deploying documentation do **not** publish
npm packages. Nothing in the verification scripts uploads packages.

## Before proceeding

- Verify the MIT code and CC BY 4.0 documentation notices in `LICENSE` and `LICENSE-docs`.
- Review and merge the preparation PR with successful Linux and Windows checks.
- Follow the Node.js and package-manager policy in [SUPPORT.md](./SUPPORT.md).
- Confirm the six public manifests are 1.0.0 and the creator template pins
  `@lexibase/rdx-next@1.0.0` and `@lexibase/rdx-ui@1.0.0`.
- Do not change npm tags or announce availability before actual publication.

The unscoped `create-rdx` belongs to another project. Our package is
`@lexibase/create-rdx`; the stable creation commands are
`npm create @lexibase/rdx@latest` and `pnpm create @lexibase/rdx@latest`.

## Validate the exact source

From the repository root, using the declared pnpm version:

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test:release --install
pnpm audit --prod
```

The release test packs all six packages and installs their actual archives in an
isolated generated project. It verifies production builds/HTTP with search on,
versioning on, and search off, including execution from the project root and
the generated app directory. Third-party dependencies are resolved independently
of the workspace lockfile. Inspect the final retained path printed by the test.

Optional browser tests cover interactions beyond HTTP. A successful native
`apps/web` deployment alone does not prove a generated project deploys correctly.
The separate generated Vercel test project exercises that deployment path.

Review [CHANGELOG.md](./CHANGELOG.md), public examples and the configuration
migration before publishing. MDX expression blocking, Node support, removed beta
configuration fields and generated-runtime boundaries must remain explicit.

## Confirm identity and registry state

```powershell
npm whoami --registry=https://registry.npmjs.org/
npm org ls lexibase --registry=https://registry.npmjs.org/
npm view @lexibase/create-rdx dist-tags --json
npm view @lexibase/rdx-next dist-tags --json
```

Check the exact target version of **each** package before uploading:
`npm view @lexibase/rdx-types@1.0.0 version`, and likewise for the others.
An absent version may return 404. Stop if authentication fails or a target
version already exists; do not try to overwrite it.

Historical `latest` tags may still point at the first beta. The stable publication
must replace them with actual stable versions. Do not fix this by promoting an
old beta to `latest`.

Authentication and two-factor prompts belong only in the terminal/browser.
Never put tokens, one-time passwords or credentials in source files or chat.

## Inspect archives

`pnpm test:release` verifies required files, rewritten workspace dependencies
and matching template references. Review its retained archives when needed.
Plain `npm pack --dry-run` is only a preview, not a publication.

Use pnpm to publish workspace packages: it rewrites internal `workspace:*`
dependencies to their matching public versions. The UI intentionally ships
React/Next.js source to preserve component boundaries.

## Publish manually, in order

Run one command at a time and stop on the first error:

```powershell
pnpm --filter @lexibase/rdx-types publish --tag latest --access public
pnpm --filter @lexibase/rdx-core publish --tag latest --access public
pnpm --filter @lexibase/rdx-ui publish --tag latest --access public
pnpm --filter @lexibase/rdx-versioning publish --tag latest --access public
pnpm --filter @lexibase/rdx-next publish --tag latest --access public
pnpm --filter @lexibase/create-rdx publish --tag latest --access public
```

The optional plugin is published before exposing the stable runtime and creator.
A stable `rdx add versioning` asks for the plugin's `latest` channel, not `beta`.
Installing the plugin remains optional in generated projects.

A successful `+ @lexibase/package@1.0.0` means the upload was accepted.
Allow registry propagation and verify it; do not repeat a successful upload.
If publication stops midway, inspect all six registry versions/tags before resuming.
Do not publish private configuration packages or the development website.

If a release candidate is desired instead, prepare proper prerelease versions,
update the template and rerun validation first. Publishing 1.0.0 under `rc`
does not reserve an editable candidate: npm versions cannot be overwritten later.

## Verify the registry, not only local archives

Check each package's 1.0.0 version and `latest` tag, then use separate empty
directories outside the monorepo for npm and pnpm:

```powershell
npm create @lexibase/rdx@latest
# Answer the name prompt, then enter the generated folder.
npm run dev
# Stop development before the production commands.
npm run build
npm run start
```

Repeat creation with `pnpm create @lexibase/rdx@latest` in another directory,
using `pnpm dev`, `pnpm build` and `pnpm start`.

Check the generated configuration, sidebar, components and public images.
Enable search/TOC and a custom homepage, restart development, and rebuild.
Initially there must be no version manifest or snapshot directory.

Stop the server, then activate and validate versioning with the same manager:

```powershell
pnpm rdx add versioning
pnpm rdx add versioning
pnpm rdx version 1.0.0
```

The repeat must not duplicate configuration or upgrade an installed plugin.
Change a live page, build and start: Current must show the edit while the
snapshot retains its content. Search must stay within the selected edition.

If a package-manager release-age policy rejects new releases, approve only
the exact versions you trust using the project's policy. Do not globally disable
protections, delete lockfiles reflexively or mix package managers.

Recheck a generated site's public deployment after the final package release.

## Finish the launch

After registry and deployment checks succeed:

- Change the changelog entry from Unreleased to the actual release date.
- Verify the official installation page's `@latest` commands against the registry.
- Deploy the final stable instructions only after all stable packages are available.
- Create the actual 1.0.0 documentation snapshot once, not on every build.
- Announce the release and retain beta/RC channels separately.

Git commits, merges, release tags and publication remain explicit maintainer
actions. This document does not execute them.
