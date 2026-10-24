# RDX release readiness

Status: **1.0.0 published**. The maintainer published all six public packages,
and their registry `latest` tags were verified at 1.0.0 on 2026-10-24.
The maintainer handles commits, PRs, merges and publication.

## 1.1.0 follow-up

- [x] Prepare main framework, runtime and creator at 1.1.0; keep other package versions unchanged.
- [x] Pin main framework 1.1.0 in generated projects.
- [x] Complete workspace checks and installed-archive production/update tests for these versions.
- [ ] Merge the preparation PR after Linux and Windows CI passes.
- [ ] Publish runtime, main framework and creator in dependency order; verify registry tags.
- [ ] Validate registry creation and existing-project migration, then record the release date.

## 1.0.1 follow-up

- [x] Prepare corrected document metadata in the Next.js runtime at 1.0.1.
- [x] Prepare creator 1.0.1, pinning runtime 1.0.1 and UI 1.0.0.
- [x] Create the official 1.0.1 documentation snapshot alongside Canary.
- [x] Complete `pnpm check`, installed-archive production/HTTP tests and native
      browser checks in development and production, including edition switching.
- [x] Merge the patch PR and publish the two changed packages.
- [ ] Verify registry installation, record the patch release date and deploy the snapshot.

Public-registry validation of 1.0.0 confirmed npm creation, installation, build,
production pages, public assets and 404s. It revealed the document-title bug fixed
in this patch. pnpm creation/installation completed, but later policy verification
and npm plugin installation hit DNS failures (`ENOTFOUND registry.npmjs.org`).
Do not mark those network-blocked checks as successful or disable security policy.

## Scope

The first stable release delivers creation, MDX authoring, shared documentation
UI, local development, production builds and a validated deployment path.
Next.js + Tailwind CSS + shadcn/ui Base UI remain the foundation.

Search, TOC, homepage and versioning are opt-in. Localization, multilingual
sources, nested categories, custom Markdown shorthand and new components remain
outside this release. See [CHANGELOG.md](./CHANGELOG.md).

## Completed baseline

- [x] Creator validates names and rejects unsafe/reserved paths and unknown flags.
- [x] Help/version do not create projects; existing destinations are preserved.
- [x] Failed installation leaves source files and gives recovery instructions.
- [x] Public configuration and plugin API v1 are documented in `PUBLIC_API.md`.
- [x] Site metadata, canonical `RDXConfig` and fixed live `docs/` are implemented.
- [x] Plugin installation follows runtime channels and preserves installed versions.
- [x] Six real package archives are installed and tested independently of source links.
- [x] Production checks cover assets, bundles, relative links, 404s, version
      isolation and removal of disabled search indexes.
- [x] Production root and `.rdx/` working directories are covered.
- [x] Content tracing includes required MDX/categories/plugin runtime files
      without including unrelated project source.
- [x] Linux/Node 22 and Windows/Node 24 CI validate workspace and installed archives.
- [x] A standalone generated test site was deployed on Vercel and verified.
- [x] The official native `apps/web` site is deployed at
      [rdx-tool.vercel.app](https://rdx-tool.vercel.app/docs).
- [x] The English website covers installation, authoring, components,
      configuration, optional features, updates and deployment.
- [x] Core metadata supports indexing/robots. Automatic sitemap generation and
      automatic global canonical URLs are not part of 1.0.
- [x] Trust boundaries are documented: configuration/plugins/React are trusted
      code; MDX protection is not a sandbox; public assets/search are public.
- [x] The pre-preparation review reported no audit advisories in the workspace
      or newly installed generated project. Repeat near the final upload.

## Current preparation

- [x] Stage all six public package versions at 1.0.0, without publishing.
- [x] Pin the template's runtime and UI to the prepared 1.0.0 versions.
- [x] Align Node engines to 22.18+ (22.x) or 24.11+ (24.x), as chosen by the maintainer.
- [x] Document tested OS/package-manager coverage in `SUPPORT.md`, rather than
      claiming every combination is tested.
- [x] Remove empty UI hook/context exports, including the misspelled `contenxts`.
- [x] Fix the live-edition divider and cover empty/live/active/archived/footer cases.
- [x] Write first-release notes, beta migration notes and a stable publication runbook.
- [x] Complete fresh local workspace, installed 1.0.0 archive and production audit
      checks on this preparation. Browser tests also verify Canary's menu has no
      dangling divider. No audit advisories were reported in the workspace or the
      generated versioned fixture; this is not proof of absence of vulnerabilities.
- [x] Push the preparation PR and obtain successful checks on both CI environments (#50).
- [ ] Validate real interactive creation/cancellation with npm and pnpm on the
      supported target environments. Direct creator prompt creation/cancellation was
      checked locally on Windows; that alone is not the full matrix.
- [x] Maintainer approved MIT for code/examples/CLI templates and CC BY 4.0 for
      official documentation prose. Scope and attribution are in `LICENSE-docs`.
- [ ] Approve the public 1.0 API and migration notes as the final compatibility baseline.

## Publication gates

- [x] Inspect final archives and confirm no target version is already published.
- [x] Confirm npm identity, organization permission and two-factor authentication.
- [x] Publish manually in dependency order, with stable versions and `latest`.
- [x] Verify all registry versions and channels, including creator/runtime `latest`,
      which historically pointed at the first beta.
- [x] Create clean projects through actual npm and pnpm registry commands.
- [ ] Verify optional plugin activation, snapshot isolation, build/start and deployment.
- [ ] Verify prepared `@latest` website instructions against the registry and
      deploy them with the release date only after stable package availability.
- [ ] Announce the release after the metadata patch and remaining registry checks.

A release candidate is optional, not a substitute for these gates. If chosen,
prepare matching prerelease manifests/template and validate them before uploading;
do not publish 1.0.0 under an evaluation tag and expect to overwrite it later.

No npm publish, dist-tag change, Git release tag or documentation snapshot is
performed by updating this checklist.
