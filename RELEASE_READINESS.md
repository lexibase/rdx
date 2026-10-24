# RDX 1.0 — release readiness

Status: **prepared locally, not published**. The six public manifests and creator
template are staged for 1.0.0. This is not an announcement or authorization to
upload packages. The maintainer handles commits, PRs, merges and publication.

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
- [ ] Push the preparation PR and obtain successful checks on both CI environments.
- [ ] Validate real interactive creation/cancellation with npm and pnpm on the
  supported target environments. Direct creator prompt creation/cancellation was
  checked locally on Windows; that alone is not the full matrix.
- [ ] Resolve documentation licensing with the maintainer. The old README links
  to a missing `LICENSE-docs`; do not select a CC variant or relicense text
  implicitly. Code remains MIT.
- [ ] Approve the public 1.0 API and migration notes as the final compatibility baseline.

## Publication gates

- [ ] Inspect final archives and confirm no target version is already published.
- [ ] Confirm npm identity, organization permission and two-factor authentication.
- [ ] Publish manually in dependency order, with stable versions and `latest`.
- [ ] Verify all registry versions and channels, including creator/runtime `latest`,
  which historically pointed at the first beta.
- [ ] Create clean projects through actual npm and pnpm registry commands.
- [ ] Verify optional plugin activation, snapshot isolation, build/start and deployment.
- [ ] Update stable website instructions and release date only after availability.
- [ ] Create the real 1.0.0 documentation snapshot and announce the release.

A release candidate is optional, not a substitute for these gates. If chosen,
prepare matching prerelease manifests/template and validate them before uploading;
do not publish 1.0.0 under an evaluation tag and expect to overwrite it later.

No npm publish, dist-tag change, Git release tag or documentation snapshot is
performed by updating this checklist.
