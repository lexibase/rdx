# RDX documentation and development website

`apps/web` is the official RDX website and the local development application.
It uses the current packages through `workspace:*`. Shared improvements belong
in the packages so CLI-generated projects receive them too.

## Content and editions

- Live documentation: `docs/`, exposed as the **Canary** edition.
- Version snapshots: `versioned_docs/version-<version>/`, including 1.0.1.
- `versions.json`: active and archived snapshot labels.
- Metadata and features: `rdx.config.ts`, using the public `RDXConfig` contract.
- Public files: `public/`. Metadata paths refer to existing files here.

The website retains `/docs/canary/<filename>` URLs for unique filenames.
Repeated filenames use full category paths. Relative MDX links and search use
the same adapter as the sidebar. Generated projects use full paths such as
`/docs/init/intro` without the website's Canary prefix.

Create a snapshot when preparing a documentation release, using its version:

```sh
pnpm --filter web docs:version <version>
```

This copies live docs and updates the manifest through the configured plugin.
Do not run it on every commit/build. Archiving moves a label from `active` to
`archived`, keeping its directory; it does not delete content.

## Local development

From the monorepo root:

```sh
pnpm install
pnpm dev
```

The coordinator builds and watches local core/types/runtime/versioning.
The UI is consumed directly from `packages/rdx-ui/src` with Fast Refresh.
No npm publication is necessary. One Ctrl+C stops only this run's processes in
the original terminal, including on Windows, without opening another window.
Set `PORT` to use a port other than 3000.

Advanced shortcuts such as `pnpm --filter web dev` do not start the full
coordinator and all watchers. This native Next.js app uses `.next/`, not a
redundant generated `.rdx/` app. `docs:prepare` validates sources and does not
reconstruct the manifest from directory names.

## Validation

```sh
pnpm check
pnpm test:release --install
```

Website tests inspect deployment traces and run a production HTTP server on a
temporary port. They check all current pages, search, MDX, and retired-version
404s. Synthetic fixtures continue covering snapshots and archived editions.

The optional browser suite uses `RDX_PLAYWRIGHT_MODULE` and
`RDX_BROWSER_EXECUTABLE`:

```sh
pnpm --filter web test:runtime
```

Set `RDX_EXISTING_DEV_URL=http://localhost:3000` to reuse a local development
server already running for this application. The test does not stop that server;
its separate production server is still managed by the test.

It checks TOC, clipboard, hydration, search, stale version preferences, and
blocked browser storage. Framework tests cover multi-edition behavior separately.

To check an already deployed website from PowerShell:

```powershell
$env:RDX_PUBLIC_TEST_URL = 'https://rdx-tool.vercel.app'
pnpm --filter web test:deployment
```

This opt-in check makes real HTTPS requests to every current page, verifies page
metadata, public assets, search scoping, and retired-version 404s. Normal local
checks do not depend on a live Vercel deployment.

## Vercel deployment

The dedicated project is **rdx-tool** in **duh-nunes**, separate from the
disposable `rdx-deploy-test` project.

Project settings:

- Framework: Next.js.
- Root Directory: `apps/web`.
- Include source files outside Root Directory: enabled.
- Node.js: 24.x.
- Install Command: `pnpm install --frozen-lockfile`.
- Build Command: `cd ../.. && pnpm exec turbo run build --filter=web`.
- Output Directory: Next.js default (`.next` relative to `apps/web`).

Build/install settings live in `apps/web/vercel.json`; Root Directory and the
outside-source setting belong to the Vercel project, not JSON configuration keys.
Run the CLI from the **monorepo root** so workspace packages and the lockfile are
uploaded. `.vercelignore` excludes dependencies, builds, environment files,
and release smoke artifacts.

If Vercel blocks a deployment because its commit author has no access, connect
the author's GitHub account in Vercel Login Connections and verify commit email
attribution. An authenticated CLI session alone does not grant a Git author
access. Do not rewrite published history or remove Git metadata to bypass that
check. See Vercel's [collaboration troubleshooting](https://vercel.com/docs/deployments/troubleshoot-project-collaboration).

```sh
pnpm dlx vercel@latest link --project rdx-tool --scope duh-nunes
pnpm dlx vercel@latest deploy --scope duh-nunes
# After validating the preview:
pnpm dlx vercel@latest promote <deployment-url> --scope duh-nunes
```

The first deployment of a new project may automatically target production.
The CLI link is local and ignored by Git. CLI deployment does not itself connect
GitHub for automatic builds from pushes. Never commit tokens or generated
`.env.local` files.

`metadata.metadataBase` uses `NEXT_PUBLIC_SITE_URL` when supplied and otherwise
`https://rdx-tool.vercel.app`. Update it if the domain changes.
The tracing adapter includes exact MDX, category, and plugin runtime files
without including unrelated source. Check deployed documents, search, public
assets, and 404s before considering a deployment complete.
