# Publishing the RDX beta

This repository publishes the framework and an optional versioning plugin:

| Package                | Owner    | Purpose                                                  |
| ---------------------- | -------- | -------------------------------------------------------- |
| `@lexibase/rdx-types`  | Lexibase | Shared TypeScript types                                  |
| `@lexibase/rdx-core`   | Lexibase | Documentation indexing and content utilities             |
| `@lexibase/rdx-ui`     | Lexibase | Shared development and generated-site theme              |
| `@lexibase/rdx-next`   | Lexibase | Next.js runtime and `rdx` command                        |
| `@lexibase/create-rdx` | Lexibase | The project generator used by `npm create @lexibase/rdx` |

`@lexibase/rdx-versioning` is the new optional plugin. The old
`@rdx/rdx-versioning` helper and compatibility packages remain private for the
development website; do not publish them. Configuration and plugin usage are
documented in [CONFIGURATION.md](./CONFIGURATION.md).

## One-time npm setup

1. Enable two-factor authentication for publishing in the npm account that owns `duhnunes` and in the Lexibase organization.
2. Make sure `duhnunes` is an owner of the Lexibase npm organization.
3. Confirm the session with `npm whoami`.
4. Check the scoped generator with `npm view @lexibase/create-rdx`.

The unscoped `create-rdx` name belongs to another project. RDX uses `@lexibase/create-rdx`, owned by the Lexibase organization. The corresponding creation command is `npm create @lexibase/rdx@beta` or `pnpm create @lexibase/rdx@beta`.

## Publish a beta

This release consolidates dependency maintenance, Markdown components, syntax
highlighting, version-aware document links, the floating TOC and optional local
search. Publish all six packages in dependency order; the optional plugin also
needs a new version so it consumes this release's core/types instead of the old
core `1.0.0-beta.4`.

| Package                    | Version         |
| -------------------------- | --------------- |
| `@lexibase/rdx-types`      | `1.0.0-beta.5`  |
| `@lexibase/rdx-core`       | `1.0.0-beta.7`  |
| `@lexibase/rdx-ui`         | `1.0.0-beta.2`  |
| `@lexibase/rdx-next`       | `1.0.0-beta.10` |
| `@lexibase/rdx-versioning` | `1.0.0-beta.3`  |
| `@lexibase/create-rdx`     | `1.0.0-beta.9`  |

The runtime ships the TypeScript parser and Windows-compatible process runner
as production dependencies. Its `bin/` includes the config editor and installer.
No install hook modifies user configuration; activation requires the explicit
`rdx add` command. Existing plugin options and installed versions are preserved.

The generator pins the exact tested UI/runtime releases. Internal `workspace:*`
dependencies are rewritten to exact published versions by `pnpm pack/publish`.
Never try to overwrite a version already published. The private compatibility
packages stay private, and versioning stays optional in generated projects.

From the repository root, install the workspace dependencies and run the checks:

```powershell
pnpm install
pnpm check
pnpm test:release
```

`test:release` creates real `.tgz` archives under the ignored
`.rdx-package-smoke/`, validates their required files and checks that all public
RDX dependencies point to this release. It does not publish. For the full
pre-publication smoke test, use `pnpm test:release --install`: it installs the
archives into an isolated generated project, builds it with search/TOC enabled,
activates the optional versioning package, creates a snapshot and builds again.
It also starts the installed production CLI on temporary local ports and checks
pages, public assets, CSS/JS bundles, redirects, 404s and version-isolated search.
A third build disables search and checks that previously generated indexes
are no longer served. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Node-server
deployment baseline and its limits.
The fixture and archives are retained for inspection; no user project is changed.

Commit and merge the release preparation before uploading to npm. Package
publishing and GitHub merging are separate operations. Recheck `npm whoami` and
the current registry versions before publishing if significant time has passed.

Inspect exactly what each package would upload before publishing:

```powershell
pnpm --filter @lexibase/rdx-types exec npm pack --dry-run
pnpm --filter @lexibase/rdx-core exec npm pack --dry-run
pnpm --filter @lexibase/rdx-ui exec npm pack --dry-run
pnpm --filter @lexibase/rdx-next exec npm pack --dry-run
pnpm --filter @lexibase/rdx-versioning exec npm pack --dry-run
pnpm --filter @lexibase/create-rdx exec npm pack --dry-run
```

