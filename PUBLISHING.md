# Publishing RDX

## Prepared release: 1.1.0

`@lexibase/rdx` is the main framework entry for newly generated projects. It
selects compatible runtime and UI versions. Optional plugins remain separate.
This release has not been published by preparing these files.

The three changed packages are prepared at 1.1.0:

| Package | Role | Selected RDX dependencies in its archive |
| --- | --- | --- |
| `@lexibase/rdx-next` | Runtime and CLI implementation | Core/types 1.0.0; compatible UI peer `^1.0.0` |
| `@lexibase/rdx` | Main framework entry | Runtime 1.1.0 and UI 1.0.0 |
| `@lexibase/create-rdx` | Project generator | Generated projects pin main framework 1.1.0 |

The runtime and creator versions 1.0.1 are already published. Do not overwrite
them or republish unchanged core, types, UI or versioning packages. Workspace
dependencies become exact internal versions in `pnpm pack` and `pnpm publish`.

Run `pnpm check` and `pnpm test:release --install`. Inspect all seven archives
and merge the preparation PR after the Linux and Windows checks pass. From the
updated `main` branch, confirm `npm whoami` and publish one command at a time,
waiting for each dependency to become available before its consumer:

```powershell
pnpm --filter @lexibase/rdx-next publish --tag latest --access public
npm view @lexibase/rdx-next@1.1.0 version

pnpm --filter @lexibase/rdx publish --tag latest --access public
npm view @lexibase/rdx@1.1.0 version

pnpm --filter @lexibase/create-rdx publish --tag latest --access public
npm view @lexibase/create-rdx@1.1.0 version
```

Confirm each `latest` tag is 1.1.0, then create a fresh project outside the
monorepo with `pnpm create @lexibase/rdx@latest`. Validate development, production
build/start, custom component imports and optional versioning. Test adoption in
an existing project using the migration instructions in the updating guide.
Only after registry validation, record the actual 1.1.0 publication date in
`CHANGELOG.md`. Keep the official 1.0.1 documentation snapshot unchanged.

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
