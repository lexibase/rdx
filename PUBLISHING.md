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

This release enables GitHub and theme-toggle actions in generated projects.
Publish in this order; the runtime requires the updated core and UI, and the
generator template requires the updated runtime and UI.

| Package                | Version        |
| ---------------------- | -------------- |
| `@lexibase/rdx-core`   | `1.0.0-beta.5` |
| `@lexibase/rdx-ui`     | `1.0.0-beta.1` |
| `@lexibase/rdx-next`   | `1.0.0-beta.8` |
| `@lexibase/create-rdx` | `1.0.0-beta.7` |

The core accepts the exact GitHub URL placeholder `#`, and the shared navbar
keeps that placeholder in the same tab. Real HTTP(S) repository links still open
in a new tab. Existing project configuration is not automatically rewritten.

Reuse the already released types `1.0.0-beta.4` and optional versioning
`1.0.0-beta.2`. Do not republish those unchanged versions.

From the repository root, install the workspace dependencies and run the checks:

```powershell
pnpm install
pnpm check
```

Inspect exactly what each package would upload before publishing:

```powershell
pnpm --filter @lexibase/rdx-core exec npm pack --dry-run
pnpm --filter @lexibase/rdx-ui exec npm pack --dry-run
pnpm --filter @lexibase/rdx-next exec npm pack --dry-run
pnpm --filter @lexibase/create-rdx exec npm pack --dry-run
```

Publish in dependency order. The `beta` tag keeps this pre-release separate from `latest`:

```powershell
pnpm --filter @lexibase/rdx-core publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/rdx-ui publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/rdx-next publish --tag beta --access public --no-git-checks
pnpm --filter @lexibase/create-rdx publish --tag beta --access public --no-git-checks
```

npm may ask for a one-time password from the authenticator app. Enter it only in the terminal; never put it in this repository or send it in chat.

## Validate the released generator

In an empty directory outside the repository:

```powershell
pnpm create @lexibase/rdx@beta rdx-beta-test
Set-Location rdx-beta-test
pnpm dev
```

If `pnpm create` still resolves an older cached generator, select the release
explicitly with `pnpm dlx @lexibase/create-rdx@1.0.0-beta.7`.

pnpm 11 may delay installing newly published versions according to its
`minimumReleaseAge` policy. For a release test of your own packages, use an
explicit version and temporarily set the policy for that invocation only:

```powershell
pnpm --config.minimumReleaseAge=0 dlx @lexibase/create-rdx@1.0.0-beta.7 rdx-beta-test --skip-install
Set-Location rdx-beta-test
pnpm --config.minimumReleaseAge=0 install
pnpm --config.minimumReleaseAge=0 dev
```

Keep the usual age policy enabled for regular projects. If a subsequent pnpm
command blocks the newly installed RDX versions, add only the exact RDX versions
being tested to `minimumReleaseAgeExclude` in that test workspace's
`pnpm-workspace.yaml`, preserving any existing entries.

Open `http://localhost:3000/docs/init/intro`. The generated project should have a `docs/` directory, `.gitignore`, `rdx.config.ts`, and a generated `.rdx/` runtime directory.

## Promote to stable

Only promote after validating the beta in a clean directory. Publish the framework packages with stable versions and without `--tag beta`; npm then assigns the `latest` tag. The optional plugin has its own release cycle. The `workspace:*` dependencies between RDX packages are converted to their matching published versions by pnpm during publication.