Publish in dependency order. The `beta` tag keeps this pre-release separate from `latest`:

```powershell
pnpm --filter @lexibase/rdx-types publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/rdx-core publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/rdx-ui publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/rdx-next publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/rdx-versioning publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/create-rdx publish --tag beta --access public --no-git-checks
```

npm may ask for a one-time password from the authenticator app. Enter it only in the terminal; never put it in this repository or send it in chat.

Run the publish commands one at a time and stop on the first error. A successful
`+ @lexibase/package@version` means the upload was accepted; do not repeat it
because registry propagation takes a little time. Confirm with
`npm view @lexibase/create-rdx@beta version` after the last publication.

## Validate the released generator

In an empty directory outside the repository, a complete npm-only validation is:

```powershell
npm create @lexibase/rdx@1.0.0-beta.9
# Answer the project name prompt, for example docs-release-test.
Set-Location docs-release-test
npm run dev
```

First validate without plugins: open `/docs/init/intro`, check the navbar and
Markdown examples, then set `TOC: true` and `search: true` in `rdx.config.ts`.
Restart development after changing configuration. Verify the TOC, Ctrl+K/Command+K,
and search results from live documentation. `public/` must serve images/downloads.
No `versions.json` or `versioned_docs/` should exist yet.

Stop development and validate production without versioning, then activate it:

```powershell
npm run build
npm run start
# Stop with Ctrl+C before the next commands.
npm exec -- rdx add versioning --package-manager npm
npm exec -- rdx version 1.0.0
```

Edit a page in `docs/`, then build and start again. The live page must show the
edit; `/docs/1.0.0/init/intro` must retain the snapshot. Search results must stay
inside the version being viewed. Use one package manager per test project.

For pnpm, the regular creation command remains:

```powershell
pnpm create @lexibase/rdx@beta rdx-beta-test
Set-Location rdx-beta-test
pnpm dev
```

If `pnpm create` still resolves an older cached generator, select the release
explicitly with `pnpm dlx @lexibase/create-rdx@1.0.0-beta.9`.

pnpm 11 may delay installing newly published versions according to its
`minimumReleaseAge` policy. Keep that protection enabled. After reviewing a
trusted release, approve only the exact RDX versions being tested through
`minimumReleaseAgeExclude` in the test workspace's `pnpm-workspace.yaml`,
preserving any existing entries. Do not remove lockfiles or disable the policy
globally to get past an error; unrelated dependencies still need review. The
npm-only flow above is also supported, in a separate fresh test project.

Open `http://localhost:3000/docs/init/intro`. The generated project should have a `docs/` directory, `.gitignore`, `rdx.config.ts`, and a generated `.rdx/` runtime directory.

Stop development before validating assisted activation:

```powershell
pnpm rdx add versioning
pnpm rdx add versioning
pnpm rdx version 1.0.0
pnpm build
pnpm start
```

The first activation must add the import and plugin and initialize `versions.json`,
without leaving backup or temporary config files. The repeat must not add another
plugin or installation. The snapshot must load at `/docs/1.0.0/init/intro` in production.
Review `rdx.config.ts`, `package.json` and the lockfile before committing the
generated project. If the child package manager
still rejects a fresh version, approve only the exact trusted RDX versions in
`minimumReleaseAgeExclude`; the CLI intentionally does not change this policy.

## Promote to stable

Stable-release preparation is tracked in [RELEASE_READINESS.md](./RELEASE_READINESS.md).
Do not promote these beta packages to `latest` while its launch blockers remain open.
The generator, runtime, UI, shared types/core and optional plugin must be aligned;
in particular, assisted plugin installation must not request `@beta` from a stable runtime.

For stable/RC publication, publish the optional versioning plugin in its matching
channel before exposing the corresponding runtime and generator. A safe order is
types → core → UI → versioning → Next runtime → generator. The installer selects
`latest`, `beta` or `rc` from its installed runtime version; missing tags do not
fall back. Do not point `latest` at a prerelease while preparing this launch.

Only promote after validating the beta in a clean directory. Publish the framework packages with stable versions and without `--tag beta`; npm then assigns the `latest` tag. The optional plugin has its own release cycle. The `workspace:*` dependencies between RDX packages are converted to their matching published versions by pnpm during publication.
